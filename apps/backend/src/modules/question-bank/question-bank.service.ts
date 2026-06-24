import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateQuestionDto, UpdateQuestionDto, createQuestionSchema, updateQuestionSchema,
  createQuestionBankSchema, PaginationQuery, QuestionType,
} from '@secure-cbt/shared';

@Injectable()
export class QuestionBankService {
  constructor(private readonly prisma: PrismaService) {}

  // Question Banks
  async getBanks(teacherId?: string, subjectId?: string) {
    const where: any = { deleted_at: null };
    if (teacherId) where.teacher_id = teacherId;
    if (subjectId) where.subject_id = subjectId;

    return this.prisma.questionBank.findMany({
      where,
      include: {
        subject: true,
        _count: { select: { questions: true } },
      },
      orderBy: { created_at: 'desc' },
    });
  }

  async createBank(dto: { title: string; subject_id: string }, teacherId: string) {
    const data = createQuestionBankSchema.parse(dto);
    return this.prisma.questionBank.create({
      data: { ...data, teacher_id: teacherId },
      include: { subject: true },
    });
  }

  async deleteBank(id: string) {
    await this.prisma.questionBank.findUniqueOrThrow({ where: { id } });
    return this.prisma.questionBank.update({ where: { id }, data: { deleted_at: new Date() } });
  }

  // Questions
  async findAll(query: PaginationQuery & { bank_id?: string; type?: QuestionType; subject_id?: string }) {
    const { page = 1, per_page = 20, bank_id, type, subject_id, search } = query;
    const where: any = { deleted_at: null };
    if (bank_id) where.question_bank_id = bank_id;
    if (type) where.type = type;
    if (subject_id) where.question_bank = { subject_id };
    if (search) where.content = { contains: search, mode: 'insensitive' };

    const [data, total] = await Promise.all([
      this.prisma.question.findMany({
        where,
        skip: (page - 1) * per_page,
        take: per_page,
        include: { options: true, tags: true, question_bank: { include: { subject: true } } },
        orderBy: { created_at: 'desc' },
      }),
      this.prisma.question.count({ where }),
    ]);
    return { data, meta: { page, per_page, total, total_pages: Math.ceil(total / per_page) } };
  }

  async findById(id: string) {
    const question = await this.prisma.question.findFirst({
      where: { id, deleted_at: null },
      include: { options: true, tags: true, question_bank: { include: { subject: true } } },
    });
    if (!question) throw new NotFoundException('Question not found');
    return question;
  }

  async create(dto: CreateQuestionDto) {
    const data = createQuestionSchema.parse(dto);
    const bank = await this.prisma.questionBank.findUnique({ where: { id: data.question_bank_id } });
    if (!bank) throw new NotFoundException('Question bank not found');

    return this.prisma.$transaction(async (tx) => {
      const question = await tx.question.create({
        data: {
          question_bank_id: data.question_bank_id,
          type: data.type,
          content: data.content,
          difficulty: data.difficulty,
          explanation: data.explanation,
        },
      });

      await tx.questionOption.createMany({
        data: data.options.map((opt, idx) => ({
          question_id: question.id,
          content: opt.content,
          is_correct: opt.is_correct,
          order: idx + 1,
        })),
      });

      if (data.tags?.length) {
        await tx.questionTag.createMany({
          data: data.tags.map((tag) => ({ question_id: question.id, tag })),
        });
      }

      return tx.question.findUnique({
        where: { id: question.id },
        include: { options: true, tags: true, question_bank: { include: { subject: true } } },
      });
    });
  }

  async update(id: string, dto: UpdateQuestionDto) {
    const data = updateQuestionSchema.parse(dto);
    await this.findById(id);

    return this.prisma.$transaction(async (tx) => {
      await tx.question.update({
        where: { id },
        data: {
          type: data.type,
          content: data.content,
          difficulty: data.difficulty,
          explanation: data.explanation,
        },
      });

      if (data.options) {
        await tx.questionOption.deleteMany({ where: { question_id: id } });
        await tx.questionOption.createMany({
          data: data.options.map((opt, idx) => ({
            question_id: id,
            content: opt.content,
            is_correct: opt.is_correct,
            order: idx + 1,
          })),
        });
      }

      if (data.tags) {
        await tx.questionTag.deleteMany({ where: { question_id: id } });
        if (data.tags.length > 0) {
          await tx.questionTag.createMany({
            data: data.tags.map((tag) => ({ question_id: id, tag })),
          });
        }
      }

      return tx.question.findUnique({
        where: { id },
        include: { options: true, tags: true, question_bank: { include: { subject: true } } },
      });
    });
  }

  async remove(id: string) {
    await this.findById(id);
    await this.prisma.question.update({ where: { id }, data: { deleted_at: new Date() } });
    return { deleted: true };
  }

  async duplicate(id: string) {
    const original = await this.findById(id);
    const { id: _id, created_at, updated_at, deleted_at, ...rest } = original;
    const newQuestion = await this.prisma.question.create({
      data: { ...rest, content: `${rest.content} (copy)` },
    });
    await this.prisma.questionOption.createMany({
      data: original.options.map((opt) => ({
        question_id: newQuestion.id,
        content: opt.content,
        is_correct: opt.is_correct,
        order: opt.order,
      })),
    });
    if (original.tags.length) {
      await this.prisma.questionTag.createMany({
        data: original.tags.map((t) => ({ question_id: newQuestion.id, tag: t.tag })),
      });
    }
    return this.findById(newQuestion.id);
  }
}
