import { Injectable, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../prisma/prisma.service';
import { GradeEssayInput, gradeEssaySchema, QuestionType, SessionStatus, SocketEvent } from '@secure-cbt/shared';
import { Prisma } from '@prisma/client';

@Injectable()
export class GradingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async gradeEssay(dto: GradeEssayInput, graderId: string) {
    const { session_id, question_id, score, feedback } = gradeEssaySchema.parse(dto);

    return await this.prisma.$transaction(async (tx) => {
      const answer = await tx.answer.findUnique({
        where: { exam_session_id_question_id: { exam_session_id: session_id, question_id } },
        include: { question: true },
      });
      if (!answer) throw new NotFoundException('Answer not found');
      if (answer.question.type !== QuestionType.ESSAY) throw new NotFoundException('Question is not an essay type');

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

  async calculateTotalScore(tx: Prisma.TransactionClient, sessionId: string) {
    const session = await tx.examSession.findUnique({
      where: { id: sessionId },
      include: {
        answers: { include: { question: true } },
        package: true,
        exam: { include: { exam_questions: { select: { id: true, package_id: true } } } },
      },
    });
    if (!session) throw new NotFoundException('Session not found');

    const answers = session.answers;
    let totalScore = 0;
    let correctCount = 0;
    let wrongCount = 0;
    let essayScore = 0;

    for (const answer of answers) {
      if (answer.question.type === QuestionType.ESSAY) {
        if (answer.score !== null) {
          essayScore += answer.score;
          totalScore += answer.score;
          if (answer.score >= 50) correctCount++;
          else wrongCount++;
        }
      } else if (answer.score === null) {
        const options = await tx.questionOption.findMany({
          where: { question_id: answer.question_id, is_correct: true },
        });
        const correctOptionIds = options.map((o) => o.id);
        const studentAnswerIds = answer.answer_text?.split(',').filter(Boolean) ?? [];

        const isCorrect = correctOptionIds.length === studentAnswerIds.length &&
          correctOptionIds.every((id) => studentAnswerIds.includes(id));

        if (isCorrect) {
          correctCount++;
          totalScore += 100;
        } else {
          wrongCount++;
        }
        await tx.answer.update({
          where: { id: answer.id },
          data: { is_correct: isCorrect, score: isCorrect ? 100 : 0 },
        });
      } else if (answer.is_correct) {
        correctCount++;
        totalScore += 100;
      } else {
        wrongCount++;
      }
    }

    const examQuestions = session.exam.exam_questions;
    const packageId = session.package_id;
    const studentQuestionCount = packageId
      ? examQuestions.filter((eq) => eq.package_id === packageId).length
      : examQuestions.length;
    const totalQuestions = studentQuestionCount || answers.length || 1;
    const finalScore = totalQuestions > 0 ? (totalScore / totalQuestions) : 0;

    return {
      total_score: finalScore,
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

    return {
      session_id: sessionId,
      student_id: score.exam_session.student_id,
      student_name: score.exam_session.student.full_name,
      exam_title: score.exam_session.exam.title,
      total_score: score.total_score,
      correct_count: score.correct_count,
      wrong_count: score.wrong_count,
      essay_score: score.essay_score,
      graded_at: score.graded_at?.toISOString(),
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

  async getPendingEssays(examId: string, classId?: string) {
    const where: any = {
      exam_id: examId,
      status: { in: [SessionStatus.SUBMITTED, SessionStatus.AUTO_SUBMITTED] },
      answers: {
        some: {
          question: { type: QuestionType.ESSAY },
          score: null,
        },
      },
    };
    if (classId) where.student = { class_id: classId };

    const sessions = await this.prisma.examSession.findMany({
      where,
      include: {
        student: { include: { class: true } },
        answers: {
          where: { question: { type: QuestionType.ESSAY }, score: null },
          include: { question: true },
        },
      },
    });

    return sessions.map((s) => ({
      session_id: s.id,
      student_name: s.student.full_name,
      nis: s.student.nis,
      class_name: s.student.class.name,
      pending_count: s.answers.length,
    }));
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
}
