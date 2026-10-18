import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateQuestionInput, UpdateQuestionInput, createQuestionSchema, updateQuestionSchema,
  createQuestionBankSchema, PaginationQuery, QuestionType, ExamStatus, UserRole,
} from '@secure-cbt/shared';
import { parsePagination, buildMeta } from '../../common/helpers/pagination.helper';
import { getTeacherScope, assertTeacherSubjectAccess } from '../../common/helpers/teacher-access.helper';
import { Prisma } from '@prisma/client';

@Injectable()
export class QuestionBankService {
  constructor(private readonly prisma: PrismaService) {}

  // Question Banks
  async getBanks(userId?: string, userRole?: string, subjectId?: string) {
    const where: any = { deleted_at: null };
    if (userRole === UserRole.TEACHER && userId) {
      const scope = await getTeacherScope(this.prisma, userId);
      if (scope.subjectIds.length === 0) return [];
      if (subjectId) {
        if (!scope.subjectIds.includes(subjectId)) return [];
        where.subject_id = subjectId;
      } else {
        where.subject_id = { in: scope.subjectIds };
      }
    } else {
      if (subjectId) where.subject_id = subjectId;
    }

    return this.prisma.questionBank.findMany({
      where,
      include: {
        subject: true,
        _count: { select: { questions: true } },
      },
      orderBy: { created_at: 'desc' },
    });
  }

  async createBank(dto: { title: string; subject_id: string }, userId: string, userRole?: string) {
    const data = createQuestionBankSchema.parse(dto);
    let teacherId: string | undefined;

    if (userRole === UserRole.TEACHER) {
      const scope = await getTeacherScope(this.prisma, userId);
      assertTeacherSubjectAccess(scope, data.subject_id, 'Anda tidak berhak membuat bank soal untuk mata pelajaran ini');
      teacherId = scope.teacherId || undefined;
    } else {
      const teacher = await this.prisma.teacher.findUnique({ where: { user_id: userId } });
      if (teacher) teacherId = teacher.id;
    }

    return this.prisma.questionBank.create({
      data: { ...data, ...(teacherId ? { teacher_id: teacherId } : {}) },
      include: { subject: true },
    });
  }

  async deleteBank(id: string, userId?: string, userRole?: string) {
    const bank = await this.prisma.questionBank.findUniqueOrThrow({ where: { id } });
    if (userRole === UserRole.TEACHER && userId) {
      const scope = await getTeacherScope(this.prisma, userId);
      assertTeacherSubjectAccess(scope, bank.subject_id, 'Anda tidak memiliki hak akses untuk menghapus bank soal ini');
    }

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
  async findAll(
    query: PaginationQuery & { bank_id?: string; type?: QuestionType; subject_id?: string },
    userId?: string,
    userRole?: string,
  ) {
    const { skip, page, perPage } = parsePagination(query);
    const { bank_id, type, subject_id, search } = query;
    const where: any = { deleted_at: null };

    if (userRole === UserRole.TEACHER && userId) {
      const scope = await getTeacherScope(this.prisma, userId);
      if (scope.subjectIds.length === 0) {
        return { data: [], meta: buildMeta(0, { page, perPage, skip }) };
      }
      if (subject_id) {
        if (!scope.subjectIds.includes(subject_id)) {
          return { data: [], meta: buildMeta(0, { page, perPage, skip }) };
        }
        where.question_bank = { subject_id, deleted_at: null };
      } else {
        where.question_bank = { subject_id: { in: scope.subjectIds }, deleted_at: null };
      }
    } else {
      if (subject_id) where.question_bank = { subject_id, deleted_at: null };
    }

    if (bank_id) where.question_bank_id = bank_id;
    if (type) where.type = type;
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

  async findById(id: string, userId?: string, userRole?: string) {
    const question = await this.prisma.question.findFirst({
      where: { id, deleted_at: null },
      include: { options: true, tags: true, question_bank: { include: { subject: true } } },
    });
    if (!question) throw new NotFoundException('Question not found');
    if (userRole === UserRole.TEACHER && userId) {
      const scope = await getTeacherScope(this.prisma, userId);
      assertTeacherSubjectAccess(
        scope,
        question.question_bank.subject_id,
        'Anda tidak memiliki hak akses untuk melihat soal ini',
      );
    }
    return question;
  }

  async create(dto: CreateQuestionInput, userId?: string, userRole?: string) {
    const data = createQuestionSchema.parse(dto);
    const bank = await this.prisma.questionBank.findUnique({ where: { id: data.question_bank_id } });
    if (!bank) throw new NotFoundException('Question bank not found');

    if (userRole === UserRole.TEACHER && userId) {
      const scope = await getTeacherScope(this.prisma, userId);
      assertTeacherSubjectAccess(
        scope,
        bank.subject_id,
        'Anda tidak memiliki hak akses menambah soal pada bank ini',
      );
    }

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

  async update(id: string, dto: UpdateQuestionInput, userId?: string, userRole?: string) {
    const data = updateQuestionSchema.parse(dto);
    await this.findById(id, userId, userRole);

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

  async remove(id: string, userId?: string, userRole?: string) {
    await this.findById(id, userId, userRole);
    await this.assertQuestionsNotLinkedToActiveOrDraftExams(this.prisma, [id]);
    await this.prisma.question.update({ where: { id }, data: { deleted_at: new Date() } });
    return { deleted: true };
  }

  async duplicate(id: string, userId?: string, userRole?: string) {
    const original = await this.findById(id, userId, userRole);
    const { id: _id, created_at, updated_at, deleted_at, options, tags, question_bank, ...rest } = original;
    const newQuestion = await this.prisma.question.create({
      data: { ...rest, content: `${rest.content} (copy)` },
    });
    await this.prisma.questionOption.createMany({
      data: original.options.map((opt: any) => ({
        question_id: newQuestion.id,
        content: opt.content,
        is_correct: opt.is_correct,
        order: opt.order,
      })),
    });
    if (original.tags.length) {
      await this.prisma.questionTag.createMany({
        data: original.tags.map((t: any) => ({ question_id: newQuestion.id, tag: t.tag })),
      });
    }
    return this.findById(newQuestion.id, userId, userRole);
  }

  async bulkDelete(ids: string[], userId?: string, userRole?: string) {
    if (!ids || !ids.length) return { count: 0 };
    if (userRole === UserRole.TEACHER && userId) {
      const scope = await getTeacherScope(this.prisma, userId);
      const questions = await this.prisma.question.findMany({
        where: { id: { in: ids }, deleted_at: null },
        include: { question_bank: { select: { subject_id: true } } },
      });
      for (const q of questions) {
        assertTeacherSubjectAccess(
          scope,
          q.question_bank.subject_id,
          'Anda tidak memiliki akses ke salah satu butir soal yang dipilih',
        );
      }
    }
    await this.assertQuestionsNotLinkedToActiveOrDraftExams(this.prisma, ids);
    const result = await this.prisma.question.updateMany({
      where: { id: { in: ids }, deleted_at: null },
      data: { deleted_at: new Date() },
    });
    return { count: result.count };
  }

  async bulkMove(ids: string[], targetBankId: string, userId?: string, userRole?: string) {
    if (!ids || !ids.length) return { count: 0 };
    const targetBank = await this.prisma.questionBank.findFirst({
      where: { id: targetBankId, deleted_at: null },
    });
    if (!targetBank) throw new NotFoundException('Target question bank not found');

    if (userRole === UserRole.TEACHER && userId) {
      const scope = await getTeacherScope(this.prisma, userId);
      assertTeacherSubjectAccess(
        scope,
        targetBank.subject_id,
        'Anda tidak berhak memindahkan soal ke bank mata pelajaran ini',
      );
      const questions = await this.prisma.question.findMany({
        where: { id: { in: ids }, deleted_at: null },
        include: { question_bank: { select: { subject_id: true } } },
      });
      for (const q of questions) {
        assertTeacherSubjectAccess(
          scope,
          q.question_bank.subject_id,
          'Anda tidak memiliki akses ke salah satu butir soal asal',
        );
      }
    }

    const result = await this.prisma.question.updateMany({
      where: { id: { in: ids }, deleted_at: null },
      data: { question_bank_id: targetBankId },
    });
    return { count: result.count };
  }

  async bulkDeleteBanks(ids: string[], userId?: string, userRole?: string) {
    if (!ids || !ids.length) return { count: 0, questions_count: 0 };

    if (userRole === UserRole.TEACHER && userId) {
      const scope = await getTeacherScope(this.prisma, userId);
      const banks = await this.prisma.questionBank.findMany({
        where: { id: { in: ids }, deleted_at: null },
        select: { id: true, subject_id: true },
      });
      for (const b of banks) {
        assertTeacherSubjectAccess(
          scope,
          b.subject_id,
          'Anda tidak memiliki hak akses untuk menghapus salah satu bank soal yang dipilih',
        );
      }
    }

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
