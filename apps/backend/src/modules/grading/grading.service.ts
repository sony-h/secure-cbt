import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { GradeEssayDto, gradeEssaySchema, QuestionType, SessionStatus } from '@secure-cbt/shared';

@Injectable()
export class GradingService {
  constructor(private readonly prisma: PrismaService) {}

  async gradeEssay(dto: GradeEssayDto, graderId: string) {
    const { session_id, question_id, score, feedback } = gradeEssaySchema.parse(dto);

    const answer = await this.prisma.answer.findUnique({
      where: { exam_session_id_question_id: { exam_session_id: session_id, question_id } },
      include: { question: true },
    });
    if (!answer) throw new NotFoundException('Answer not found');
    if (answer.question.type !== QuestionType.ESSAY) throw new NotFoundException('Question is not an essay type');

    await this.prisma.answer.update({
      where: { id: answer.id },
      data: { score, is_correct: score >= 50 },
    });

    // Recalculate total score
    await this.calculateTotalScore(session_id, graderId);
    return { graded: true };
  }

  async calculateTotalScore(sessionId: string, graderId?: string) {
    const session = await this.prisma.examSession.findUnique({
      where: { id: sessionId },
      include: { answers: { include: { question: true } }, exam: { include: { exam_questions: true } } },
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
      } else {
        // Auto-grade objective questions
        const options = await this.prisma.questionOption.findMany({
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
        await this.prisma.answer.update({
          where: { id: answer.id },
          data: { is_correct: isCorrect, score: isCorrect ? 100 : 0 },
        });
      }
    }

    const totalQuestions = session.exam.exam_questions?.length || answers.length || 1;
    const finalScore = totalQuestions > 0 ? (totalScore / totalQuestions) : 0;

    await this.prisma.score.upsert({
      where: { exam_session_id: sessionId },
      create: {
        exam_session_id: sessionId,
        total_score: finalScore,
        correct_count: correctCount,
        wrong_count: wrongCount,
        essay_score: essayScore,
        graded_by: graderId,
        graded_at: new Date(),
      },
      update: {
        total_score: finalScore,
        correct_count: correctCount,
        wrong_count: wrongCount,
        essay_score: essayScore,
        graded_by: graderId,
        graded_at: new Date(),
      },
    });

    return { total_score: finalScore, correct_count: correctCount, wrong_count: wrongCount, essay_score: essayScore };
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
}
