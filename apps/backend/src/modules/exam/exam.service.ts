import { Injectable, NotFoundException, BadRequestException, Inject } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateExamDto, UpdateExamDto, createExamSchema, updateExamSchema,
  PaginationQuery, ExamStatus, EventNames,
} from '@secure-cbt/shared';
import { randomBytes } from 'crypto';

@Injectable()
export class ExamService {
  constructor(
    @Inject(PrismaService)
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async findAll(query: PaginationQuery & { status?: ExamStatus; subject_id?: string }) {
    const page = Number(query.page) || 1;
    const per_page = Number(query.per_page) || 20;
    const { status, subject_id, search } = query;
    const where: any = { deleted_at: null };
    if (status) where.status = status;
    if (subject_id) where.subject_id = subject_id;
    if (search) where.title = { contains: search, mode: 'insensitive' };

    const [data, total] = await Promise.all([
      this.prisma.exam.findMany({
        where,
        skip: (page - 1) * per_page,
        take: per_page,
        include: { subject: true, _count: { select: { exam_questions: true, exam_sessions: true } } },
        orderBy: { created_at: 'desc' },
      }),
      this.prisma.exam.count({ where }),
    ]);
    return { data, meta: { page, per_page, total, total_pages: Math.ceil(total / per_page) } };
  }

  async findById(id: string) {
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
    return exam;
  }

  async create(dto: CreateExamDto, userId: string) {
    const data = createExamSchema.parse(dto);

    if (new Date(data.end_at) <= new Date(data.start_at)) {
      throw new BadRequestException('End time must be after start time');
    }

    // Resolve teacher ID from user ID
    const teacher = await this.prisma.teacher.findUnique({ where: { user_id: userId } });
    if (!teacher) throw new BadRequestException('Teacher profile not found for this user');

    return this.prisma.$transaction(async (tx) => {
      const exam = await tx.exam.create({
        data: {
          title: data.title,
          description: data.description,
          subject_id: data.subject_id,
          duration_minutes: data.duration_minutes,
          start_at: new Date(data.start_at),
          end_at: new Date(data.end_at),
          teacher_id: teacher.id,
          randomize_questions: data.randomize_questions ?? true,
          randomize_answers: data.randomize_answers ?? true,
          warning_limit: data.warning_limit ?? 3,
          auto_submit_enabled: data.auto_submit_enabled ?? true,
          fullscreen_required: data.fullscreen_required ?? true,
          package_count: data.package_count ?? 1,
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
      const shuffled = [...data.question_ids].sort(() => Math.random() - 0.5);
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
        this.eventEmitter.emit(EventNames.EXAM_CREATED, { examId: exam.id, teacherId: teacher.id });
      }
      return tx.exam.findUnique({
        where: { id: exam.id },
        include: { exam_packages: true, exam_classes: { include: { class: true } } },
      });
    });
  }

  async update(id: string, dto: UpdateExamDto) {
    const data = updateExamSchema.parse(dto);
    await this.findById(id);

    return this.prisma.$transaction(async (tx) => {
      const exam = await tx.exam.update({
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
        },
      });

      if (data.class_ids) {
        await tx.examClass.deleteMany({ where: { exam_id: id } });
        await tx.examClass.createMany({
          data: data.class_ids.map((cid) => ({ exam_id: id, class_id: cid })),
        });
      }

      if (data.question_ids) {
        await tx.examQuestion.deleteMany({ where: { exam_id: id } });
        await tx.examPackage.deleteMany({ where: { exam_id: id } });

        const shuffled = [...data.question_ids].sort(() => Math.random() - 0.5);
        const pkgCount = data.question_ids.length > 0 ? Math.ceil(data.question_ids.length / 1) : 1;

        for (let i = 0; i < pkgCount; i++) {
          const pkg = await tx.examPackage.create({
            data: { exam_id: id, name: String.fromCharCode(65 + i) },
          });
          const pkgQuestions = shuffled.slice(i * Math.ceil(shuffled.length / pkgCount), (i + 1) * Math.ceil(shuffled.length / pkgCount));
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

  async remove(id: string) {
    await this.findById(id);
    await this.prisma.exam.update({ where: { id }, data: { deleted_at: new Date() } });
    return { deleted: true };
  }

  async publish(id: string) {
    const exam = await this.findById(id);
    if (exam.status !== ExamStatus.DRAFT) throw new BadRequestException('Only draft exams can be published');
    const updated = await this.prisma.exam.update({ where: { id }, data: { status: ExamStatus.PUBLISHED } });
    if (this.eventEmitter) {
      this.eventEmitter.emit(EventNames.EXAM_PUBLISHED, { examId: id });
    }
    return updated;
  }

  async generateToken(id: string) {
    const exam = await this.findById(id);
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
    return this.prisma.exam.findMany({
      where: {
        deleted_at: null,
        status: { in: [ExamStatus.PUBLISHED, ExamStatus.ONGOING] },
        start_at: { lte: now },
        end_at: { gte: now },
        exam_classes: { some: { class_id: student.class_id } },
      },
      include: { subject: true },
      orderBy: { start_at: 'asc' },
    });
  }
}
