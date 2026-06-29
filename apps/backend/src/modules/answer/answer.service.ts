import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { SaveAnswerDto, BatchSyncAnswerDto, saveAnswerSchema, batchSyncAnswerSchema, SessionStatus } from '@secure-cbt/shared';

@Injectable()
export class AnswerService {
  constructor(private readonly prisma: PrismaService) {}

  async save(dto: SaveAnswerDto, userId: string) {
    const { session_id, question_id, answer_text, timestamp } = saveAnswerSchema.parse(dto);

    const student = await this.prisma.student.findUnique({ where: { user_id: userId } });
    if (!student) throw new NotFoundException('Student not found');

    const session = await this.prisma.examSession.findUnique({ where: { id: session_id } });
    if (!session) throw new NotFoundException('Session not found');
    if (session.student_id !== student.id) throw new ForbiddenException('Not your session');
    if (session.status !== SessionStatus.ACTIVE) throw new BadRequestException('Session is not active');

    // Check if question belongs to this exam
    const examQuestion = await this.prisma.examQuestion.findFirst({
      where: { exam_id: session.exam_id, question_id },
    });
    if (!examQuestion) throw new BadRequestException('Question not in this exam');

    const answeredAt = timestamp ? new Date(timestamp) : new Date();

    const answer = await this.prisma.answer.upsert({
      where: {
        exam_session_id_question_id: { exam_session_id: session_id, question_id },
      },
      create: {
        exam_session_id: session_id,
        question_id,
        answer_text,
        answered_at: answeredAt,
        synced_at: new Date(),
      },
      update: {
        answer_text,
        answered_at: answeredAt,
        synced_at: new Date(),
      },
    });

    return answer;
  }

  async batchSync(dto: BatchSyncAnswerDto, userId: string) {
    const { session_id, answers } = batchSyncAnswerSchema.parse(dto);

    const student = await this.prisma.student.findUnique({ where: { user_id: userId } });
    if (!student) throw new NotFoundException('Student not found');

    const session = await this.prisma.examSession.findUnique({ where: { id: session_id } });
    if (!session) throw new NotFoundException('Session not found');
    if (session.student_id !== student.id) throw new ForbiddenException('Not your session');
    if (session.status !== SessionStatus.ACTIVE) throw new BadRequestException('Session is not active');

    await this.prisma.$transaction(async (tx) => {
      for (const ans of answers) {
        await tx.answer.upsert({
          where: {
            exam_session_id_question_id: { exam_session_id: session_id, question_id: ans.question_id },
          },
          create: {
            exam_session_id: session_id,
            question_id: ans.question_id,
            answer_text: ans.answer_text,
            answered_at: new Date(ans.timestamp),
            synced_at: new Date(),
          },
          update: {
            answer_text: ans.answer_text,
            answered_at: new Date(ans.timestamp),
            synced_at: new Date(),
          },
        });
      }
    });

    return { synced: answers.length };
  }

  async getSyncStatus(sessionId: string, userId: string) {
    const student = await this.prisma.student.findUnique({ where: { user_id: userId } });
    if (!student) throw new NotFoundException('Student not found');

    const session = await this.prisma.examSession.findUnique({
      where: { id: sessionId },
      include: {
        answers: true,
        exam: { include: { exam_questions: true } },
      },
    });
    if (!session || session.student_id !== student.id) throw new NotFoundException('Session not found');

    const totalQuestions = session.exam.exam_questions.length;
    const syncedAnswers = session.answers.filter((a) => a.synced_at).length;
    const pendingAnswers = session.answers.filter((a) => !a.synced_at).length;

    return {
      total_answers: totalQuestions,
      synced_answers: syncedAnswers,
      pending_answers: pendingAnswers,
      last_synced_at: session.answers
        .filter((a) => a.synced_at)
        .sort((a, b) => (b.synced_at?.getTime() ?? 0) - (a.synced_at?.getTime() ?? 0))[0]?.synced_at,
    };
  }
}
