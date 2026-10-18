import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SessionService } from '../session.service';
import { SessionStatus, ExamStatus, SocketEvent } from '@secure-cbt/shared';

describe('SessionService - autoSubmitExpiredSessions', () => {
  let service: SessionService;
  let mockPrisma: any;
  let mockGradingService: any;
  let mockEventEmitter: any;
  let mockQueue: any;

  beforeEach(() => {
    mockPrisma = {
      examSession: {
        findMany: vi.fn(),
        update: vi.fn(),
      },
      sessionLog: {
        create: vi.fn(),
      },
      score: {
        upsert: vi.fn(),
      },
      setting: {
        findFirst: vi.fn().mockResolvedValue({ passing_grade: 75 }),
      },
      $transaction: vi.fn(async (cb) => {
        return cb(mockPrisma);
      }),
    };

    mockGradingService = {
      calculateTotalScore: vi.fn().mockResolvedValue({
        total_score: 80,
        multiple_choice_score: 80,
        essay_score: 0,
        is_passed: true,
      }),
    };

    mockEventEmitter = {
      emit: vi.fn(),
    };

    mockQueue = {
      add: vi.fn(),
    };

    service = new SessionService(
      mockPrisma,
      mockEventEmitter,
      mockGradingService,
    );
  });

  it('submits sessions that exceeded duration and emits SESSION_FINISHED', async () => {
    const now = new Date('2026-10-18T10:00:00.000Z');
    // Session started 70 minutes ago, exam duration is 60 minutes
    const startedAt = new Date('2026-10-18T08:50:00.000Z');

    const expiredSession = {
      id: 'session-expired-1',
      exam_id: 'exam-1',
      student_id: 'student-1',
      status: SessionStatus.ACTIVE,
      started_at: startedAt,
      updated_at: startedAt,
      remaining_time_seconds: 0,
      exam: {
        id: 'exam-1',
        duration_minutes: 60,
        end_at: new Date('2026-10-18T12:00:00.000Z'),
        status: ExamStatus.ONGOING,
      },
      student: {
        full_name: 'Budi Santoso',
        user_id: 'user-student-1',
      },
    };

    const activeSession = {
      id: 'session-active-2',
      exam_id: 'exam-1',
      student_id: 'student-2',
      status: SessionStatus.ACTIVE,
      started_at: new Date('2026-10-18T09:40:00.000Z'), // 20 mins ago
      updated_at: new Date('2026-10-18T09:40:00.000Z'),
      remaining_time_seconds: 2400,
      exam: {
        id: 'exam-1',
        duration_minutes: 60,
        end_at: new Date('2026-10-18T12:00:00.000Z'),
        status: ExamStatus.ONGOING,
      },
      student: {
        full_name: 'Siti Rahma',
        user_id: 'user-student-2',
      },
    };

    mockPrisma.examSession.findMany.mockResolvedValue([expiredSession, activeSession]);

    const result = await service.autoSubmitExpiredSessions(now);

    expect(result.submittedCount).toBe(1);
    expect(mockPrisma.examSession.update).toHaveBeenCalledWith({
      where: { id: 'session-expired-1' },
      data: expect.objectContaining({
        status: SessionStatus.AUTO_SUBMITTED,
        submitted_at: now,
        remaining_time_seconds: 0,
      }),
    });
    expect(mockPrisma.sessionLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        exam_session_id: 'session-expired-1',
        event: 'SYSTEM',
        description: expect.stringContaining('AUTO_SUBMIT_SYSTEM_TIMEOUT'),
      }),
    });
    expect(mockEventEmitter.emit).toHaveBeenCalledWith(
      SocketEvent.SESSION_FINISHED,
      expect.objectContaining({
        sessionId: 'session-expired-1',
        studentName: 'Budi Santoso',
      }),
    );
  });
});
