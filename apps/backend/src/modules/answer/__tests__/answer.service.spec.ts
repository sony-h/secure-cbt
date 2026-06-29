import { ForbiddenException, BadRequestException } from '@nestjs/common';
import { AnswerService } from '../answer.service';
import { SessionStatus } from '@secure-cbt/shared';
import { vi, describe, it, expect, beforeEach } from 'vitest';

function UUID() { return crypto.randomUUID?.() ?? '00000000-0000-0000-0000-000000000001'; }

describe('AnswerService', () => {
  let service: AnswerService;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      student: { findUnique: vi.fn() },
      examSession: { findUnique: vi.fn() },
      examQuestion: { findFirst: vi.fn() },
      answer: { upsert: vi.fn() },
      $transaction: vi.fn((fn: any) => fn(mockPrisma)),
    };
    service = new AnswerService(mockPrisma as any);
  });

  describe('batchSync()', () => {
    it('should wrap upsert loop in transaction', async () => {
      const studentId = UUID();
      const sessionId = UUID();
      mockPrisma.student.findUnique.mockResolvedValue({ id: studentId });
      mockPrisma.examSession.findUnique.mockResolvedValue({
        id: sessionId,
        student_id: studentId,
        status: SessionStatus.ACTIVE,
        exam_id: UUID(),
      });
      mockPrisma.$transaction.mockImplementation(async (fn: any) => {
        const tx = { ...mockPrisma };
        tx.answer = { upsert: vi.fn().mockResolvedValue({}) };
        return fn(tx);
      });

      const result = await service.batchSync({
        session_id: sessionId,
        answers: [
          { question_id: UUID(), answer_text: 'A', timestamp: new Date().toISOString() },
          { question_id: UUID(), answer_text: 'B', timestamp: new Date().toISOString() },
        ],
      }, 'user-1');

      expect(mockPrisma.$transaction).toHaveBeenCalled();
      expect(result).toEqual({ synced: 2 });
    });

    it('should throw ForbiddenException if not own session', async () => {
      mockPrisma.student.findUnique.mockResolvedValue({ id: UUID() });
      mockPrisma.examSession.findUnique.mockResolvedValue({
        id: UUID(),
        student_id: 'other-student-id',
        status: SessionStatus.ACTIVE,
      });

      await expect(
        service.batchSync({
          session_id: UUID(),
          answers: [{ question_id: UUID(), answer_text: 'A', timestamp: new Date().toISOString() }],
        }, 'user-1'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException if session is not active', async () => {
      const studentId = UUID();
      mockPrisma.student.findUnique.mockResolvedValue({ id: studentId });
      mockPrisma.examSession.findUnique.mockResolvedValue({
        id: UUID(),
        student_id: studentId,
        status: SessionStatus.SUBMITTED,
      });

      await expect(
        service.batchSync({
          session_id: UUID(),
          answers: [{ question_id: UUID(), answer_text: 'A', timestamp: new Date().toISOString() }],
        }, 'user-1'),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
