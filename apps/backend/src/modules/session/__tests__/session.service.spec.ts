import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { SessionService } from '../session.service';
import { GradingService } from '../../grading/grading.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { SessionStatus, ExamStatus } from '@secure-cbt/shared';
import { vi, describe, it, expect, beforeEach } from 'vitest';

function UUID() { return crypto.randomUUID?.() ?? '00000000-0000-0000-0000-000000000001'; }

function createMockPrisma() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mock: Record<string, any> = {
    examToken: { findUnique: vi.fn() },
    student: { findUnique: vi.fn() },
    examClass: { findFirst: vi.fn() },
    examSession: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    examPackage: { findMany: vi.fn() },
    exam: { update: vi.fn() },
    answer: { upsert: vi.fn() },
    questionOption: { findMany: vi.fn() },
    score: { upsert: vi.fn() },
    $transaction: vi.fn((fn: any) => fn(mock)),
  };
  return mock;
}

describe('SessionService', () => {
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

  describe('start()', () => {
    it('should throw BadRequestException for already completed exam', async () => {
      const examId = UUID();
      mockPrisma.examToken.findUnique.mockResolvedValue({
        id: UUID(),
        token: 'TOKEN1234',
        expires_at: new Date(Date.now() + 3600000),
        exam: {
          id: examId,
          status: ExamStatus.PUBLISHED,
          start_at: new Date(Date.now() - 3600000),
          end_at: new Date(Date.now() + 3600000),
          randomize_questions: false,
          randomize_answers: false,
          duration_minutes: 60,
        },
      });
      mockPrisma.student.findUnique.mockResolvedValue({ id: UUID(), class_id: UUID() });
      mockPrisma.examClass.findFirst.mockResolvedValue({ id: UUID() });
      mockPrisma.examSession.findFirst
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ id: UUID(), status: SessionStatus.SUBMITTED });

      await expect(
        service.start({ token: 'TOKEN1234', device_id: 'device-1' }, 'user-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should create a new session for valid token', async () => {
      const examId = UUID();
      const studentId = UUID();
      mockPrisma.examToken.findUnique.mockResolvedValue({
        id: UUID(),
        token: 'TOKEN1234',
        expires_at: new Date(Date.now() + 3600000),
        exam: {
          id: examId,
          status: ExamStatus.PUBLISHED,
          start_at: new Date(Date.now() - 3600000),
          end_at: new Date(Date.now() + 3600000),
          randomize_questions: false,
          randomize_answers: false,
          duration_minutes: 60,
        },
      });
      mockPrisma.student.findUnique.mockResolvedValue({ id: studentId, class_id: UUID() });
      mockPrisma.examClass.findFirst.mockResolvedValue({ id: UUID() });
      mockPrisma.examSession.findFirst
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null);
      mockPrisma.examPackage.findMany.mockResolvedValue([]);
      mockPrisma.examSession.create.mockResolvedValue({
        id: 'new-session',
        exam_id: examId,
        status: SessionStatus.ACTIVE,
        exam: { exam_questions: [], randomize_questions: false, randomize_answers: false },
      });

      const result = await service.start({ token: 'TOKEN1234', device_id: 'device-1' }, 'user-1');
      expect(mockPrisma.examSession.create).toHaveBeenCalled();
      expect(result.id).toBe('new-session');
    });
  });

  describe('resume()', () => {
    it('should return persisted question order', async () => {
      const studentId = UUID();
      mockPrisma.student.findUnique.mockResolvedValue({ id: studentId });
      mockPrisma.examSession.findUnique.mockResolvedValue({
        id: UUID(),
        student_id: studentId,
        status: SessionStatus.ACTIVE,
        package_id: null,
        question_order: ['eq-1', 'eq-2'],
        exam: {
          randomize_questions: true,
          randomize_answers: false,
          exam_questions: [
            { id: 'eq-1', position: 1, package_id: null, question: { id: UUID(), type: 'MULTIPLE_CHOICE', content: 'Q1', options: [] } },
            { id: 'eq-2', position: 2, package_id: null, question: { id: UUID(), type: 'MULTIPLE_CHOICE', content: 'Q2', options: [] } },
          ],
        },
        package: null,
      });
      mockPrisma.examSession.update.mockResolvedValue({});

      const result = await service.resume({ session_id: UUID() }, 'user-1');
      expect(mockPrisma.examSession.update).toHaveBeenCalled();
      expect(result.questions).toHaveLength(2);
    });

    it('should throw for completed sessions', async () => {
      const studentId = UUID();
      mockPrisma.student.findUnique.mockResolvedValue({ id: studentId });
      mockPrisma.examSession.findUnique.mockResolvedValue({
        id: UUID(),
        student_id: studentId,
        status: SessionStatus.SUBMITTED,
      });

      await expect(
        service.resume({ session_id: UUID() }, 'user-1'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('submit()', () => {
    it('should be wrapped in transaction', async () => {
      const studentId = UUID();
      const sessionId = UUID();
      mockPrisma.student.findUnique.mockResolvedValue({ id: studentId });
      mockPrisma.examSession.findUnique.mockResolvedValue({
        id: sessionId,
        student_id: studentId,
        exam_id: UUID(),
        status: SessionStatus.ACTIVE,
        student: { full_name: 'Test Student' },
      });

      mockPrisma.$transaction.mockImplementation(async (fn: any) => {
        const tx = { ...mockPrisma };
        tx.examSession = {
          update: vi.fn().mockResolvedValue({ id: sessionId, status: 'SUBMITTED' }),
        };
        tx.score = { upsert: vi.fn().mockResolvedValue({}) };
        return fn(tx);
      });

      mockGradingService.calculateTotalScore.mockResolvedValue({
        total_score: 80, correct_count: 8, wrong_count: 2, essay_score: 0, total_questions: 10,
      });

      const result = await service.submit({ session_id: sessionId }, 'user-1');
      expect(mockPrisma.$transaction).toHaveBeenCalled();
      expect(result.status).toBe('SUBMITTED');
    });
  });

  describe('autoSubmit()', () => {
    it('should be wrapped in transaction', async () => {
      const sessionId = UUID();
      mockPrisma.examSession.findUnique.mockResolvedValue({
        id: sessionId,
        student_id: UUID(),
        exam_id: UUID(),
        status: SessionStatus.ACTIVE,
        student: { full_name: 'Test Student' },
      });

      mockPrisma.$transaction.mockImplementation(async (fn: any) => {
        const tx = { ...mockPrisma };
        tx.examSession = {
          update: vi.fn().mockResolvedValue({ id: sessionId, status: 'AUTO_SUBMITTED' }),
        };
        tx.score = { upsert: vi.fn().mockResolvedValue({}) };
        return fn(tx);
      });

      mockGradingService.calculateTotalScore.mockResolvedValue({
        total_score: 70, correct_count: 7, wrong_count: 3, essay_score: 0, total_questions: 10,
      });

      const result = await service.autoSubmit(sessionId);
      expect(mockPrisma.$transaction).toHaveBeenCalled();
      expect(result!.status).toBe('AUTO_SUBMITTED');
    });

    it('should return undefined if session not found or not active', async () => {
      mockPrisma.examSession.findUnique.mockResolvedValue(null);
      const result = await service.autoSubmit(UUID());
      expect(result).toBeUndefined();
    });
  });
});
