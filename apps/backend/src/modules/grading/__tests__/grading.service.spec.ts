import { NotFoundException } from '@nestjs/common';
import { GradingService } from '../grading.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { QuestionType } from '@secure-cbt/shared';
import { vi, describe, it, expect, beforeEach } from 'vitest';

function UUID() { return crypto.randomUUID?.() ?? '00000000-0000-0000-0000-000000000001'; }

describe('GradingService', () => {
  let service: GradingService;
  let mockPrisma: any;
  let mockEventEmitter: { emit: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    mockPrisma = {
      answer: { findUnique: vi.fn(), update: vi.fn() },
      examSession: { findUnique: vi.fn() },
      questionOption: { findMany: vi.fn() },
      score: { upsert: vi.fn(), findFirst: vi.fn() },
      $transaction: vi.fn((fn: any) => fn(mockPrisma)),
    };
    mockEventEmitter = { emit: vi.fn() };
    service = new GradingService(mockPrisma as any, mockEventEmitter as any);
  });

  describe('gradeEssay()', () => {
    it('should update answer score and call calculateTotalScore in transaction', async () => {
      const answerId = UUID();
      mockPrisma.answer.findUnique.mockResolvedValue({
        id: answerId,
        question: { type: QuestionType.ESSAY },
      });
      mockPrisma.answer.update.mockResolvedValue({});
      mockPrisma.examSession.findUnique.mockResolvedValue({
        id: UUID(), answers: [], package: null, exam: { exam_questions: [] },
      });
      mockPrisma.score.upsert.mockResolvedValue({});

      const result = await service.gradeEssay(
        { session_id: UUID(), question_id: UUID(), score: 80, feedback: 'Good answer' },
        UUID(),
      );

      expect(mockPrisma.$transaction).toHaveBeenCalled();
      expect(mockPrisma.answer.update).toHaveBeenCalledWith({
        where: { id: answerId },
        data: { score: 80, is_correct: true, feedback: 'Good answer' },
      });
      expect(result).toEqual({ graded: true });
    });

    it('should throw NotFoundException if answer not found', async () => {
      mockPrisma.answer.findUnique.mockResolvedValue(null);

      await expect(
        service.gradeEssay({ session_id: UUID(), question_id: UUID(), score: 80 }, UUID()),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('calculateTotalScore()', () => {
    it('should auto-grade objective questions using PrismaTransactionClient', async () => {
      const tx = {
        examSession: { findUnique: vi.fn() },
        questionOption: { findMany: vi.fn() },
        answer: { update: vi.fn() },
      };
      const questionId = UUID();
      tx.examSession.findUnique.mockResolvedValue({
        id: UUID(), package_id: null,
        answers: [{
          id: UUID(), question_id: questionId, answer_text: 'opt-2',
          score: null, is_correct: null,
          question: { type: QuestionType.MULTIPLE_CHOICE },
        }],
        exam: { exam_questions: [{ id: UUID(), package_id: null }] },
      });
      tx.questionOption.findMany.mockResolvedValue([{ id: 'opt-2', is_correct: true }]);
      tx.answer.update.mockResolvedValue({});

      const result = await service.calculateTotalScore(tx as any, UUID());

      expect(tx.questionOption.findMany).toHaveBeenCalledWith({
        where: { question_id: questionId, is_correct: true },
      });
      expect(tx.answer.update).toHaveBeenCalledWith({
        where: { id: result.correct_count > 0 ? expect.any(String) : expect.any(String) },
        data: { is_correct: true, score: 100 },
      });
      expect(result.total_score).toBe(100);
      expect(result.correct_count).toBe(1);
      expect(result.wrong_count).toBe(0);
    });

    it('should throw NotFoundException if session not found', async () => {
      const tx = { examSession: { findUnique: vi.fn().mockResolvedValue(null) } };
      await expect(service.calculateTotalScore(tx as any, UUID())).rejects.toThrow(NotFoundException);
    });
  });
});
