import { Injectable, NotFoundException, BadRequestException, ForbiddenException, Inject } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateExamInput, UpdateExamInput, createExamSchema, updateExamSchema,
  PaginationQuery, ExamStatus, SessionStatus, SocketEvent, shuffle, UserRole,
} from '@secure-cbt/shared';
import { randomBytes } from 'crypto';
import { parsePagination, buildMeta } from '../../common/helpers/pagination.helper';
import { resolveTeacherId } from '../../common/helpers/user-resolver.helper';
import { getTeacherScope, assertTeacherSubjectAccess, assertTeacherMonitorAccess } from '../../common/helpers/teacher-access.helper';

@Injectable()
export class ExamService {
  constructor(
    @Inject(PrismaService)
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async findAll(
    query: PaginationQuery & { status?: ExamStatus; subject_id?: string; context?: 'monitoring' | 'reports' | 'management' },
    userId?: string,
    userRole?: string,
    contextOverride?: 'monitoring' | 'reports' | 'management',
  ) {
    const { skip, page, perPage } = parsePagination(query);
    const { status, subject_id, search } = query;
    const context = contextOverride || query.context || 'management';
    const where: any = { deleted_at: null };

    if (userRole === UserRole.TEACHER && userId) {
      const scope = await getTeacherScope(this.prisma, userId);
      const isProctorView = (context === 'monitoring' || context === 'reports') && scope.canMonitorAllSubjects;

      if (!isProctorView) {
        if (scope.subjectIds.length === 0) {
          return { data: [], meta: buildMeta(0, { page, perPage, skip }) };
        }
        if (subject_id) {
          if (!scope.subjectIds.includes(subject_id)) {
            return { data: [], meta: buildMeta(0, { page, perPage, skip }) };
          }
          where.subject_id = subject_id;
        } else {
          where.subject_id = { in: scope.subjectIds };
        }
      } else {
        if (subject_id) where.subject_id = subject_id;
      }
    } else {
      if (subject_id) where.subject_id = subject_id;
    }

    if (status) where.status = status;
    if (search) where.title = { contains: search, mode: 'insensitive' };

    const [data, total] = await Promise.all([
      this.prisma.exam.findMany({
        where,
        skip,
        take: perPage,
        include: { subject: true, exam_token: true, _count: { select: { exam_questions: true, exam_sessions: true } } },
        orderBy: { created_at: 'desc' },
      }),
      this.prisma.exam.count({ where }),
    ]);
    const now = new Date();
    const computed = data.map((exam) => ({
      ...exam,
      status: now > exam.end_at ? ExamStatus.FINISHED : now >= exam.start_at ? ExamStatus.ONGOING : ExamStatus.PUBLISHED,
    }));
    return { data: computed, meta: buildMeta(total, { page, perPage, skip }) };
  }

  async findById(
    id: string,
    userId?: string,
    userRole?: string,
    context?: 'monitoring' | 'reports' | 'management',
  ) {
    const exam = await this.prisma.exam.findFirst({
      where: { id, deleted_at: null },
      include: {
        subject: true,
        exam_questions: { include: { question: { include: { options: true } }, package: true } },
        exam_classes: { include: { class: true } },
        exam_packages: true,
        exam_token: true,
      },
    });
    if (!exam) throw new NotFoundException('Exam not found');

    if (userRole === UserRole.TEACHER && userId) {
      const scope = await getTeacherScope(this.prisma, userId);
      if (context === 'monitoring' || context === 'reports') {
        assertTeacherMonitorAccess(
          scope,
          exam.subject_id,
          'Anda tidak memiliki izin memantau atau melihat laporan ujian ini',
        );
      } else {
        assertTeacherSubjectAccess(
          scope,
          exam.subject_id,
          'Anda tidak memiliki hak akses untuk ujian mata pelajaran ini',
        );
      }
    }

    return exam;
  }

  async create(dto: CreateExamInput, userId: string, userRole?: string) {
    const data = createExamSchema.parse(dto);

    if (new Date(data.end_at) <= new Date(data.start_at)) {
      throw new BadRequestException('End time must be after start time');
    }

    let teacherId: string | null = null;
    if (userRole === UserRole.TEACHER) {
      const scope = await getTeacherScope(this.prisma, userId);
      assertTeacherSubjectAccess(
        scope,
        data.subject_id,
        'Anda tidak memiliki hak akses untuk membuat ujian pada mata pelajaran ini',
      );
      teacherId = scope.teacherId || null;
    } else {
      teacherId = await resolveTeacherId(this.prisma, userId);
    }

    return this.prisma.$transaction(async (tx) => {
      const exam = await tx.exam.create({
        data: {
          title: data.title,
          description: data.description,
          subject_id: data.subject_id,
          duration_minutes: data.duration_minutes,
          start_at: new Date(data.start_at),
          end_at: new Date(data.end_at),
          ...(teacherId ? { teacher_id: teacherId } : {}),
          randomize_questions: data.randomize_questions ?? true,
          randomize_answers: data.randomize_answers ?? true,
          warning_limit: data.warning_limit ?? 3,
          auto_submit_enabled: data.auto_submit_enabled ?? true,
          fullscreen_required: data.fullscreen_required ?? true,
          package_count: data.package_count ?? 1,
          is_random_pool: data.is_random_pool ?? false,
          pool_question_count: data.pool_question_count ?? null,
          pool_mode: data.pool_mode ?? 'BALANCED',
          points_easy: data.points_easy ?? 1,
          points_medium: data.points_medium ?? 2,
          points_hard: data.points_hard ?? 3,
          show_results: data.show_results ?? true,
          violation_vibration_enabled: data.violation_vibration_enabled ?? true,
          violation_alarm_enabled: data.violation_alarm_enabled ?? true,
          violation_alarm_duration_seconds: data.violation_alarm_duration_seconds ?? 3,
          violation_alarm_sound: data.violation_alarm_sound ?? 'sharp_beep',
          status: ExamStatus.PUBLISHED,
        },
      }).catch(err => {
        console.error('Error creating exam in transaction:', err);
        throw err;
      });

      // Assign classes
      if (data.class_ids.length) {
        await tx.examClass.createMany({
          data: data.class_ids.map((cid: string) => ({ exam_id: exam.id, class_id: cid })),
        });
      }

      // Create packages and assign questions
      const pkgCount = data.package_count ?? 1;
      const shuffled = shuffle(data.question_ids);
      const perPkg = Math.ceil(shuffled.length / pkgCount);

      for (let i = 0; i < pkgCount; i++) {
        const pkg = await tx.examPackage.create({
          data: { exam_id: exam.id, name: String.fromCharCode(65 + i) }, // A, B, C, D...
        });
        const pkgQuestions = shuffled.slice(i * perPkg, (i + 1) * perPkg);
        await tx.examQuestion.createMany({
          data: pkgQuestions.map((qid, idx) => ({
            exam_id: exam.id,
            question_id: qid,
            position: idx + 1,
            package_id: pkg.id,
          })),
        });
      }

      if (this.eventEmitter) {
        this.eventEmitter.emit(SocketEvent.EXAM_CREATED, { examId: exam.id, teacherId });
      }
      return tx.exam.findUnique({
        where: { id: exam.id },
        include: { exam_packages: true, exam_classes: { include: { class: true } } },
      });
    });
  }

  async update(id: string, dto: UpdateExamInput, userId?: string, userRole?: string) {
    const data = updateExamSchema.parse(dto);
    const existing = await this.findById(id, userId, userRole, 'management');

    if (userRole === UserRole.TEACHER && userId) {
      const scope = await getTeacherScope(this.prisma, userId);
      assertTeacherSubjectAccess(
        scope,
        existing.subject_id,
        'Anda tidak memiliki hak akses mengedit ujian mata pelajaran ini',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.exam.update({
        where: { id },
        data: {
          title: data.title,
          description: data.description,
          duration_minutes: data.duration_minutes,
          start_at: data.start_at ? new Date(data.start_at) : undefined,
          end_at: data.end_at ? new Date(data.end_at) : undefined,
          randomize_questions: data.randomize_questions,
          randomize_answers: data.randomize_answers,
          warning_limit: data.warning_limit,
          auto_submit_enabled: data.auto_submit_enabled,
          fullscreen_required: data.fullscreen_required,
          package_count: data.package_count,
          is_random_pool: data.is_random_pool,
          pool_question_count: data.pool_question_count,
          pool_mode: data.pool_mode,
          points_easy: data.points_easy,
          points_medium: data.points_medium,
          points_hard: data.points_hard,
          show_results: data.show_results,
          violation_vibration_enabled: data.violation_vibration_enabled,
          violation_alarm_enabled: data.violation_alarm_enabled,
          violation_alarm_duration_seconds: data.violation_alarm_duration_seconds,
          violation_alarm_sound: data.violation_alarm_sound,
        },
      });

      if (data.class_ids) {
        await tx.examClass.deleteMany({ where: { exam_id: id } });
        await tx.examClass.createMany({
          data: data.class_ids.map((cid) => ({ exam_id: id, class_id: cid })),
        });
      }

      // Only recreate packages & questions if question list or package count actually changed.
      // This prevents destroying active exam packages/sessions when only editing classes or exam details.
      const existingQuestionIds = (existing.exam_questions || []).map((eq) => eq.question_id);
      const isQuestionsChanged =
        data.question_ids &&
        (data.question_ids.length !== existingQuestionIds.length ||
          data.question_ids.some((qid) => !existingQuestionIds.includes(qid)) ||
          (data.package_count !== undefined && data.package_count !== existing.package_count));

      if (isQuestionsChanged && data.question_ids) {
        await tx.examQuestion.deleteMany({ where: { exam_id: id } });
        await tx.examPackage.deleteMany({ where: { exam_id: id } });

        const shuffled = shuffle(data.question_ids);
        const pkgCount = data.package_count ?? existing.package_count ?? 1;
        const perPkg = Math.ceil(shuffled.length / pkgCount);

        for (let i = 0; i < pkgCount; i++) {
          const pkg = await tx.examPackage.create({
            data: { exam_id: id, name: String.fromCharCode(65 + i) },
          });
          const pkgQuestions = shuffled.slice(i * perPkg, (i + 1) * perPkg);
          await tx.examQuestion.createMany({
            data: pkgQuestions.map((qid, idx) => ({
              exam_id: id,
              question_id: qid,
              position: idx + 1,
              package_id: pkg.id,
            })),
          });
        }
      }

      return tx.exam.findUnique({ where: { id }, include: { exam_packages: true, exam_classes: { include: { class: true } } } });
    });
  }

  async remove(id: string, userId?: string, userRole?: string) {
    const exam = await this.findById(id, userId, userRole, 'management');
    if (userRole === UserRole.TEACHER && userId) {
      const scope = await getTeacherScope(this.prisma, userId);
      assertTeacherSubjectAccess(
        scope,
        exam.subject_id,
        'Anda tidak memiliki hak akses menghapus ujian mata pelajaran ini',
      );
    }
    await this.prisma.exam.update({ where: { id }, data: { deleted_at: new Date() } });
    return { deleted: true };
  }

  async generateToken(id: string, userId?: string, userRole?: string) {
    const exam = await this.findById(id, userId, userRole, 'monitoring');
    if (userRole === UserRole.TEACHER && userId) {
      const scope = await getTeacherScope(this.prisma, userId);
      assertTeacherMonitorAccess(
        scope,
        exam.subject_id,
        'Anda tidak memiliki izin merilis token untuk ujian ini',
      );
    }
    if (exam.status !== ExamStatus.PUBLISHED && exam.status !== ExamStatus.ONGOING) {
      throw new BadRequestException('Exam must be published first');
    }

    const token = randomBytes(4).toString('hex').toUpperCase().slice(0, 8);

    // Delete existing token if any
    await this.prisma.examToken.deleteMany({ where: { exam_id: id } });

    const examToken = await this.prisma.examToken.create({
      data: {
        exam_id: id,
        token,
        expires_at: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days from now
      },
    });
    return examToken;
  }

  async getExamsForStudent(userId: string) {
    const student = await this.prisma.student.findUnique({ where: { user_id: userId } });
    if (!student) throw new NotFoundException('Student not found');

    const now = new Date();

    // Exams the student has already completed
    const completedIds = (
      await this.prisma.examSession.findMany({
        where: {
          student_id: student.id,
          status: { in: [SessionStatus.SUBMITTED, SessionStatus.AUTO_SUBMITTED, SessionStatus.EXPIRED] },
        },
        select: { exam_id: true },
      })
    ).map((s) => s.exam_id);

    const exams = await this.prisma.exam.findMany({
      where: {
        deleted_at: null,
        status: { in: [ExamStatus.PUBLISHED, ExamStatus.ONGOING] },
        end_at: { gte: now },
        id: { notIn: completedIds },
        exam_classes: { some: { class_id: student.class_id } },
      },
      include: { subject: true, _count: { select: { exam_questions: true } } },
      orderBy: { start_at: 'asc' },
    });

    return exams.map((exam) => ({
      ...exam,
      status: now >= exam.start_at ? ExamStatus.ONGOING : exam.status,
    }));
  }
}
