import { BadRequestException, NotFoundException } from '@nestjs/common';
import { SessionService } from '../session.service';
import { SessionStatus, ExamStatus, SocketEvent } from '@secure-cbt/shared';
import { vi, describe, it, expect, beforeEach } from 'vitest';

function UUID() {
  return crypto.randomUUID?.() ?? '00000000-0000-0000-0000-000000000001';
}

function createMockPrisma() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mock: Record<string, any> = {
    user: { findUnique: vi.fn() },
    teacher: { findUnique: vi.fn() },
    student: { findUnique: vi.fn() },
    examSession: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    score: {
      deleteMany: vi.fn(),
    },
    sessionLog: {
      create: vi.fn(),
    },
    $transaction: vi.fn((fn: any) => fn(mock)),
  };
  return mock;
}

describe('SessionService.reopenSession()', () => {
  let service: SessionService;
  let mockPrisma: ReturnType<typeof createMockPrisma>;
  let mockEventEmitter: { emit: ReturnType<typeof vi.fn> };
  let mockGradingService: { calculateTotalScore: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    mockPrisma = createMockPrisma();
    mockEventEmitter = { emit: vi.fn() };
    mockGradingService = { calculateTotalScore: vi.fn() };
    service = new SessionService(
      mockPrisma as any,
      mockEventEmitter as any,
      mockGradingService as any,
    );
  });

  it('reopens SUBMITTED session within schedule, resets strikes, restores timer and logs event', async () => {
    const sessionId = UUID();
    const examId = UUID();
    const studentId = UUID();
    const proctorUserId = UUID();

    const mockSession = {
      id: sessionId,
      exam_id: examId,
      student_id: studentId,
      status: SessionStatus.SUBMITTED,
      remaining_time_seconds: 1200, // 20m
      warning_count: 2,
      exam: {
        id: examId,
        status: ExamStatus.ONGOING,
        end_at: new Date(Date.now() + 3600000), // 1 hour in future
      },
      student: {
        id: studentId,
        user_id: UUID(),
        full_name: 'Budi Santoso',
      },
    };

    mockPrisma.user.findUnique.mockResolvedValue({
      id: proctorUserId,
      full_name: 'Pak Guru Proktor',
      username: 'guru1',
    });
    mockPrisma.examSession.findUnique.mockResolvedValue(mockSession);
    mockPrisma.examSession.update.mockResolvedValue({
      ...mockSession,
      status: SessionStatus.ACTIVE,
      submitted_at: null,
      remaining_time_seconds: 1500, // 1200 + 5*60
      warning_count: 0,
    });

    const result = await service.reopenSession(
      sessionId,
      proctorUserId,
      {
        session_id: sessionId,
        additional_minutes: 5,
        reset_strikes: true,
      },
    );

    expect(result.status).toBe(SessionStatus.ACTIVE);
    expect(mockPrisma.score.deleteMany).toHaveBeenCalledWith({
      where: { exam_session_id: sessionId },
    });
    expect(mockPrisma.sessionLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        exam_session_id: sessionId,
        event: 'SESSION_REOPENED',
      }),
    });
    expect(mockEventEmitter.emit).toHaveBeenCalledWith(
      SocketEvent.SESSION_REOPENED,
      expect.objectContaining({
        sessionId,
        examId,
        studentId,
        remainingTimeSeconds: 1500,
        warningCount: 0,
      }),
    );
  });

  it('throws BadRequestException if exam schedule has already ended', async () => {
    const sessionId = UUID();
    const proctorUserId = UUID();

    mockPrisma.user.findUnique.mockResolvedValue({ id: proctorUserId, full_name: 'Proctor' });
    mockPrisma.examSession.findUnique.mockResolvedValue({
      id: sessionId,
      status: SessionStatus.SUBMITTED,
      exam: {
        status: ExamStatus.FINISHED,
        end_at: new Date(Date.now() - 60000), // Ended 1m ago
      },
      student: { id: UUID(), full_name: 'Student' },
    });

    await expect(
      service.reopenSession(sessionId, proctorUserId, {
        session_id: sessionId,
        reset_strikes: true,
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('throws BadRequestException if session is already ACTIVE', async () => {
    const sessionId = UUID();
    const proctorUserId = UUID();

    mockPrisma.user.findUnique.mockResolvedValue({ id: proctorUserId, full_name: 'Proctor' });
    mockPrisma.examSession.findUnique.mockResolvedValue({
      id: sessionId,
      status: SessionStatus.ACTIVE,
      exam: {
        status: ExamStatus.ONGOING,
        end_at: new Date(Date.now() + 3600000),
      },
      student: { id: UUID(), full_name: 'Student' },
    });

    await expect(
      service.reopenSession(sessionId, proctorUserId, {
        session_id: sessionId,
        reset_strikes: true,
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('reopens AUTO_SUBMITTED session and resets strikes to prevent auto-submit loop', async () => {
    const sessionId = UUID();
    const examId = UUID();
    const studentId = UUID();
    const proctorUserId = UUID();

    const mockSession = {
      id: sessionId,
      exam_id: examId,
      student_id: studentId,
      status: SessionStatus.AUTO_SUBMITTED,
      remaining_time_seconds: 600,
      warning_count: 3,
      exam: {
        id: examId,
        status: ExamStatus.ONGOING,
        end_at: new Date(Date.now() + 3600000),
      },
      student: {
        id: studentId,
        user_id: UUID(),
        full_name: 'Citra Dewi',
      },
    };

    mockPrisma.user.findUnique.mockResolvedValue({ id: proctorUserId, full_name: 'Proctor' });
    mockPrisma.examSession.findUnique.mockResolvedValue(mockSession);
    mockPrisma.examSession.update.mockResolvedValue({
      ...mockSession,
      status: SessionStatus.ACTIVE,
      submitted_at: null,
      remaining_time_seconds: 600,
      warning_count: 0,
    });

    const result = await service.reopenSession(
      sessionId,
      proctorUserId,
      {
        session_id: sessionId,
        reset_strikes: true,
      },
    );

    expect(result.status).toBe(SessionStatus.ACTIVE);
    expect(mockEventEmitter.emit).toHaveBeenCalledWith(
      SocketEvent.SESSION_REOPENED,
      expect.objectContaining({
        warningCount: 0,
      }),
    );
  });
});
