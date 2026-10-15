import { BadRequestException, NotFoundException } from '@nestjs/common';
import { QuestionBankService } from '../question-bank.service';
import { ExamStatus, QuestionType } from '@secure-cbt/shared';
import { vi, describe, it, expect, beforeEach } from 'vitest';

function UUID() {
  return crypto.randomUUID?.() ?? '00000000-0000-0000-0000-000000000001';
}

describe('QuestionBankService - Deletion & Exam Guard', () => {
  let service: QuestionBankService;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      question: {
        findFirst: vi.fn(),
        findUnique: vi.fn(),
        findMany: vi.fn(),
        count: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        updateMany: vi.fn(),
      },
      questionBank: {
        findFirst: vi.fn(),
        findUnique: vi.fn(),
        findUniqueOrThrow: vi.fn(),
        findMany: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        updateMany: vi.fn(),
      },
      examQuestion: {
        findMany: vi.fn(),
      },
      questionOption: {
        createMany: vi.fn(),
        deleteMany: vi.fn(),
      },
      questionTag: {
        createMany: vi.fn(),
        deleteMany: vi.fn(),
      },
      $transaction: vi.fn((callback) => callback(mockPrisma)),
    };

    service = new QuestionBankService(mockPrisma as any);
  });

  describe('remove() (Question deletion guard)', () => {
    it('should throw BadRequestException if question is linked to an ongoing or draft exam', async () => {
      const questionId = UUID();
      mockPrisma.question.findFirst.mockResolvedValue({
        id: questionId,
        deleted_at: null,
      });

      mockPrisma.examQuestion.findMany.mockResolvedValue([
        {
          question_id: questionId,
          exam: {
            id: UUID(),
            title: 'Penilaian Tengah Semester Genap',
            status: ExamStatus.ONGOING,
            end_at: new Date(Date.now() + 3600000),
          },
        },
      ]);

      await expect(service.remove(questionId)).rejects.toThrow(BadRequestException);
      expect(mockPrisma.question.update).not.toHaveBeenCalled();
    });

    it('should soft-delete question if it is not linked to any active/draft exam', async () => {
      const questionId = UUID();
      mockPrisma.question.findFirst.mockResolvedValue({
        id: questionId,
        deleted_at: null,
      });

      // Prisma filters out FINISHED exams, returning empty array
      mockPrisma.examQuestion.findMany.mockResolvedValue([]);
      mockPrisma.question.update.mockResolvedValue({ id: questionId, deleted_at: new Date() });

      const res = await service.remove(questionId);

      expect(res.deleted).toBe(true);
      expect(mockPrisma.question.update).toHaveBeenCalledWith({
        where: { id: questionId },
        data: { deleted_at: expect.any(Date) },
      });
    });
  });

  describe('deleteBank() (Cascading bank deletion & guard)', () => {
    it('should throw BadRequestException if any question in bank is linked to active/draft exam', async () => {
      const bankId = UUID();
      const questionId = UUID();
      mockPrisma.questionBank.findUniqueOrThrow.mockResolvedValue({ id: bankId });
      mockPrisma.question.findMany.mockResolvedValue([{ id: questionId }]);

      mockPrisma.examQuestion.findMany.mockResolvedValue([
        {
          question_id: questionId,
          exam: {
            id: UUID(),
            title: 'Draft Ujian KKA',
            status: ExamStatus.DRAFT,
            end_at: new Date(Date.now() + 86400000),
          },
        },
      ]);

      await expect(service.deleteBank(bankId)).rejects.toThrow(BadRequestException);
      expect(mockPrisma.questionBank.update).not.toHaveBeenCalled();
      expect(mockPrisma.question.updateMany).not.toHaveBeenCalled();
    });

    it('should soft-delete both the bank and all child questions in a transaction when safe', async () => {
      const bankId = UUID();
      const q1 = UUID();
      const q2 = UUID();
      mockPrisma.questionBank.findUniqueOrThrow.mockResolvedValue({ id: bankId });
      mockPrisma.question.findMany.mockResolvedValue([{ id: q1 }, { id: q2 }]);
      mockPrisma.examQuestion.findMany.mockResolvedValue([]); // not linked to active exams

      mockPrisma.questionBank.update.mockResolvedValue({ id: bankId, deleted_at: new Date() });
      mockPrisma.question.updateMany.mockResolvedValue({ count: 2 });

      await service.deleteBank(bankId);

      expect(mockPrisma.questionBank.update).toHaveBeenCalledWith({
        where: { id: bankId },
        data: { deleted_at: expect.any(Date) },
      });
      expect(mockPrisma.question.updateMany).toHaveBeenCalledWith({
        where: { question_bank_id: bankId, deleted_at: null },
        data: { deleted_at: expect.any(Date) },
      });
    });
  });
});
