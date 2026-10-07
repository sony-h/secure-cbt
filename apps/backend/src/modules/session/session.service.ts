import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../prisma/prisma.service';
import { GradingService } from '../grading/grading.service';
import {
  StartSessionInput, SubmitSessionInput, startSessionSchema, submitSessionSchema,
  SessionStatus, ExamStatus, SocketEvent, shuffle,
} from '@secure-cbt/shared';
import { resolveStudentId } from '../../common/helpers/user-resolver.helper';

@Injectable()
export class SessionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
    private readonly gradingService: GradingService,
  ) {}

  async start(dto: StartSessionInput, userId: string) {
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
    // If the mobile sent an exam_id, verify the token belongs to that exam
    if (dto.exam_id && exam.id !== dto.exam_id) {
      throw new BadRequestException('Token tidak valid atau sudah kadaluarsa');
    }

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
    if (!examClass) throw new BadRequestException('Token tidak valid atau sudah kadaluarsa');

    // Check for existing active session
    const existing = await this.prisma.examSession.findFirst({
      where: { exam_id: exam.id, student_id: student.id, status: { in: [SessionStatus.ACTIVE, SessionStatus.PAUSED] } },
    });
    if (existing) {
      return this.resume({ session_id: existing.id }, userId);
    }

    // Check for already completed session
    const completed = await this.prisma.examSession.findFirst({
      where: {
        exam_id: exam.id,
        student_id: student.id,
        status: { in: [SessionStatus.SUBMITTED, SessionStatus.AUTO_SUBMITTED, SessionStatus.EXPIRED] },
      },
    });
    if (completed) {
      throw new BadRequestException('Anda sudah menyelesaikan ujian ini');
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

    this.eventEmitter.emit(SocketEvent.SESSION_STARTED, { sessionId: session.id, examId: exam.id, studentId: student.id });

    // Return session with questions (without correct answer flags)
    const filtered = session.exam.exam_questions
      .filter((eq) => !eq.package_id || eq.package_id === assignedPackage?.id);

    const ordered = [...filtered].sort((a, b) => a.position - b.position);
    const finalOrder = exam.randomize_questions
      ? shuffle(ordered)
      : ordered;

    // Persist shuffled order so resume() can restore it
    if (exam.randomize_questions) {
      await this.prisma.examSession.update({
        where: { id: session.id },
        data: { question_order: finalOrder.map((eq) => eq.id) },
      });
    }

    const questions = finalOrder.map((eq) => {
      const opts = exam.randomize_answers
        ? shuffle(eq.question.options)
        : eq.question.options;
      return {
        id: eq.id,
        position: eq.position,
        question: {
          id: eq.question.id,
          type: eq.question.type,
          content: eq.question.content,
          image_url: eq.question.image_url,
          options: opts.map((o) => ({ id: o.id, content: o.content, image_url: o.image_url })),
        },
      };
    });

    return { ...session, questions };
  }

  async resume(dto: { session_id: string }, userId: string) {
    // Resolve student from user ID
    const studentId = await resolveStudentId(this.prisma, userId);

    const session = await this.prisma.examSession.findUnique({
      where: { id: dto.session_id },
      include: {
        exam: { include: { exam_questions: { include: { question: { include: { options: true } } } } } },
        package: true,
      },
    });

    if (!session) throw new NotFoundException('Session not found');
    if (session.student_id !== studentId) throw new ForbiddenException('Not your session');
    if (session.status === SessionStatus.SUBMITTED || session.status === SessionStatus.AUTO_SUBMITTED || session.status === SessionStatus.EXPIRED) {
      throw new BadRequestException('Session is already completed');
    }

    // Update session to active
    await this.prisma.examSession.update({
      where: { id: session.id },
      data: { status: SessionStatus.ACTIVE },
    });

    this.eventEmitter.emit(SocketEvent.SESSION_RECOVERED, { sessionId: session.id });

    // Return session with questions (without correct answer flags)
    const filtered = session.exam.exam_questions
      .filter((eq) => !eq.package_id || eq.package_id === session.package_id);

    const ordered = [...filtered].sort((a, b) => a.position - b.position);

    let finalOrder;
    if (session.exam.randomize_questions && session.question_order) {
      const orderArray = session.question_order as string[];
      finalOrder = orderArray
        .map((id) => filtered.find((eq) => eq.id === id))
        .filter(Boolean) as typeof filtered;
    } else if (session.exam.randomize_questions) {
      finalOrder = shuffle(ordered);
    } else {
      finalOrder = ordered;
    }

    const questions = finalOrder.map((eq) => {
      const opts = session.exam.randomize_answers
        ? shuffle(eq.question.options)
        : eq.question.options;
      return {
        id: eq.id,
        position: eq.position,
        question: {
          id: eq.question.id,
          type: eq.question.type,
          content: eq.question.content,
          image_url: eq.question.image_url,
          options: opts.map((o) => ({ id: o.id, content: o.content, image_url: o.image_url })),
        },
      };
    });

    return { ...session, questions };
  }

  async submit(dto: SubmitSessionInput, userId: string) {
    const { session_id } = submitSessionSchema.parse(dto);
    // Resolve student from user ID
    const studentId = await resolveStudentId(this.prisma, userId);

    const session = await this.prisma.examSession.findUnique({
      where: { id: session_id },
      include: { student: { select: { full_name: true } } },
    });
    if (!session) throw new NotFoundException('Session not found');
    if (session.student_id !== studentId) throw new ForbiddenException('Not your session');
    if (session.status === SessionStatus.SUBMITTED || session.status === SessionStatus.AUTO_SUBMITTED || session.status === SessionStatus.EXPIRED) {
      return session;
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const updatedSession = await tx.examSession.update({
        where: { id: session_id },
        data: { status: SessionStatus.SUBMITTED, submitted_at: new Date() },
      });

      const [scoreData, settings] = await Promise.all([
        this.gradingService.calculateTotalScore(tx, session_id),
        tx.setting.findFirst({ select: { passing_grade: true } }),
      ]);

      await tx.score.upsert({
        where: { exam_session_id: session_id },
        create: { exam_session_id: session_id, ...scoreData, passing_grade_at_score: settings?.passing_grade ?? null, graded_at: new Date() },
        update: { ...scoreData, passing_grade_at_score: settings?.passing_grade ?? null, graded_at: new Date() },
      });

      return updatedSession;
    });

    this.eventEmitter.emit(SocketEvent.SESSION_FINISHED, {
      sessionId: session_id,
      examId: session.exam_id,
      studentId: session.student_id,
      studentName: session.student.full_name,
    });
    return updated;
  }

  async getHistory(userId: string) {
    const studentId = await resolveStudentId(this.prisma, userId);

    const sessions = await this.prisma.examSession.findMany({
      where: {
        student_id: studentId,
        status: { in: [SessionStatus.SUBMITTED, SessionStatus.AUTO_SUBMITTED] },
        score: { isNot: null },
      },
      include: {
        exam: { include: { subject: true } },
        score: true,
      },
      orderBy: { submitted_at: 'desc' },
    });

    const now = new Date();
    return sessions.map((s) => {
      const isFinished = s.exam.status === ExamStatus.FINISHED || now > new Date(s.exam.end_at);
      return {
        id: s.id,
        exam_id: s.exam_id,
        exam_title: s.exam.title,
        subject_name: s.exam.subject.name,
        total_score: s.score!.total_score,
        correct_count: s.score!.correct_count,
        wrong_count: s.score!.wrong_count,
        submitted_at: s.submitted_at?.toISOString(),
        end_at: s.exam.end_at.toISOString(),
        is_exam_finished: isFinished,
      };
    });
  }

  async getReview(sessionId: string, userId: string) {
    const studentId = await resolveStudentId(this.prisma, userId);

    const session = await this.prisma.examSession.findUnique({
      where: { id: sessionId },
      include: {
        exam: {
          include: {
            subject: true,
            exam_questions: {
              include: {
                question: {
                  include: {
                    options: {
                      orderBy: { order: 'asc' },
                    },
                  },
                },
              },
            },
          },
        },
        answers: true,
        score: true,
        student: true,
      },
    });

    if (!session) throw new NotFoundException('Session not found');
    if (session.student_id !== studentId) throw new ForbiddenException('Not your session');

    if (
      session.status !== SessionStatus.SUBMITTED &&
      session.status !== SessionStatus.AUTO_SUBMITTED
    ) {
      throw new BadRequestException('Exam review is only available for submitted exams');
    }

    const now = new Date();
    const isExamFinished =
      session.exam.status === ExamStatus.FINISHED || now > new Date(session.exam.end_at);

    if (!isExamFinished) {
      throw new ForbiddenException(
        'Pembahasan ujian hanya dapat diakses setelah seluruh jadwal ujian selesai.',
      );
    }

    // Filter by package if session has a package
    const filteredQuestions = session.exam.exam_questions.filter(
      (eq) => !eq.package_id || eq.package_id === session.package_id,
    );

    // Sort questions by persisted question_order if available, otherwise by position
    let orderedQuestions: typeof filteredQuestions;
    if (session.question_order && Array.isArray(session.question_order)) {
      const orderArray = session.question_order as string[];
      orderedQuestions = orderArray
        .map((id) => filteredQuestions.find((eq) => eq.id === id))
        .filter(Boolean) as typeof filteredQuestions;
    } else {
      orderedQuestions = [...filteredQuestions].sort((a, b) => a.position - b.position);
    }

    const answerMap = new Map(session.answers.map((a) => [a.question_id, a]));

    const questions = orderedQuestions.map((eq, index) => {
      const q = eq.question;
      const ans = answerMap.get(q.id);

      return {
        id: q.id,
        number: index + 1,
        type: q.type,
        content: q.content,
        image_url: q.image_url,
        difficulty: q.difficulty,
        explanation: q.explanation,
        student_answer: ans?.answer_text ?? null,
        is_correct: ans?.is_correct ?? false,
        score: ans?.score ?? 0,
        feedback: ans?.feedback ?? null,
        options: q.options.map((opt) => ({
          id: opt.id,
          content: opt.content,
          image_url: opt.image_url,
          is_correct: opt.is_correct,
          order: opt.order,
        })),
      };
    });

    return {
      session_id: session.id,
      exam_id: session.exam_id,
      exam_title: session.exam.title,
      subject_name: session.exam.subject.name,
      total_score: session.score?.total_score ?? 0,
      correct_count: session.score?.correct_count ?? 0,
      wrong_count: session.score?.wrong_count ?? 0,
      total_questions: questions.length,
      submitted_at: session.submitted_at?.toISOString(),
      end_at: session.exam.end_at.toISOString(),
      questions,
    };
  }

  async autoSubmit(sessionId: string) {
    const session = await this.prisma.examSession.findUnique({ 
      where: { id: sessionId },
      include: { student: true },
    });
    if (!session || session.status !== SessionStatus.ACTIVE) return;

    const updated = await this.prisma.$transaction(async (tx) => {
      const updatedSession = await tx.examSession.update({
        where: { id: sessionId },
        data: { status: SessionStatus.AUTO_SUBMITTED, submitted_at: new Date() },
      });

      const [scoreData, settings] = await Promise.all([
        this.gradingService.calculateTotalScore(tx, sessionId),
        tx.setting.findFirst({ select: { passing_grade: true } }),
      ]);

      await tx.score.upsert({
        where: { exam_session_id: sessionId },
        create: { exam_session_id: sessionId, ...scoreData, passing_grade_at_score: settings?.passing_grade ?? null, graded_at: new Date() },
        update: { ...scoreData, passing_grade_at_score: settings?.passing_grade ?? null, graded_at: new Date() },
      });

      return updatedSession;
    });

    this.eventEmitter.emit(SocketEvent.SESSION_EXPIRED, {
      sessionId,
      examId: session.exam_id,
      studentId: session.student_id,
      studentName: session.student.full_name
    });
    return updated;
  }
}
