import { Injectable, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../prisma/prisma.service';
import { GradeEssayInput, gradeEssaySchema, QuestionType, SessionStatus, SocketEvent, ExamStatus } from '@secure-cbt/shared';
import { Prisma } from '@prisma/client';

@Injectable()
export class GradingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async gradeEssay(dto: GradeEssayInput, graderId: string) {
    const { session_id, question_id, score, feedback, revision_note } = gradeEssaySchema.parse(dto);

    return await this.prisma.$transaction(async (tx) => {
      const answer = await tx.answer.findUnique({
        where: { exam_session_id_question_id: { exam_session_id: session_id, question_id } },
        include: { question: true },
      });
      if (!answer) throw new NotFoundException('Answer not found');
      if (answer.question.type !== QuestionType.ESSAY) throw new NotFoundException('Question is not an essay type');

      const isRevision = answer.score !== null;
      const logPayload = isRevision
        ? {
            question_id,
            previous_score: answer.score,
            new_score: score,
            previous_feedback: answer.feedback ?? null,
            new_feedback: feedback ?? null,
            revision_note: dto.revision_note || null,
            grader_id: graderId,
            timestamp: new Date().toISOString(),
          }
        : {
            question_id,
            score,
            feedback: feedback ?? null,
            grader_id: graderId,
            timestamp: new Date().toISOString(),
          };

      await tx.sessionLog.create({
        data: {
          exam_session_id: session_id,
          event: isRevision ? 'ESSAY_REVISED' : 'ESSAY_GRADED',
          description: JSON.stringify(logPayload),
        },
      });

      await tx.answer.update({
        where: { id: answer.id },
        data: { score, is_correct: score >= 50, feedback },
      });

      const [scoreData, settings] = await Promise.all([
        this.calculateTotalScore(tx, session_id),
        tx.setting.findFirst({ select: { passing_grade: true } }),
      ]);

      await tx.score.upsert({
        where: { exam_session_id: session_id },
        create: {
          exam_session_id: session_id,
          ...scoreData,
          passing_grade_at_score: settings?.passing_grade ?? null,
          graded_by: graderId,
          graded_at: new Date(),
        },
        update: {
          ...scoreData,
          passing_grade_at_score: settings?.passing_grade ?? null,
          graded_by: graderId,
          graded_at: new Date(),
        },
      });

      this.eventEmitter.emit(SocketEvent.ESSAY_GRADED, {
        sessionId: session_id,
        questionId: question_id,
        graderId,
      });

      return { graded: true };
    });
  }

  async calculateTotalScore(
    tx: Prisma.TransactionClient,
    sessionId: string,
    options?: { forceReevaluate?: boolean },
  ) {
    const session = await tx.examSession.findUnique({
      where: { id: sessionId },
      include: {
        answers: { include: { question: true } },
        package: true,
        exam: {
          include: {
            exam_questions: {
              include: {
                question: { select: { id: true, difficulty: true } },
              },
            },
          },
        },
      },
    });
    if (!session) throw new NotFoundException('Session not found');

    const exam = session.exam;
    const pointsConfig = {
      EASY: exam?.points_easy ?? 1,
      MEDIUM: exam?.points_medium ?? 2,
      HARD: exam?.points_hard ?? 3,
    };

    const getQuestionWeight = (diff?: string | null) => {
      const d = (diff || '').toUpperCase();
      if (d === 'EASY') return pointsConfig.EASY;
      if (d === 'HARD') return pointsConfig.HARD;
      return pointsConfig.MEDIUM;
    };

    const allExamQuestions = exam?.exam_questions ?? [];
    const packageId = session.package_id;
    let assignedExamQuestions = packageId
      ? allExamQuestions.filter((eq) => !eq.package_id || eq.package_id === packageId)
      : allExamQuestions;

    if (
      session.question_order &&
      Array.isArray(session.question_order) &&
      (session.question_order as string[]).length > 0
    ) {
      const orderIds = new Set(session.question_order as string[]);
      assignedExamQuestions = allExamQuestions.filter((eq) => orderIds.has(eq.id));
    }

    let rawPointsPossible = 0;
    for (const eq of assignedExamQuestions) {
      rawPointsPossible += getQuestionWeight(eq.question?.difficulty);
    }
    if (rawPointsPossible === 0) {
      for (const ans of session.answers) {
        rawPointsPossible += getQuestionWeight(ans.question?.difficulty);
      }
    }
    if (rawPointsPossible === 0) {
      rawPointsPossible = 1;
    }

    const assignedQuestionIds = new Set(
      assignedExamQuestions.map((eq: any) => eq.question_id || eq.question?.id).filter(Boolean),
    );

    const answers = session.answers.filter((ans) => {
      if (assignedQuestionIds.size === 0) return true;
      return assignedQuestionIds.has(ans.question_id);
    });

    let rawPointsEarned = 0;
    let correctCount = 0;
    let wrongCount = 0;
    let essayScore = 0;

    for (const answer of answers) {
      const weight = getQuestionWeight(answer.question?.difficulty);

      if (answer.question.type === QuestionType.ESSAY) {
        if (answer.score !== null) {
          essayScore += answer.score;
          const earned = weight * (answer.score / 100);
          rawPointsEarned += earned;
          if (answer.score >= 50) correctCount++;
          else wrongCount++;
        }
      } else if (options?.forceReevaluate || answer.score === null) {
        let isCorrect = false;
        let score = 0;

        if (answer.question.type === QuestionType.SHORT_ANSWER) {
          const qOptions = await tx.questionOption.findMany({
            where: { question_id: answer.question_id },
          });
          const normalizedStudent = (answer.answer_text || '').trim().toLowerCase();
          isCorrect = normalizedStudent.length > 0 && qOptions.some(
            (opt) => opt.content.trim().toLowerCase() === normalizedStudent,
          );
          score = isCorrect ? 100 : 0;
        } else if (answer.question.type === QuestionType.MATCHING) {
          const qOptions = await tx.questionOption.findMany({
            where: { question_id: answer.question_id },
          });
          if (qOptions.length > 0) {
            let matches: Record<string, string> = {};
            try {
              matches = JSON.parse(answer.answer_text || '{}');
            } catch {
              matches = {};
            }
            let correctPairs = 0;
            for (const opt of qOptions) {
              if (matches[opt.id] === opt.id) {
                correctPairs++;
              }
            }
            score = Math.round((correctPairs / qOptions.length) * 100);
            isCorrect = score === 100;
          }
        } else {
          // MULTIPLE_CHOICE, MULTI_SELECT, TRUE_FALSE
          const allOptions = await tx.questionOption.findMany({
            where: { question_id: answer.question_id },
            orderBy: { order: 'asc' },
          });
          const correctOptions = allOptions.filter((o) => o.is_correct);
          const correctOptionIds = correctOptions.map((o) => o.id);
          const rawStudentAnswers = answer.answer_text?.split(',').map((s) => s.trim()).filter(Boolean) ?? [];

          // Map raw student answers to current option IDs (resolving stale UUIDs or content/order fallback)
          const resolvedStudentOptionIds: string[] = [];
          for (const rawAns of rawStudentAnswers) {
            const directMatch = allOptions.find((o) => o.id === rawAns);
            if (directMatch) {
              resolvedStudentOptionIds.push(directMatch.id);
              continue;
            }
            const contentMatch = allOptions.find(
              (o) => o.content.trim().toLowerCase() === rawAns.toLowerCase(),
            );
            if (contentMatch) {
              resolvedStudentOptionIds.push(contentMatch.id);
              continue;
            }
            const letterIndex = ['A', 'B', 'C', 'D', 'E'].indexOf(rawAns.toUpperCase());
            if (letterIndex !== -1 && allOptions[letterIndex]) {
              resolvedStudentOptionIds.push(allOptions[letterIndex].id);
              continue;
            }
            const orderIndex = parseInt(rawAns, 10);
            if (!isNaN(orderIndex)) {
              const orderMatch = allOptions.find((o) => o.order === orderIndex);
              if (orderMatch) {
                resolvedStudentOptionIds.push(orderMatch.id);
                continue;
              }
            }
            resolvedStudentOptionIds.push(rawAns);
          }

          isCorrect = correctOptionIds.length > 0 &&
            correctOptionIds.length === resolvedStudentOptionIds.length &&
            correctOptionIds.every((id) => resolvedStudentOptionIds.includes(id));
          score = isCorrect ? 100 : 0;
        }

        if (isCorrect || score >= 50) {
          correctCount++;
        } else {
          wrongCount++;
        }
        const earned = weight * (score / 100);
        rawPointsEarned += earned;

        await tx.answer.update({
          where: { id: answer.id },
          data: { is_correct: isCorrect, score },
        });
      } else if (answer.is_correct || (answer.score !== null && answer.score >= 50)) {
        correctCount++;
        const itemScore = answer.score ?? 100;
        const earned = weight * (itemScore / 100);
        rawPointsEarned += earned;
      } else {
        wrongCount++;
        const itemScore = answer.score ?? 0;
        const earned = weight * (itemScore / 100);
        rawPointsEarned += earned;
      }
    }

    const totalQuestions = assignedExamQuestions.length || answers.length || 1;
    const normalizedScore = (rawPointsEarned / rawPointsPossible) * 100;
    const finalScore = Math.max(0, Math.min(100, Math.round(normalizedScore * 100) / 100));

    return {
      total_score: finalScore,
      raw_points_earned: Math.round(rawPointsEarned * 100) / 100,
      raw_points_possible: Math.round(rawPointsPossible * 100) / 100,
      correct_count: correctCount,
      wrong_count: wrongCount,
      essay_score: essayScore,
      total_questions: totalQuestions,
    };
  }

  async getResult(sessionId: string) {
    const score = await this.prisma.score.findUnique({
      where: { exam_session_id: sessionId },
      include: {
        exam_session: {
          include: {
            student: true,
            exam: { include: { subject: true } },
          },
        },
      },
    });
    if (!score) throw new NotFoundException('Score not found');

    const now = new Date();
    const isExamFinished = score.exam_session.exam.status === ExamStatus.FINISHED || now > new Date(score.exam_session.exam.end_at);

    return {
      session_id: sessionId,
      student_id: score.exam_session.student_id,
      student_name: score.exam_session.student.full_name,
      exam_title: score.exam_session.exam.title,
      total_score: score.total_score,
      raw_points_earned: score.raw_points_earned,
      raw_points_possible: score.raw_points_possible,
      correct_count: score.correct_count,
      wrong_count: score.wrong_count,
      essay_score: score.essay_score,
      graded_at: score.graded_at?.toISOString(),
      end_at: score.exam_session.exam.end_at?.toISOString(),
      is_exam_finished: isExamFinished,
    };
  }

  async getClassScore(classId: string, examId: string) {
    const cls = await this.prisma.class.findUnique({
      where: { id: classId },
      include: { students: true },
    });
    if (!cls) throw new NotFoundException('Class not found');

    const studentIds = cls.students.map((s) => s.id);
    const scores = await this.prisma.score.findMany({
      where: {
        exam_session: { exam_id: examId, student_id: { in: studentIds } },
      },
    });

    if (scores.length === 0) {
      return {
        class_id: classId,
        class_name: cls.name,
        exam_id: examId,
        student_count: 0,
        average_score: 0,
        highest_score: 0,
        lowest_score: 0,
      };
    }

    const scoreValues = scores.map((s) => s.total_score);
    return {
      class_id: classId,
      class_name: cls.name,
      exam_id: examId,
      student_count: scores.length,
      average_score: scoreValues.reduce((a, b) => a + b, 0) / scores.length,
      highest_score: Math.max(...scoreValues),
      lowest_score: Math.min(...scoreValues),
    };
  }

  async getPendingEssays(
    examId: string,
    classId?: string,
    status: 'pending' | 'completed' | 'all' = 'pending',
  ) {
    const where: any = {
      exam_id: examId,
      status: { in: [SessionStatus.SUBMITTED, SessionStatus.AUTO_SUBMITTED] },
    };
    if (classId) where.student = { class_id: classId };

    if (status === 'completed') {
      where.answers = {
        some: { question: { type: QuestionType.ESSAY } },
        none: { question: { type: QuestionType.ESSAY }, score: null },
      };
    } else if (status === 'all') {
      where.answers = {
        some: { question: { type: QuestionType.ESSAY } },
      };
    } else {
      // 'pending'
      where.answers = {
        some: {
          question: { type: QuestionType.ESSAY },
          score: null,
        },
      };
    }

    const sessions = await this.prisma.examSession.findMany({
      where,
      include: {
        student: { include: { class: true } },
        answers: {
          where: { question: { type: QuestionType.ESSAY } },
          include: { question: true },
        },
      },
    });

    return sessions.map((s) => {
      const pendingCount = s.answers.filter((a) => a.score === null).length;
      const gradedCount = s.answers.filter((a) => a.score !== null).length;
      return {
        session_id: s.id,
        student_name: s.student.full_name,
        nis: s.student.nis,
        class_name: s.student.class?.name || '',
        pending_count: pendingCount,
        graded_count: gradedCount,
        total_essays: s.answers.length,
      };
    });
  }

  async getEssayHistory(sessionId: string, questionId: string) {
    const logs = await this.prisma.sessionLog.findMany({
      where: {
        exam_session_id: sessionId,
        event: { in: ['ESSAY_GRADED', 'ESSAY_REVISED'] },
      },
      orderBy: { created_at: 'desc' },
    });

    const matchingLogs = logs
      .map((log) => {
        try {
          const parsed = JSON.parse(log.description || '{}');
          if (parsed.question_id !== questionId) return null;
          return {
            id: log.id,
            event: log.event,
            question_id: parsed.question_id,
            previous_score: parsed.previous_score ?? null,
            new_score: parsed.new_score ?? null,
            score: parsed.score ?? parsed.new_score ?? null,
            previous_feedback: parsed.previous_feedback ?? null,
            new_feedback: parsed.new_feedback ?? null,
            feedback: parsed.feedback ?? parsed.new_feedback ?? null,
            revision_note: parsed.revision_note ?? null,
            grader_id: parsed.grader_id,
            timestamp: parsed.timestamp || log.created_at.toISOString(),
            created_at: log.created_at,
          };
        } catch {
          return null;
        }
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);

    const graderIds = [
      ...new Set(
        matchingLogs
          .map((item) => item.grader_id)
          .filter((id): id is string => typeof id === 'string' && id.length > 0),
      ),
    ];

    if (this.prisma.user?.findMany && graderIds.length > 0) {
      try {
        const graders = await this.prisma.user.findMany({
          where: { id: { in: graderIds } },
          select: {
            id: true,
            username: true,
            teacher: { select: { full_name: true } },
          },
        });
        const graderMap = new Map<string, string>();
        for (const g of graders) {
          graderMap.set(g.id, g.teacher?.full_name || g.username);
        }
        return matchingLogs.map((item) => ({
          ...item,
          grader_name: graderMap.get(item.grader_id) || null,
        }));
      } catch {
        // Fallback without grader names if user query fails
      }
    }

    return matchingLogs;
  }

  async getSessionEssays(sessionId: string) {
    const session = await this.prisma.examSession.findUnique({
      where: { id: sessionId },
      include: {
        student: { include: { class: true } },
        answers: {
          where: { question: { type: QuestionType.ESSAY } },
          include: { question: true },
        },
      },
    });
    if (!session) throw new NotFoundException('Session not found');

    return {
      session_id: session.id,
      student_name: session.student.full_name,
      nis: session.student.nis,
      class_name: session.student.class.name,
      essays: session.answers.map((a) => ({
        question_id: a.question_id,
        question_content: a.question.content,
        answer_text: a.answer_text,
        score: a.score,
        feedback: a.feedback,
      })),
    };
  }

  async regradeExam(examId: string, graderId?: string) {
    const exam = await this.prisma.exam.findUnique({
      where: { id: examId },
      select: { id: true, title: true },
    });
    if (!exam) throw new NotFoundException('Exam not found');

    const sessions = await this.prisma.examSession.findMany({
      where: {
        exam_id: examId,
        status: { in: [SessionStatus.SUBMITTED, SessionStatus.AUTO_SUBMITTED] },
      },
      include: {
        student: { select: { full_name: true, nis: true } },
        score: { select: { total_score: true } },
      },
    });

    return this.prisma.$transaction(async (tx) => {
      const settings = await tx.setting.findFirst({ select: { passing_grade: true } });
      const scoreChanges = [];

      for (const session of sessions) {
        const oldScore = session.score?.total_score ?? 0;
        const scoreData = await this.calculateTotalScore(tx, session.id, { forceReevaluate: true });

        await tx.score.upsert({
          where: { exam_session_id: session.id },
          create: {
            exam_session_id: session.id,
            ...scoreData,
            passing_grade_at_score: settings?.passing_grade ?? null,
            graded_by: graderId,
            graded_at: new Date(),
          },
          update: {
            ...scoreData,
            passing_grade_at_score: settings?.passing_grade ?? null,
            graded_by: graderId,
            graded_at: new Date(),
          },
        });

        scoreChanges.push({
          session_id: session.id,
          student_name: session.student?.full_name ?? '',
          nis: session.student?.nis ?? '',
          old_score: oldScore,
          new_score: scoreData.total_score,
        });
      }

      this.eventEmitter.emit('exam.regraded', { examId, graderId, count: sessions.length });

      return {
        total_sessions: sessions.length,
        regraded_count: scoreChanges.length,
        score_changes: scoreChanges,
      };
    });
  }

  async regradeSession(sessionId: string, graderId?: string) {
    const session = await this.prisma.examSession.findUnique({
      where: { id: sessionId },
      include: {
        student: { select: { full_name: true, nis: true } },
        score: { select: { total_score: true } },
      },
    });
    if (!session) throw new NotFoundException('Session not found');

    return this.prisma.$transaction(async (tx) => {
      const settings = await tx.setting.findFirst({ select: { passing_grade: true } });
      const oldScore = session.score?.total_score ?? 0;
      const scoreData = await this.calculateTotalScore(tx, session.id, { forceReevaluate: true });

      await tx.score.upsert({
        where: { exam_session_id: session.id },
        create: {
          exam_session_id: session.id,
          ...scoreData,
          passing_grade_at_score: settings?.passing_grade ?? null,
          graded_by: graderId,
          graded_at: new Date(),
        },
        update: {
          ...scoreData,
          passing_grade_at_score: settings?.passing_grade ?? null,
          graded_by: graderId,
          graded_at: new Date(),
        },
      });

      return {
        session_id: session.id,
        student_name: session.student?.full_name ?? '',
        nis: session.student?.nis ?? '',
        old_score: oldScore,
        new_score: scoreData.total_score,
      };
    });
  }
}
