import { Injectable, NotFoundException, BadRequestException, ForbiddenException, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import { GradingService } from '../grading/grading.service';
import {
  StartSessionInput, ResumeSessionInput, SyncTimeInput, SubmitSessionInput,
  ReopenSessionInput, BulkAuthorizeRemedialInput,
  startSessionSchema, resumeSessionSchema, syncTimeSchema, submitSessionSchema,
  reopenSessionSchema, bulkAuthorizeRemedialSchema,
  SessionStatus, SessionType, ExamStatus, SocketEvent, shuffle, UserRole,
} from '@secure-cbt/shared';
import { resolveStudentId } from '../../common/helpers/user-resolver.helper';
import { sampleQuestionPool } from './session-sampler';
import { getTeacherScope, assertTeacherMonitorAccess } from '../../common/helpers/teacher-access.helper';

@Injectable()
export class SessionService {
  private readonly logger = new Logger(SessionService.name);

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
      orderBy: { attempt_number: 'desc' },
    });

    let attemptNumber = 1;
    let sessionType = SessionType.MAIN;

    if (completed) {
      if (completed.attempt_number >= 2) {
        throw new BadRequestException('Anda sudah menyelesaikan ujian remedial ini');
      }

      if (!completed.is_remedial_allowed) {
        throw new BadRequestException('Anda sudah menyelesaikan ujian ini');
      }

      // Check if attempt 2 already exists
      const existingAttempt2 = await this.prisma.examSession.findFirst({
        where: { exam_id: exam.id, student_id: student.id, attempt_number: 2 },
      });
      if (existingAttempt2) {
        if (existingAttempt2.status === SessionStatus.ACTIVE || existingAttempt2.status === SessionStatus.PAUSED) {
          return this.resume({ session_id: existingAttempt2.id }, userId);
        }
        throw new BadRequestException('Anda sudah menyelesaikan ujian remedial ini');
      }

      attemptNumber = 2;
      sessionType = SessionType.REMEDIAL;
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
        attempt_number: attemptNumber,
        session_type: sessionType,
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

    let candidatePool = [...filtered];
    if (exam.is_random_pool && exam.pool_question_count && exam.pool_question_count > 0) {
      const candidatesWithDifficulty = candidatePool.map((eq) => ({
        ...eq,
        difficulty: eq.question?.difficulty,
      }));
      candidatePool = sampleQuestionPool(
        candidatesWithDifficulty,
        exam.pool_question_count,
        (exam.pool_mode as 'BALANCED' | 'PURE_RANDOM') || 'BALANCED',
        exam.randomize_questions,
      );
    }

    const ordered = [...candidatePool].sort((a, b) => a.position - b.position);
    const finalOrder = exam.randomize_questions
      ? (exam.is_random_pool ? candidatePool : shuffle(ordered))
      : (exam.is_random_pool ? ordered : ordered);

    // Persist question order deterministically so resume() and grading restore it reliably
    await this.prisma.examSession.update({
      where: { id: session.id },
      data: { question_order: finalOrder.map((eq) => eq.id) },
    });

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
          audio_url: eq.question.audio_url ?? null,
          audio_play_limit: eq.question.audio_play_limit ?? null,
          options: opts.map((o) => ({ id: o.id, content: o.content, image_url: o.image_url })),
        },
      };
    });

    const examData = {
      ...session.exam,
      violation_vibration_enabled: session.exam?.violation_vibration_enabled ?? exam.violation_vibration_enabled ?? true,
      violation_alarm_enabled: session.exam?.violation_alarm_enabled ?? exam.violation_alarm_enabled ?? true,
      violation_alarm_duration_seconds: session.exam?.violation_alarm_duration_seconds ?? exam.violation_alarm_duration_seconds ?? 3,
      violation_alarm_sound: session.exam?.violation_alarm_sound ?? exam.violation_alarm_sound ?? 'sharp_beep',
    };

    return { ...session, exam: examData, questions };
  }

  async resume(dto: ResumeSessionInput, userId: string) {
    const { session_id, resumed_from_exit } = resumeSessionSchema.parse(dto);
    // Resolve student from user ID
    const studentId = await resolveStudentId(this.prisma, userId);

    const session = await this.prisma.examSession.findUnique({
      where: { id: session_id },
      include: {
        exam: { include: { exam_questions: { include: { question: { include: { options: true } } } } } },
        package: true,
        answers: { select: { question_id: true, answer_text: true } },
        student: { select: { full_name: true } },
      },
    });

    if (!session) throw new NotFoundException('Session not found');
    if (session.student_id !== studentId) throw new ForbiddenException('Not your session');
    if (session.status === SessionStatus.SUBMITTED || session.status === SessionStatus.AUTO_SUBMITTED || session.status === SessionStatus.EXPIRED) {
      throw new BadRequestException('Session is already completed');
    }

    let warningCount = session.warning_count ?? 0;
    let autoSubmitRequired = false;

    if (resumed_from_exit) {
      warningCount += 1;
      const warningLimit = session.exam?.warning_limit ?? 5;
      if (warningLimit > 0 && warningCount >= warningLimit && session.exam?.auto_submit_enabled) {
        autoSubmitRequired = true;
      }

      await this.prisma.$transaction(async (tx) => {
        await tx.examSession.update({
          where: { id: session.id },
          data: { status: SessionStatus.ACTIVE, warning_count: warningCount },
        });

        await tx.sessionLog.create({
          data: {
            exam_session_id: session.id,
            event: 'WARNING_TRIGGERED:APP_EXITED',
            description: `Siswa keluar dari aplikasi (Peringatan ${warningCount}/${warningLimit})`,
          },
        });
      });

      this.eventEmitter.emit(SocketEvent.WARNING_TRIGGERED, {
        sessionId: session.id,
        examId: session.exam_id,
        studentName: session.student?.full_name ?? '',
        count: warningCount,
        event: 'APP_EXITED',
      });
    } else {
      // Update session to active
      await this.prisma.examSession.update({
        where: { id: session.id },
        data: { status: SessionStatus.ACTIVE },
      });
    }

    this.eventEmitter.emit(SocketEvent.SESSION_RECOVERED, { sessionId: session.id });

    // Return session with questions (without correct answer flags)
    const filtered = session.exam.exam_questions
      .filter((eq) => !eq.package_id || eq.package_id === session.package_id);

    const ordered = [...filtered].sort((a, b) => a.position - b.position);

    let finalOrder;
    if (session.question_order && Array.isArray(session.question_order) && (session.question_order as string[]).length > 0) {
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
          audio_url: eq.question.audio_url ?? null,
          audio_play_limit: eq.question.audio_play_limit ?? null,
          options: opts.map((o) => ({ id: o.id, content: o.content, image_url: o.image_url })),
        },
      };
    });

    const examData = {
      ...session.exam,
      violation_vibration_enabled: session.exam?.violation_vibration_enabled ?? true,
      violation_alarm_enabled: session.exam?.violation_alarm_enabled ?? true,
      violation_alarm_duration_seconds: session.exam?.violation_alarm_duration_seconds ?? 3,
      violation_alarm_sound: session.exam?.violation_alarm_sound ?? 'sharp_beep',
    };

    const answersMap: Record<string, string> = {};
    if (session.answers && Array.isArray(session.answers)) {
      for (const ans of session.answers) {
        if (ans.question_id) {
          answersMap[ans.question_id] = ans.answer_text ?? '';
        }
      }
    }

    let remainingTimeSeconds = session.remaining_time_seconds;
    if (session.exam?.end_at) {
      const secondsUntilEnd = Math.max(0, Math.floor((new Date(session.exam.end_at).getTime() - Date.now()) / 1000));
      const durationSeconds = (session.exam.duration_minutes ?? 60) * 60;
      const currentRemaining = typeof session.remaining_time_seconds === 'number'
        ? session.remaining_time_seconds
        : durationSeconds;
      remainingTimeSeconds = Math.min(currentRemaining, secondsUntilEnd);
    }

    return {
      ...session,
      exam: examData,
      questions,
      answers: answersMap,
      warning_count: warningCount,
      remaining_time_seconds: remainingTimeSeconds,
      auto_submit_required: autoSubmitRequired,
    };
  }

  async syncTime(dto: SyncTimeInput, userId: string) {
    const { session_id, remaining_time_seconds } = syncTimeSchema.parse(dto);
    const studentId = await resolveStudentId(this.prisma, userId);

    const session = await this.prisma.examSession.findUnique({
      where: { id: session_id },
    });
    if (!session) throw new NotFoundException('Session not found');
    if (session.student_id !== studentId) throw new ForbiddenException('Not your session');
    if (session.status !== SessionStatus.ACTIVE) throw new BadRequestException('Session is not active');

    const updated = await this.prisma.examSession.update({
      where: { id: session_id },
      data: { remaining_time_seconds },
    });

    return {
      session_id: updated.id,
      remaining_time_seconds: updated.remaining_time_seconds,
    };
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
        create: {
          exam_session_id: session_id,
          attempt_number: session.attempt_number ?? 1,
          session_type: session.session_type ?? SessionType.MAIN,
          ...scoreData,
          passing_grade_at_score: settings?.passing_grade ?? null,
          graded_at: new Date(),
        },
        update: {
          attempt_number: session.attempt_number ?? 1,
          session_type: session.session_type ?? SessionType.MAIN,
          ...scoreData,
          passing_grade_at_score: settings?.passing_grade ?? null,
          graded_at: new Date(),
        },
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
    const submittedAttempt2ExamIds = new Set(
      sessions
        .filter((s) => (s.attempt_number ?? 1) === 2)
        .map((s) => s.exam_id),
    );

    return sessions.map((s) => {
      const isFinished = s.exam.status === ExamStatus.FINISHED || now > new Date(s.exam.end_at);
      const isRemedialLocked =
        s.is_remedial_allowed === true &&
        (s.attempt_number ?? 1) === 1 &&
        !submittedAttempt2ExamIds.has(s.exam_id);

      return {
        id: s.id,
        exam_id: s.exam_id,
        exam_title: s.exam.title,
        subject_name: s.exam.subject.name,
        total_score: s.score!.total_score,
        raw_points_earned: s.score?.raw_points_earned ?? 0,
        raw_points_possible: s.score?.raw_points_possible ?? 0,
        correct_count: s.score!.correct_count,
        wrong_count: s.score!.wrong_count,
        submitted_at: s.submitted_at?.toISOString(),
        end_at: s.exam.end_at.toISOString(),
        is_exam_finished: isFinished,
        show_results: s.exam.show_results ?? true,
        attempt_number: s.attempt_number ?? 1,
        is_remedial: s.is_remedial ?? false,
        is_remedial_allowed: s.is_remedial_allowed ?? false,
        is_remedial_locked: isRemedialLocked,
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

    if (session.exam.show_results === false) {
      throw new ForbiddenException(
        'Pembahasan dan nilai ujian dinonaktifkan oleh guru pengampu.',
      );
    }

    if (session.attempt_number === 1 && session.is_remedial_allowed) {
      const attempt2 = await this.prisma.examSession.findFirst({
        where: {
          exam_id: session.exam_id,
          student_id: session.student_id,
          attempt_number: 2,
        },
      });

      if (
        !attempt2 ||
        (attempt2.status !== SessionStatus.SUBMITTED &&
          attempt2.status !== SessionStatus.AUTO_SUBMITTED)
      ) {
        throw new ForbiddenException(
          'Pembahasan soal terkunci karena Anda terdaftar untuk mengikuti ujian remedial. Pembahasan akan terbuka setelah Anda menyelesaikan remedial.',
        );
      }
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
        audio_url: q.audio_url ?? null,
        audio_play_limit: q.audio_play_limit ?? null,
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
      raw_points_earned: session.score?.raw_points_earned ?? 0,
      raw_points_possible: session.score?.raw_points_possible ?? 0,
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
        create: {
          exam_session_id: sessionId,
          attempt_number: session.attempt_number ?? 1,
          session_type: session.session_type ?? SessionType.MAIN,
          ...scoreData,
          passing_grade_at_score: settings?.passing_grade ?? null,
          graded_at: new Date(),
        },
        update: {
          attempt_number: session.attempt_number ?? 1,
          session_type: session.session_type ?? SessionType.MAIN,
          ...scoreData,
          passing_grade_at_score: settings?.passing_grade ?? null,
          graded_at: new Date(),
        },
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

  private async resolveProctorName(proctorUserId: string): Promise<string> {
    if (!proctorUserId) return 'Pengawas';
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: proctorUserId },
        select: {
          username: true,
          teacher: { select: { full_name: true } },
        },
      });
      if (user?.teacher?.full_name) {
        return user.teacher.full_name;
      }
      if (user?.username) {
        return user.username;
      }
    } catch {
      // Fallback
    }
    return proctorUserId;
  }

  async forceSubmit(sessionId: string, proctorUserId: string, userRole?: string) {
    const session = await this.prisma.examSession.findUnique({
      where: { id: sessionId },
      include: {
        student: { select: { full_name: true, user_id: true } },
        exam: { select: { subject_id: true } },
      },
    });
    if (!session) throw new NotFoundException('Session not found');

    if (userRole === UserRole.TEACHER && proctorUserId) {
      const scope = await getTeacherScope(this.prisma, proctorUserId);
      assertTeacherMonitorAccess(
        scope,
        session.exam.subject_id,
        'Anda tidak memiliki izin memantau atau mengelola sesi ujian ini',
      );
    }

    if (
      session.status === SessionStatus.SUBMITTED ||
      session.status === SessionStatus.AUTO_SUBMITTED ||
      session.status === SessionStatus.EXPIRED
    ) {
      return session;
    }

    const proctorName = await this.resolveProctorName(proctorUserId);

    const updated = await this.prisma.$transaction(async (tx) => {
      const updatedSession = await tx.examSession.update({
        where: { id: sessionId },
        data: { status: SessionStatus.SUBMITTED, submitted_at: new Date() },
      });

      await tx.sessionLog.create({
        data: {
          exam_session_id: sessionId,
          event: 'FORCED_SUBMIT',
          description: `Ujian dikumpulkan paksa oleh pengawas (${proctorName})`,
        },
      });

      const [scoreData, settings] = await Promise.all([
        this.gradingService.calculateTotalScore(tx, sessionId),
        tx.setting.findFirst({ select: { passing_grade: true } }),
      ]);

      await tx.score.upsert({
        where: { exam_session_id: sessionId },
        create: {
          exam_session_id: sessionId,
          attempt_number: session.attempt_number ?? 1,
          session_type: session.session_type ?? SessionType.MAIN,
          ...scoreData,
          passing_grade_at_score: settings?.passing_grade ?? null,
          graded_at: new Date(),
        },
        update: {
          attempt_number: session.attempt_number ?? 1,
          session_type: session.session_type ?? SessionType.MAIN,
          ...scoreData,
          passing_grade_at_score: settings?.passing_grade ?? null,
          graded_at: new Date(),
        },
      });

      return updatedSession;
    });

    this.eventEmitter.emit(SocketEvent.SESSION_FORCE_SUBMIT, {
      sessionId: session.id,
      examId: session.exam_id,
      studentId: session.student_id,
      studentUserId: session.student.user_id,
      studentName: session.student.full_name,
    });

    this.eventEmitter.emit(SocketEvent.SESSION_FINISHED, {
      sessionId: session.id,
      examId: session.exam_id,
      studentId: session.student_id,
      studentName: session.student.full_name,
    });

    return updated;
  }

  async resetWarnings(sessionId: string, proctorUserId: string, userRole?: string) {
    const session = await this.prisma.examSession.findUnique({
      where: { id: sessionId },
      include: {
        student: { select: { full_name: true, user_id: true } },
        exam: { select: { subject_id: true } },
      },
    });
    if (!session) throw new NotFoundException('Session not found');

    if (userRole === UserRole.TEACHER && proctorUserId) {
      const scope = await getTeacherScope(this.prisma, proctorUserId);
      assertTeacherMonitorAccess(
        scope,
        session.exam.subject_id,
        'Anda tidak memiliki izin memantau atau mengelola sesi ujian ini',
      );
    }

    const proctorName = await this.resolveProctorName(proctorUserId);

    const updated = await this.prisma.$transaction(async (tx) => {
      const updatedSession = await tx.examSession.update({
        where: { id: sessionId },
        data: { warning_count: 0 },
      });

      await tx.sessionLog.create({
        data: {
          exam_session_id: sessionId,
          event: 'WARNINGS_RESET',
          description: `Peringatan pelanggaran direset ke 0 oleh pengawas (${proctorName})`,
        },
      });

      return updatedSession;
    });

    this.eventEmitter.emit(SocketEvent.SESSION_WARNINGS_RESET, {
      sessionId: session.id,
      examId: session.exam_id,
      studentId: session.student_id,
      studentUserId: session.student.user_id,
      studentName: session.student.full_name,
      warningCount: 0,
    });

    return updated;
  }

  async adjustWarnings(
    sessionId: string,
    delta: number,
    proctorUserId: string,
    userRole?: string,
  ) {
    if (!delta || delta === 0) {
      throw new BadRequestException('Perubahan poin pelanggaran tidak boleh 0');
    }

    const session = await this.prisma.examSession.findUnique({
      where: { id: sessionId },
      include: {
        student: { select: { full_name: true, user_id: true } },
        exam: { select: { subject_id: true, warning_limit: true, auto_submit_enabled: true } },
      },
    });
    if (!session) throw new NotFoundException('Session not found');

    if (userRole === UserRole.TEACHER && proctorUserId) {
      const scope = await getTeacherScope(this.prisma, proctorUserId);
      assertTeacherMonitorAccess(
        scope,
        session.exam.subject_id,
        'Anda tidak memiliki izin memantau atau mengelola sesi ujian ini',
      );
    }

    if (
      session.status === SessionStatus.SUBMITTED ||
      session.status === SessionStatus.AUTO_SUBMITTED ||
      session.status === SessionStatus.EXPIRED
    ) {
      throw new BadRequestException('Tidak dapat mengubah poin pelanggaran untuk sesi yang sudah selesai');
    }

    const currentWarnings = session.warning_count ?? 0;
    const newWarnings = Math.max(0, currentWarnings + delta);
    const proctorName = await this.resolveProctorName(proctorUserId);

    const updated = await this.prisma.$transaction(async (tx) => {
      const updatedSession = await tx.examSession.update({
        where: { id: sessionId },
        data: { warning_count: newWarnings },
      });

      const logEvent = delta > 0 ? 'WARNING_ADDED' : 'WARNING_REDUCED';
      const logDescription =
        delta > 0
          ? `Poin pelanggaran (+${delta}) ditambahkan oleh pengawas (${proctorName}). Total: ${newWarnings}`
          : `Poin pelanggaran (${delta}) dikurangi oleh pengawas (${proctorName}). Total: ${newWarnings}`;

      await tx.sessionLog.create({
        data: {
          exam_session_id: sessionId,
          event: logEvent,
          description: logDescription,
        },
      });

      return updatedSession;
    });

    this.eventEmitter.emit(SocketEvent.SESSION_WARNINGS_ADJUSTED, {
      sessionId: session.id,
      examId: session.exam_id,
      studentId: session.student_id,
      studentUserId: session.student.user_id,
      studentName: session.student.full_name,
      warningCount: newWarnings,
      delta,
    });

    const limit = session.exam.warning_limit ?? 0;
    if (delta > 0 && limit > 0 && newWarnings >= limit && session.exam.auto_submit_enabled) {
      try {
        await this.autoSubmit(session.id);
        this.eventEmitter.emit(SocketEvent.SESSION_FORCE_SUBMIT, {
          sessionId: session.id,
          examId: session.exam_id,
          studentId: session.student_id,
          studentUserId: session.student.user_id,
          studentName: session.student.full_name,
          message: 'Batas poin pelanggaran tercapai. Ujian dikumpulkan otomatis.',
        });
      } catch (err) {
        this.logger.error(`Failed to auto-submit session ${session.id} after manual strike limit reached`, err);
      }
    }

    return updated;
  }

  async extendTime(
    sessionId: string,
    additionalMinutes: number,
    proctorUserId: string,
    userRole?: string,
  ) {
    if (!additionalMinutes || additionalMinutes === 0) {
      throw new BadRequestException('Perubahan waktu ujian tidak boleh 0 menit');
    }

    const session = await this.prisma.examSession.findUnique({
      where: { id: sessionId },
      include: {
        student: { select: { full_name: true, user_id: true } },
        exam: { select: { subject_id: true } },
      },
    });
    if (!session) throw new NotFoundException('Session not found');

    if (userRole === UserRole.TEACHER && proctorUserId) {
      const scope = await getTeacherScope(this.prisma, proctorUserId);
      assertTeacherMonitorAccess(
        scope,
        session.exam.subject_id,
        'Anda tidak memiliki izin memantau atau mengelola sesi ujian ini',
      );
    }

    if (
      session.status === SessionStatus.SUBMITTED ||
      session.status === SessionStatus.AUTO_SUBMITTED ||
      session.status === SessionStatus.EXPIRED
    ) {
      throw new BadRequestException('Tidak dapat mengubah waktu untuk sesi ujian yang sudah selesai');
    }

    const additionalSeconds = additionalMinutes * 60;
    const currentRemaining = session.remaining_time_seconds ?? 0;
    const newRemaining = Math.max(0, currentRemaining + additionalSeconds);
    const proctorName = await this.resolveProctorName(proctorUserId);

    const updated = await this.prisma.$transaction(async (tx) => {
      const updatedSession = await tx.examSession.update({
        where: { id: sessionId },
        data: { remaining_time_seconds: newRemaining },
      });

      const logEvent = additionalMinutes > 0 ? 'TIME_EXTENDED' : 'TIME_REDUCED';
      const logDescription =
        additionalMinutes > 0
          ? `Waktu ujian ditambah ${additionalMinutes} menit oleh pengawas (${proctorName})`
          : `Waktu ujian dikurangi ${Math.abs(additionalMinutes)} menit oleh pengawas (${proctorName})`;

      await tx.sessionLog.create({
        data: {
          exam_session_id: sessionId,
          event: logEvent,
          description: logDescription,
        },
      });

      return updatedSession;
    });

    this.eventEmitter.emit(SocketEvent.SESSION_TIME_EXTENDED, {
      sessionId: session.id,
      examId: session.exam_id,
      studentId: session.student_id,
      studentUserId: session.student.user_id,
      studentName: session.student.full_name,
      additionalMinutes,
      additionalSeconds,
      remainingTimeSeconds: newRemaining,
    });

    return updated;
  }

  async unlockSession(sessionId: string, proctorUserId: string, userRole?: string) {
    const session = await this.prisma.examSession.findUnique({
      where: { id: sessionId },
      include: {
        student: { select: { full_name: true, user_id: true } },
        exam: { select: { subject_id: true } },
      },
    });
    if (!session) throw new NotFoundException('Session not found');

    if (userRole === UserRole.TEACHER && proctorUserId) {
      const scope = await getTeacherScope(this.prisma, proctorUserId);
      assertTeacherMonitorAccess(
        scope,
        session.exam.subject_id,
        'Anda tidak memiliki izin memantau atau mengelola sesi ujian ini',
      );
    }

    if (
      session.status === SessionStatus.SUBMITTED ||
      session.status === SessionStatus.AUTO_SUBMITTED ||
      session.status === SessionStatus.EXPIRED
    ) {
      throw new BadRequestException('Tidak dapat membuka kunci sesi ujian yang sudah selesai');
    }

    const proctorName = await this.resolveProctorName(proctorUserId);

    const updated = await this.prisma.$transaction(async (tx) => {
      const updatedSession = await tx.examSession.update({
        where: { id: sessionId },
        data: {
          device_id: null,
          status: SessionStatus.ACTIVE,
        },
      });

      await tx.sessionLog.create({
        data: {
          exam_session_id: sessionId,
          event: 'SESSION_UNLOCKED',
          description: `Kunci sesi dibuka oleh pengawas (${proctorName})`,
        },
      });

      return updatedSession;
    });

    this.eventEmitter.emit(SocketEvent.SESSION_UNLOCKED, {
      sessionId: session.id,
      examId: session.exam_id,
      studentId: session.student_id,
      studentUserId: session.student.user_id,
      studentName: session.student.full_name,
    });

    return updated;
  }

  async reopenSession(
    sessionId: string,
    proctorUserId: string,
    dto: { additional_minutes?: number; reset_strikes?: boolean },
    userRole?: string,
  ) {
    const { additional_minutes, reset_strikes } = reopenSessionSchema.parse({
      ...dto,
      session_id: sessionId,
    });

    const session = await this.prisma.examSession.findUnique({
      where: { id: sessionId },
      include: {
        student: { select: { id: true, full_name: true, user_id: true } },
        exam: { select: { id: true, subject_id: true, status: true, end_at: true, duration_minutes: true } },
      },
    });
    if (!session) throw new NotFoundException('Session not found');

    if (userRole === UserRole.TEACHER && proctorUserId) {
      const scope = await getTeacherScope(this.prisma, proctorUserId);
      assertTeacherMonitorAccess(
        scope,
        session.exam.subject_id,
        'Anda tidak memiliki izin memantau atau mengelola sesi ujian ini',
      );
    }

    if (session.status === SessionStatus.ACTIVE || session.status === SessionStatus.PAUSED) {
      throw new BadRequestException('Sesi ujian masih berstatus aktif');
    }

    const now = new Date();
    if (
      now > session.exam.end_at ||
      session.exam.status === ExamStatus.FINISHED ||
      session.exam.status === ExamStatus.CANCELLED
    ) {
      throw new BadRequestException('Jadwal ujian telah berakhir. Sesi tidak dapat dibuka kembali.');
    }

    const proctorName = await this.resolveProctorName(proctorUserId);

    // Calculate restored remaining time
    const baseRemaining = session.remaining_time_seconds ?? (session.exam.duration_minutes * 60);
    const addedSeconds = (additional_minutes ?? 0) * 60;
    const restoredRemainingTime = Math.max(60, baseRemaining + addedSeconds);
    const updatedWarningCount = reset_strikes ? 0 : session.warning_count;

    const updated = await this.prisma.$transaction(async (tx) => {
      const updatedSession = await tx.examSession.update({
        where: { id: sessionId },
        data: {
          status: SessionStatus.ACTIVE,
          submitted_at: null,
          reopened_at: new Date(),
          reopened_by: proctorUserId,
          remaining_time_seconds: restoredRemainingTime,
          warning_count: updatedWarningCount,
        },
      });

      // Remove provisional score so it re-grades cleanly upon future submission
      await tx.score.deleteMany({
        where: { exam_session_id: sessionId },
      });

      await tx.sessionLog.create({
        data: {
          exam_session_id: sessionId,
          event: 'SESSION_REOPENED',
          description: `Sesi dibuka kembali oleh pengawas (${proctorName}). Sisa waktu: ${Math.round(restoredRemainingTime / 60)} menit.${reset_strikes ? ' Peringatan pelanggaran direset ke 0.' : ''}`,
        },
      });

      return updatedSession;
    });

    this.eventEmitter.emit(SocketEvent.SESSION_REOPENED, {
      sessionId: session.id,
      examId: session.exam_id,
      studentId: session.student_id,
      studentUserId: session.student.user_id,
      studentName: session.student.full_name,
      remainingTimeSeconds: restoredRemainingTime,
      warningCount: updatedWarningCount,
      reopenedBy: proctorName,
    });

    return updated;
  }

  async authorizeRemedial(sessionId: string, proctorUserId: string, userRole?: string) {
    const session = await this.prisma.examSession.findUnique({
      where: { id: sessionId },
      include: {
        student: { select: { id: true, full_name: true, user_id: true } },
        exam: { select: { id: true, subject_id: true } },
      },
    });
    if (!session) throw new NotFoundException('Session not found');

    if (userRole === UserRole.TEACHER && proctorUserId) {
      const scope = await getTeacherScope(this.prisma, proctorUserId);
      assertTeacherMonitorAccess(
        scope,
        session.exam.subject_id,
        'Anda tidak memiliki izin mengelola sesi ujian ini',
      );
    }

    if (
      session.status !== SessionStatus.SUBMITTED &&
      session.status !== SessionStatus.AUTO_SUBMITTED &&
      session.status !== SessionStatus.EXPIRED
    ) {
      throw new BadRequestException('Remedial hanya dapat diotorisasi untuk sesi ujian yang telah selesai');
    }

    if (session.attempt_number > 1) {
      throw new BadRequestException('Otorisasi remedial hanya dapat diberikan untuk ujian utama (Attempt 1)');
    }

    const attempt2 = await this.prisma.examSession.findFirst({
      where: {
        exam_id: session.exam_id,
        student_id: session.student_id,
        attempt_number: 2,
      },
    });
    if (
      attempt2 &&
      (attempt2.status === SessionStatus.SUBMITTED ||
        attempt2.status === SessionStatus.AUTO_SUBMITTED ||
        attempt2.status === SessionStatus.EXPIRED)
    ) {
      throw new BadRequestException('Siswa telah menyelesaikan ujian remedial untuk mata pelajaran ini');
    }

    const proctorName = await this.resolveProctorName(proctorUserId);

    const updated = await this.prisma.$transaction(async (tx) => {
      const updatedSession = await tx.examSession.update({
        where: { id: sessionId },
        data: { is_remedial_allowed: true },
      });

      await tx.sessionLog.create({
        data: {
          exam_session_id: sessionId,
          event: 'REMEDIAL_AUTHORIZED',
          description: `Remedial diizinkan oleh pengawas/guru (${proctorName})`,
        },
      });

      return updatedSession;
    });

    this.eventEmitter.emit(SocketEvent.SESSION_REMEDIAL_AUTHORIZED, {
      sessionId: session.id,
      examId: session.exam_id,
      studentId: session.student_id,
      studentUserId: session.student.user_id,
      studentName: session.student.full_name,
      proctorName,
    });

    return updated;
  }

  async bulkAuthorizeRemedial(
    examId: string,
    proctorUserId: string,
    dto: BulkAuthorizeRemedialInput,
    userRole?: string,
  ) {
    const { student_ids } = bulkAuthorizeRemedialSchema.parse(dto);

    if (userRole === UserRole.TEACHER && proctorUserId) {
      const exam = await this.prisma.exam.findUnique({
        where: { id: examId },
        select: { subject_id: true },
      });
      if (!exam) throw new NotFoundException('Exam not found');

      const scope = await getTeacherScope(this.prisma, proctorUserId);
      assertTeacherMonitorAccess(
        scope,
        exam.subject_id,
        'Anda tidak memiliki izin mengelola ujian ini',
      );
    }

    const updated = await this.prisma.examSession.updateMany({
      where: {
        exam_id: examId,
        student_id: { in: student_ids },
        attempt_number: 1,
        status: { in: [SessionStatus.SUBMITTED, SessionStatus.AUTO_SUBMITTED, SessionStatus.EXPIRED] },
      },
      data: { is_remedial_allowed: true },
    });

    return updated;
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async handleAutoSubmitExpiredCron() {
    await this.autoSubmitExpiredSessions();
  }

  async autoSubmitExpiredSessions(now: Date = new Date()) {
    const activeSessions = await this.prisma.examSession.findMany({
      where: {
        status: SessionStatus.ACTIVE,
      },
      include: {
        exam: {
          select: {
            id: true,
            duration_minutes: true,
            end_at: true,
            status: true,
          },
        },
        student: {
          select: {
            full_name: true,
            user_id: true,
          },
        },
      },
    });

    const expiredSessions = activeSessions.filter((session) => {
      // 1. Exam status is explicitly finished
      if (session.exam.status === ExamStatus.FINISHED) {
        return true;
      }

      // 2. Scheduled exam window ended past 1 minute grace period
      if (session.exam.end_at) {
        const examEndMs = new Date(session.exam.end_at).getTime();
        if (now.getTime() > examEndMs + 60 * 1000) {
          return true;
        }
      }

      // 3. Session remaining time reached zero past 1 minute grace period
      if (session.remaining_time_seconds !== null && session.remaining_time_seconds !== undefined) {
        const lastUpdateMs = session.updated_at
          ? new Date(session.updated_at).getTime()
          : new Date(session.started_at).getTime();
        const elapsedSinceUpdateSec = Math.floor((now.getTime() - lastUpdateMs) / 1000);
        const estimatedRemainingSec = session.remaining_time_seconds - elapsedSinceUpdateSec;
        if (estimatedRemainingSec <= -60) {
          return true;
        }
      }

      // 4. Fallback check: Total elapsed time since session start exceeds (duration + 1 min grace)
      const durationSec = session.exam.duration_minutes * 60;
      const startedMs = new Date(session.started_at).getTime();
      const totalElapsedSec = Math.floor((now.getTime() - startedMs) / 1000);
      if (totalElapsedSec >= durationSec + 60) {
        return true;
      }

      return false;
    });

    let submittedCount = 0;
    for (const session of expiredSessions) {
      try {
        await this.prisma.$transaction(async (tx) => {
          await tx.examSession.update({
            where: { id: session.id },
            data: {
              status: SessionStatus.AUTO_SUBMITTED,
              submitted_at: now,
              remaining_time_seconds: 0,
            },
          });

          await tx.sessionLog.create({
            data: {
              exam_session_id: session.id,
              event: 'SYSTEM',
              description: 'AUTO_SUBMIT_SYSTEM_TIMEOUT: Sesi ujian otomatis di-submit oleh sistem karena waktu habis (TIMEOUT)',
            },
          });

          const [scoreData, settings] = await Promise.all([
            this.gradingService.calculateTotalScore(tx, session.id),
            tx.setting.findFirst({ select: { passing_grade: true } }),
          ]);

          await tx.score.upsert({
            where: { exam_session_id: session.id },
            create: {
              exam_session_id: session.id,
              attempt_number: session.attempt_number ?? 1,
              session_type: session.session_type ?? SessionType.MAIN,
              ...scoreData,
              passing_grade_at_score: settings?.passing_grade ?? null,
              graded_at: now,
            },
            update: {
              attempt_number: session.attempt_number ?? 1,
              session_type: session.session_type ?? SessionType.MAIN,
              ...scoreData,
              passing_grade_at_score: settings?.passing_grade ?? null,
              graded_at: now,
            },
          });
        });

        this.eventEmitter.emit(SocketEvent.SESSION_FINISHED, {
          sessionId: session.id,
          examId: session.exam_id,
          studentId: session.student_id,
          studentName: session.student.full_name,
        });

        submittedCount++;
      } catch (err) {
        this.logger.error(`Failed to auto-submit expired session ${session.id}: ${err}`);
      }
    }

    return { submittedCount, totalExpired: expiredSessions.length };
  }
}
