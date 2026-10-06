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
      setting: { findFirst: vi.fn().mockResolvedValue({ passing_grade: 70 }) },
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

    it('should auto-grade SHORT_ANSWER questions case-insensitively', async () => {
      const tx = {
        examSession: { findUnique: vi.fn() },
        questionOption: { findMany: vi.fn() },
        answer: { update: vi.fn() },
      };
      const questionId = UUID();
      tx.examSession.findUnique.mockResolvedValue({
        id: UUID(), package_id: null,
        answers: [{
          id: UUID(), question_id: questionId, answer_text: '  Nusantara  ',
          score: null, is_correct: null,
          question: { type: QuestionType.SHORT_ANSWER },
        }],
        exam: { exam_questions: [{ id: UUID(), package_id: null }] },
      });
      tx.questionOption.findMany.mockResolvedValue([
        { id: 'opt-1', content: 'IKN' },
        { id: 'opt-2', content: 'nusantara' },
      ]);
      tx.answer.update.mockResolvedValue({});

      const result = await service.calculateTotalScore(tx as any, UUID());

      expect(tx.answer.update).toHaveBeenCalledWith({
        where: { id: expect.any(String) },
        data: { is_correct: true, score: 100 },
      });
      expect(result.total_score).toBe(100);
      expect(result.correct_count).toBe(1);
      expect(result.wrong_count).toBe(0);
    });

    it('should auto-grade MATCHING questions with partial credit', async () => {
      const tx = {
        examSession: { findUnique: vi.fn() },
        questionOption: { findMany: vi.fn() },
        answer: { update: vi.fn() },
      };
      const questionId = UUID();
      const pair1Id = 'pair-1';
      const pair2Id = 'pair-2';

      tx.examSession.findUnique.mockResolvedValue({
        id: UUID(), package_id: null,
        answers: [{
          id: UUID(), question_id: questionId,
          // Student matched pair1 correctly, pair2 wrongly
          answer_text: JSON.stringify({ [pair1Id]: pair1Id, [pair2Id]: 'wrong-pair' }),
          score: null, is_correct: null,
          question: { type: QuestionType.MATCHING },
        }],
        exam: { exam_questions: [{ id: UUID(), package_id: null }] },
      });
      tx.questionOption.findMany.mockResolvedValue([
        { id: pair1Id, content: JSON.stringify({ left: 'A', right: '1' }) },
        { id: pair2Id, content: JSON.stringify({ left: 'B', right: '2' }) },
      ]);
      tx.answer.update.mockResolvedValue({});

      const result = await service.calculateTotalScore(tx as any, UUID());

      // 1 of 2 pairs correct = 50%
      expect(tx.answer.update).toHaveBeenCalledWith({
        where: { id: expect.any(String) },
        data: { is_correct: false, score: 50 },
      });
      expect(result.total_score).toBe(50);
      expect(result.correct_count).toBe(1);
    });

    it('should throw NotFoundException if session not found', async () => {
      const tx = { examSession: { findUnique: vi.fn().mockResolvedValue(null) } };
      await expect(service.calculateTotalScore(tx as any, UUID())).rejects.toThrow(NotFoundException);
    });
  });
});
