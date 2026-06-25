import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../prisma/prisma.service';
import { GradingService } from '../grading/grading.service';
import {
  StartSessionDto, SubmitSessionDto, startSessionSchema, submitSessionSchema,
  SessionStatus, ExamStatus, EventNames,
} from '@secure-cbt/shared';

@Injectable()
export class SessionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
    private readonly gradingService: GradingService,
  ) {}

  async start(dto: StartSessionDto, userId: string) {
    const { token, device_id } = startSessionSchema.parse(dto);

    // Validate token
    const examToken = await this.prisma.examToken.findUnique({
      where: { token },
      include: { exam: true },
    });
    if (!examToken || examToken.expires_at < new Date()) {
      throw new BadRequestException('Invalid or expired token');
    }

    const exam = examToken.exam;
    if (exam.status !== ExamStatus.PUBLISHED && exam.status !== ExamStatus.ONGOING) {
      throw new BadRequestException('Exam is not available');
    }

    const now = new Date();
    if (now < exam.start_at || now > exam.end_at) {
      throw new BadRequestException('Exam is not in schedule');
    }

    // Verify student is assigned to this exam
    const student = await this.prisma.student.findUnique({
      where: { user_id: userId },
      include: { class: true },
    });
    if (!student) throw new NotFoundException('Student not found');

    const examClass = await this.prisma.examClass.findFirst({
      where: { exam_id: exam.id, class_id: student.class_id },
    });
    if (!examClass) throw new ForbiddenException('You are not assigned to this exam');

    // Check for existing active session
    const existing = await this.prisma.examSession.findFirst({
      where: { exam_id: exam.id, student_id: student.id, status: { in: [SessionStatus.ACTIVE, SessionStatus.PAUSED] } },
    });
    if (existing) {
      return this.resume({ session_id: existing.id }, userId);
    }

    // Assign a random package
    const packages = await this.prisma.examPackage.findMany({ where: { exam_id: exam.id } });
    const assignedPackage = packages[Math.floor(Math.random() * packages.length)];

    // Mark exam as ONGOING if first student starts
    if (exam.status === ExamStatus.PUBLISHED) {
      await this.prisma.exam.update({ where: { id: exam.id }, data: { status: ExamStatus.ONGOING } });
    }

    // Calculate remaining time (use the shorter of duration and time-to-end)
    const durationSeconds = exam.duration_minutes * 60;
    const secondsUntilEnd = Math.max(0, Math.floor((exam.end_at.getTime() - Date.now()) / 1000));
    const remainingSeconds = Math.min(durationSeconds, secondsUntilEnd);

    const session = await this.prisma.examSession.create({
      data: {
        exam_id: exam.id,
        student_id: student.id,
        package_id: assignedPackage?.id,
        status: SessionStatus.ACTIVE,
        remaining_time_seconds: remainingSeconds,
        device_id,
      },
      include: {
        exam: { include: { exam_questions: { include: { question: { include: { options: true } } } } } },
      },
    });

    this.eventEmitter.emit(EventNames.SESSION_STARTED, { sessionId: session.id, examId: exam.id, studentId: student.id });

    // Return session with questions (without correct answer flags)
    const questions = session.exam.exam_questions
      .filter((eq) => !eq.package_id || eq.package_id === assignedPackage?.id)
      .sort((a, b) => a.position - b.position)
      .map((eq) => ({
        id: eq.id,
        position: eq.position,
        question: {
          id: eq.question.id,
          type: eq.question.type,
          content: eq.question.content,
          options: eq.question.options.map((o) => ({ id: o.id, content: o.content })),
        },
      }));

    return { ...session, questions };
  }

  async resume(dto: { session_id: string }, userId: string) {
    // Resolve student from user ID
    const student = await this.prisma.student.findUnique({ where: { user_id: userId } });
    if (!student) throw new NotFoundException('Student not found');

    const session = await this.prisma.examSession.findUnique({
      where: { id: dto.session_id },
      include: {
        exam: { include: { exam_questions: { include: { question: { include: { options: true } } } } } },
        package: true,
      },
    });

    if (!session) throw new NotFoundException('Session not found');
    if (session.student_id !== student.id) throw new ForbiddenException('Not your session');
    if (session.status === SessionStatus.SUBMITTED || session.status === SessionStatus.EXPIRED) {
      throw new BadRequestException('Session is already completed');
    }

    // Update session to active
    await this.prisma.examSession.update({
      where: { id: session.id },
      data: { status: SessionStatus.ACTIVE },
    });

    this.eventEmitter.emit(EventNames.SESSION_RECOVERED, { sessionId: session.id });

    // Return session with questions (without correct answer flags)
    const questions = session.exam.exam_questions
      .filter((eq) => !eq.package_id || eq.package_id === session.package_id)
      .sort((a, b) => a.position - b.position)
      .map((eq) => ({
        id: eq.id,
        position: eq.position,
        question: {
          id: eq.question.id,
          type: eq.question.type,
          content: eq.question.content,
          options: eq.question.options.map((o) => ({ id: o.id, content: o.content })),
        },
      }));

    return { ...session, questions };
  }

  async submit(dto: SubmitSessionDto, userId: string) {
    const { session_id } = submitSessionSchema.parse(dto);
    // Resolve student from user ID
    const student = await this.prisma.student.findUnique({ where: { user_id: userId } });
    if (!student) throw new NotFoundException('Student not found');

    const session = await this.prisma.examSession.findUnique({ where: { id: session_id } });
    if (!session) throw new NotFoundException('Session not found');
    if (session.student_id !== student.id) throw new ForbiddenException('Not your session');

    const updated = await this.prisma.examSession.update({
      where: { id: session_id },
      data: { status: SessionStatus.SUBMITTED, submitted_at: new Date() },
    });

    // Auto-grade all objective answers and create score record
    await this.gradingService.calculateTotalScore(session_id);

    this.eventEmitter.emit(EventNames.SESSION_FINISHED, {
      sessionId: session_id,
      examId: session.exam_id,
      studentId: session.student_id,
    });
    return updated;
  }

  async autoSubmit(sessionId: string) {
    const session = await this.prisma.examSession.findUnique({ where: { id: sessionId } });
    if (!session || session.status !== SessionStatus.ACTIVE) return;

    const updated = await this.prisma.examSession.update({
      where: { id: sessionId },
      data: { status: SessionStatus.AUTO_SUBMITTED, submitted_at: new Date() },
    });

    // Auto-grade all objective answers and create score record
    await this.gradingService.calculateTotalScore(sessionId);

    this.eventEmitter.emit(EventNames.SESSION_EXPIRED, {
      sessionId,
      examId: session.exam_id,
      studentId: session.student_id,
    });
    return updated;
  }
}
