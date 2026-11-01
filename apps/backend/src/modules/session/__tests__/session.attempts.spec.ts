import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { SessionService } from '../session.service';
import { SessionStatus, SessionType, ExamStatus, SocketEvent } from '@secure-cbt/shared';
import { vi, describe, it, expect, beforeEach } from 'vitest';

function UUID() {
  return crypto.randomUUID?.() ?? '00000000-0000-0000-0000-000000000001';
}

function createMockPrisma() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mock: Record<string, any> = {
    user: { findUnique: vi.fn() },
    examToken: { findUnique: vi.fn() },
    student: { findUnique: vi.fn() },
    examClass: { findFirst: vi.fn() },
    examPackage: { findMany: vi.fn() },
    examQuestion: { findMany: vi.fn() },
    exam: { update: vi.fn(), findUnique: vi.fn() },
    examSession: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    sessionLog: {
      create: vi.fn(),
      createMany: vi.fn(),
    },
    $transaction: vi.fn((fn: any) => fn(mock)),
  };
  return mock;
}

describe('SessionService - Multiple Attempts Lifecycle', () => {
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

  describe('start() multi-attempt support', () => {
    it('allows starting Attempt #2 when max_attempts is 3 and Attempt #1 is completed', async () => {
      const examId = UUID();
      const studentId = UUID();
      const userId = UUID();
      const pkgId = UUID();

      mockPrisma.student.findUnique.mockResolvedValue({ id: studentId, class_id: 'class-1', user_id: userId });
      mockPrisma.examToken.findUnique.mockResolvedValue({
        token: 'TOKEN123',
        exam_id: examId,
        expires_at: new Date(Date.now() + 3600000),
        exam: {
          id: examId,
          max_attempts: 3,
          duration_minutes: 60,
          start_at: new Date(Date.now() - 10000),
          end_at: new Date(Date.now() + 3600000),
          status: ExamStatus.PUBLISHED,
          is_random_pool: false,
          exam_questions: [],
        },
      });
      mockPrisma.examClass.findFirst.mockResolvedValue({ id: 'ec-1' });

      // There is 1 completed session (attempt 1)
      mockPrisma.examSession.findMany.mockResolvedValue([
        { id: 'ses-1', attempt_number: 1, status: SessionStatus.SUBMITTED, extra_attempts_allowed: 0 },
      ]);
      mockPrisma.examSession.findFirst.mockResolvedValue(null);
      mockPrisma.examPackage.findMany.mockResolvedValue([{ id: pkgId }]);
      mockPrisma.exam.update.mockResolvedValue({});
      mockPrisma.examSession.create.mockResolvedValue({
        id: 'ses-2',
        attempt_number: 2,
        session_type: SessionType.MAIN,
        status: SessionStatus.ACTIVE,
        exam: {
          exam_questions: [],
        },
      });

      const res = await service.start({ token: 'TOKEN123', exam_id: examId, device_id: 'dev-1' } as any, userId);
      expect(res.attempt_number).toBe(2);
      expect(mockPrisma.examSession.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            attempt_number: 2,
            session_type: SessionType.MAIN,
          }),
        }),
      );
    });

    it('throws BadRequestException when student attempts to start beyond max_attempts without extra grants', async () => {
      const examId = UUID();
      const studentId = UUID();
      const userId = UUID();

      mockPrisma.student.findUnique.mockResolvedValue({ id: studentId, class_id: 'class-1', user_id: userId });
      mockPrisma.examToken.findUnique.mockResolvedValue({
        token: 'TOKEN123',
        exam_id: examId,
        expires_at: new Date(Date.now() + 3600000),
        exam: {
          id: examId,
          max_attempts: 2,
          duration_minutes: 60,
          start_at: new Date(Date.now() - 10000),
          end_at: new Date(Date.now() + 3600000),
          status: ExamStatus.PUBLISHED,
          is_random_pool: false,
          exam_questions: [],
        },
      });
      mockPrisma.examClass.findFirst.mockResolvedValue({ id: 'ec-1' });

      // Two completed sessions (attempt 1 and 2), max_attempts is 2
      mockPrisma.examSession.findMany.mockResolvedValue([
        { id: 'ses-1', attempt_number: 1, status: SessionStatus.SUBMITTED, extra_attempts_allowed: 0 },
        { id: 'ses-2', attempt_number: 2, status: SessionStatus.SUBMITTED, extra_attempts_allowed: 0 },
      ]);
      mockPrisma.examSession.findFirst.mockResolvedValue(null);

      await expect(
        service.start({ token: 'TOKEN123', exam_id: examId, device_id: 'dev-1' } as any, userId),
      ).rejects.toThrow(BadRequestException);
    });

    it('allows starting Attempt #3 when max_attempts is 2 but proctor granted extra attempt', async () => {
      const examId = UUID();
      const studentId = UUID();
      const userId = UUID();
      const pkgId = UUID();

      mockPrisma.student.findUnique.mockResolvedValue({ id: studentId, class_id: 'class-1', user_id: userId });
      mockPrisma.examToken.findUnique.mockResolvedValue({
        token: 'TOKEN123',
        exam_id: examId,
        expires_at: new Date(Date.now() + 3600000),
        exam: {
          id: examId,
          max_attempts: 2,
          duration_minutes: 60,
          start_at: new Date(Date.now() - 10000),
          end_at: new Date(Date.now() + 3600000),
          status: ExamStatus.PUBLISHED,
          is_random_pool: false,
          exam_questions: [],
        },
      });
      mockPrisma.examClass.findFirst.mockResolvedValue({ id: 'ec-1' });

      // Two completed sessions, but attempt 2 has extra_attempts_allowed: 1
      mockPrisma.examSession.findMany.mockResolvedValue([
        { id: 'ses-1', attempt_number: 1, status: SessionStatus.SUBMITTED, extra_attempts_allowed: 0 },
        { id: 'ses-2', attempt_number: 2, status: SessionStatus.SUBMITTED, extra_attempts_allowed: 1 },
      ]);
      mockPrisma.examSession.findFirst.mockResolvedValue(null);
      mockPrisma.examPackage.findMany.mockResolvedValue([{ id: pkgId }]);
      mockPrisma.exam.update.mockResolvedValue({});
      mockPrisma.examSession.create.mockResolvedValue({
        id: 'ses-3',
        attempt_number: 3,
        session_type: SessionType.MAIN,
        status: SessionStatus.ACTIVE,
        exam: { exam_questions: [] },
      });

      const res = await service.start({ token: 'TOKEN123', exam_id: examId, device_id: 'dev-1' } as any, userId);
      expect(res.attempt_number).toBe(3);
    });
  });

  describe('getReview() anti-cheat guards', () => {
    it('locks review solutions if exam schedule is not finished even if student completed an attempt', async () => {
      const sessionId = UUID();
      const studentId = UUID();
      const userId = UUID();
      const examId = UUID();

      mockPrisma.student.findUnique.mockResolvedValue({ id: studentId, user_id: userId });
      mockPrisma.examSession.findUnique.mockResolvedValue({
        id: sessionId,
        student_id: studentId,
        status: SessionStatus.SUBMITTED,
        attempt_number: 1,
        exam_id: examId,
        exam: {
          id: examId,
          title: 'UTS Fisika',
          status: ExamStatus.ONGOING,
          end_at: new Date(Date.now() + 3600000), // active!
          max_attempts: 3,
          show_results: true,
          exam_questions: [],
        },
        answers: [],
        score: { total_score: 85 },
      });

      await expect(service.getReview(sessionId, userId)).rejects.toThrow(ForbiddenException);
    });
  });
});
