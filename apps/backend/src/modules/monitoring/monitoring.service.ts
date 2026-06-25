import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { SessionStatus } from '@secure-cbt/shared';

@Injectable()
export class MonitoringService {
  constructor(private readonly prisma: PrismaService) {}

  async getExamMonitoring(examId: string) {
    const exam = await this.prisma.exam.findFirst({
      where: { id: examId, deleted_at: null },
      include: { subject: true },
    });
    if (!exam) throw new NotFoundException('Exam not found');

    const sessions = await this.prisma.examSession.findMany({
      where: { exam_id: examId },
      include: {
        student: { include: { class: true } },
      },
    });

    const students = sessions.map((s) => ({
      session_id: s.id,
      student_id: s.student_id,
      student_user_id: s.student.user_id,
      nis: s.student.nis,
      student_name: s.student.full_name,
      class_name: s.student.class.name,
      status: s.status === SessionStatus.ACTIVE ? 'active' : s.status === SessionStatus.SUBMITTED ? 'finished' : 'disconnected',
      progress: { answered: 0, total: 0 }, // Will be populated below
      remaining_time_seconds: s.remaining_time_seconds ?? 0,
      warning_count: s.warning_count,
      last_activity_at: s.updated_at.toISOString(),
    }));

    // Get answer counts for each session
    for (const student of students) {
      const answerCount = await this.prisma.answer.count({ where: { exam_session_id: student.session_id } });
      const questionCount = await this.prisma.examQuestion.count({ where: { exam_id: examId } });
      student.progress = { answered: answerCount, total: questionCount };
    }

    return {
      exam_id: exam.id,
      title: exam.title,
      total_students: students.length,
      online_count: students.filter((s) => s.status === 'active').length,
      disconnected_count: students.filter((s) => s.status === 'disconnected').length,
      finished_count: students.filter((s) => s.status === 'finished').length,
      warned_count: students.filter((s) => s.warning_count > 0).length,
      students,
    };
  }

  async getSessionLogs(sessionId: string) {
    const session = await this.prisma.examSession.findUnique({ where: { id: sessionId } });
    if (!session) throw new NotFoundException('Session not found');

    return this.prisma.sessionLog.findMany({
      where: { exam_session_id: sessionId },
      orderBy: { created_at: 'desc' },
    });
  }

  async logEvent(sessionId: string, event: string, description?: string) {
    return this.prisma.sessionLog.create({
      data: { exam_session_id: sessionId, event, description },
    });
  }

  async incrementWarning(sessionId: string) {
    const session = await this.prisma.examSession.findUnique({ where: { id: sessionId } });
    if (!session) throw new NotFoundException('Session not found');

    const updated = await this.prisma.examSession.update({
      where: { id: sessionId },
      data: { warning_count: { increment: 1 } },
    });

    // Check if warning limit exceeded
    const exam = await this.prisma.exam.findUnique({ where: { id: session.exam_id } });
    if (exam && updated.warning_count >= exam.warning_limit && exam.auto_submit_enabled) {
      // Auto-submit will be handled by the SessionService
    }

    return updated;
  }
}
