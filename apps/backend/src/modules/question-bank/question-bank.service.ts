import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateQuestionInput, UpdateQuestionInput, createQuestionSchema, updateQuestionSchema,
  createQuestionBankSchema, PaginationQuery, QuestionType, ExamStatus,
} from '@secure-cbt/shared';
import { parsePagination, buildMeta } from '../../common/helpers/pagination.helper';
import { Prisma } from '@prisma/client';

@Injectable()
export class QuestionBankService {
  constructor(private readonly prisma: PrismaService) {}

  // Question Banks
  async getBanks(userId?: string, subjectId?: string) {
    const where: any = { deleted_at: null };
    if (userId) {
      const teacher = await this.prisma.teacher.findUnique({ where: { user_id: userId } });
      if (teacher) {
        where.teacher_id = teacher.id;
      }
    }
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

  async createBank(dto: { title: string; subject_id: string }, userId: string) {
    const data = createQuestionBankSchema.parse(dto);
    const teacher = await this.prisma.teacher.findUnique({ where: { user_id: userId } });
    return this.prisma.questionBank.create({
      data: { ...data, ...(teacher ? { teacher_id: teacher.id } : {}) },
      include: { subject: true },
    });
  }

  async deleteBank(id: string) {
    await this.prisma.questionBank.findUniqueOrThrow({ where: { id } });

    const questions = await this.prisma.question.findMany({
      where: { question_bank_id: id, deleted_at: null },
      select: { id: true },
    });
    const questionIds = questions.map((q) => q.id);

    await this.assertQuestionsNotLinkedToActiveOrDraftExams(this.prisma, questionIds);

    return this.prisma.$transaction(async (tx) => {
      const now = new Date();
      await tx.question.updateMany({
        where: { question_bank_id: id, deleted_at: null },
        data: { deleted_at: now },
      });
      return tx.questionBank.update({
        where: { id },
        data: { deleted_at: now },
      });
    });
  }

  async assertQuestionsNotLinkedToActiveOrDraftExams(
    tx: Prisma.TransactionClient | PrismaService,
    questionIds: string[],
  ): Promise<void> {
    if (!questionIds || questionIds.length === 0) return;

    const now = new Date();
    const activeExamQuestions = await tx.examQuestion.findMany({
      where: {
        question_id: { in: questionIds },
        exam: {
          deleted_at: null,
          OR: [
            { status: { in: [ExamStatus.DRAFT, ExamStatus.PUBLISHED, ExamStatus.ONGOING] } },
            { end_at: { gt: now }, status: { notIn: [ExamStatus.FINISHED, ExamStatus.CANCELLED] } },
          ],
        },
      },
      include: {
        exam: {
          select: { id: true, title: true, status: true },
        },
      },
    });

    if (activeExamQuestions.length > 0) {
      const examTitles = Array.from(new Set(activeExamQuestions.map((eq: any) => eq.exam.title))).join(', ');
      throw new BadRequestException(
        `Tidak dapat menghapus soal karena masih terhubung dengan ujian aktif/draft: "${examTitles}". Harap lepaskan soal dari ujian terlebih dahulu.`,
      );
    }
  }

  // Questions
  async findAll(query: PaginationQuery & { bank_id?: string; type?: QuestionType; subject_id?: string }) {
    const { skip, page, perPage } = parsePagination(query);
    const { bank_id, type, subject_id, search } = query;
    const where: any = { deleted_at: null };
    if (bank_id) where.question_bank_id = bank_id;
    if (type) where.type = type;
    if (subject_id) where.question_bank = { subject_id };
    if (search) where.content = { contains: search, mode: 'insensitive' };

    const [data, total] = await Promise.all([
      this.prisma.question.findMany({
        where,
        skip,
        take: perPage,
        include: { options: true, tags: true, question_bank: { include: { subject: true } } },
        orderBy: { created_at: 'desc' },
      }),
      this.prisma.question.count({ where }),
    ]);
    return { data, meta: buildMeta(total, { page, perPage, skip }) };
  }

  async findById(id: string) {
    const question = await this.prisma.question.findFirst({
      where: { id, deleted_at: null },
      include: { options: true, tags: true, question_bank: { include: { subject: true } } },
    });
    if (!question) throw new NotFoundException('Question not found');
    return question;
  }

  async create(dto: CreateQuestionInput) {
    const data = createQuestionSchema.parse(dto);
    const bank = await this.prisma.questionBank.findUnique({ where: { id: data.question_bank_id } });
    if (!bank) throw new NotFoundException('Question bank not found');

    return this.prisma.$transaction(async (tx) => {
      const question = await tx.question.create({
        data: {
          question_bank_id: data.question_bank_id,
          type: data.type,
          content: data.content,
          image_url: data.image_url,
          audio_url: data.audio_url,
          audio_play_limit: data.audio_play_limit,
          difficulty: data.difficulty,
          explanation: data.explanation,
        },
      });

      if (data.options && data.options.length > 0) {
        await tx.questionOption.createMany({
          data: data.options.map((opt: { content: string; is_correct: boolean; image_url?: string | null }, idx: number) => ({
            question_id: question.id,
            content: opt.content,
            image_url: opt.image_url,
            is_correct: opt.is_correct,
            order: idx + 1,
          })),
        });
      }

      if (data.tags?.length) {
        await tx.questionTag.createMany({
          data: data.tags.map((tag: string) => ({ question_id: question.id, tag })),
        });
      }

      return tx.question.findUnique({
        where: { id: question.id },
        include: { options: true, tags: true, question_bank: { include: { subject: true } } },
      });
    });
  }

  async update(id: string, dto: UpdateQuestionInput) {
    const data = updateQuestionSchema.parse(dto);
    await this.findById(id);

    return this.prisma.$transaction(async (tx) => {
      await tx.question.update({
        where: { id },
        data: {
          type: data.type,
          content: data.content,
          image_url: data.image_url,
          audio_url: data.audio_url,
          audio_play_limit: data.audio_play_limit,
          difficulty: data.difficulty,
          explanation: data.explanation,
        },
      });

      if (data.options) {
        await tx.questionOption.deleteMany({ where: { question_id: id } });
        if (data.options.length > 0) {
          await tx.questionOption.createMany({
            data: data.options.map((opt, idx) => ({
              question_id: id,
              content: opt.content,
              image_url: opt.image_url,
              is_correct: opt.is_correct,
              order: idx + 1,
            })),
          });
        }
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
    await this.assertQuestionsNotLinkedToActiveOrDraftExams(this.prisma, [id]);
    await this.prisma.question.update({ where: { id }, data: { deleted_at: new Date() } });
    return { deleted: true };
  }

  async duplicate(id: string) {
    const original = await this.findById(id);
    const { id: _id, created_at, updated_at, deleted_at, options, tags, question_bank, ...rest } = original;
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

  async bulkDelete(ids: string[]) {
    if (!ids || !ids.length) return { count: 0 };
    await this.assertQuestionsNotLinkedToActiveOrDraftExams(this.prisma, ids);
    const result = await this.prisma.question.updateMany({
      where: { id: { in: ids }, deleted_at: null },
      data: { deleted_at: new Date() },
    });
    return { count: result.count };
  }

  async bulkMove(ids: string[], targetBankId: string) {
    if (!ids || !ids.length) return { count: 0 };
    const targetBank = await this.prisma.questionBank.findFirst({
      where: { id: targetBankId, deleted_at: null },
    });
    if (!targetBank) throw new NotFoundException('Target question bank not found');

    const result = await this.prisma.question.updateMany({
      where: { id: { in: ids }, deleted_at: null },
      data: { question_bank_id: targetBankId },
    });
    return { count: result.count };
  }

  async bulkDeleteBanks(ids: string[]) {
    if (!ids || !ids.length) return { count: 0, questions_count: 0 };

    const questions = await this.prisma.question.findMany({
      where: { question_bank_id: { in: ids }, deleted_at: null },
      select: { id: true },
    });
    const questionIds = questions.map((q) => q.id);

    await this.assertQuestionsNotLinkedToActiveOrDraftExams(this.prisma, questionIds);

    return this.prisma.$transaction(async (tx) => {
      const now = new Date();
      const qResult = await tx.question.updateMany({
        where: { question_bank_id: { in: ids }, deleted_at: null },
        data: { deleted_at: now },
      });
      const bResult = await tx.questionBank.updateMany({
        where: { id: { in: ids }, deleted_at: null },
        data: { deleted_at: now },
      });
      return {
        count: bResult.count,
        questions_count: qResult.count,
      };
    });
  }
}
