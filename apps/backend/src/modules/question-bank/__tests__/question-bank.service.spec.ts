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

  describe('bulkDelete()', () => {
    it('should block deletion if any question in the batch is linked to active/draft exam', async () => {
      const q1 = UUID();
      const q2 = UUID();
      mockPrisma.examQuestion.findMany.mockResolvedValue([
        {
          question_id: q1,
          exam: { id: UUID(), title: 'Ujian Aktif', status: ExamStatus.ONGOING },
        },
      ]);

      await expect(service.bulkDelete([q1, q2])).rejects.toThrow(BadRequestException);
      expect(mockPrisma.question.updateMany).not.toHaveBeenCalled();
    });

    it('should soft-delete all questions in batch when safe', async () => {
      const q1 = UUID();
      const q2 = UUID();
      mockPrisma.examQuestion.findMany.mockResolvedValue([]);
      mockPrisma.question.updateMany.mockResolvedValue({ count: 2 });

      const res = await service.bulkDelete([q1, q2]);

      expect(res.count).toBe(2);
      expect(mockPrisma.question.updateMany).toHaveBeenCalledWith({
        where: { id: { in: [q1, q2] }, deleted_at: null },
        data: { deleted_at: expect.any(Date) },
      });
    });
  });

  describe('bulkMove()', () => {
    it('should throw NotFoundException if target bank does not exist or is deleted', async () => {
      const targetBankId = UUID();
      mockPrisma.questionBank.findFirst.mockResolvedValue(null);

      await expect(service.bulkMove([UUID()], targetBankId)).rejects.toThrow(NotFoundException);
    });

    it('should update question_bank_id for all specified questions', async () => {
      const targetBankId = UUID();
      const q1 = UUID();
      const q2 = UUID();
      mockPrisma.questionBank.findFirst.mockResolvedValue({ id: targetBankId, title: 'Bank Baru' });
      mockPrisma.question.updateMany.mockResolvedValue({ count: 2 });

      const res = await service.bulkMove([q1, q2], targetBankId);

      expect(res.count).toBe(2);
      expect(mockPrisma.question.updateMany).toHaveBeenCalledWith({
        where: { id: { in: [q1, q2] }, deleted_at: null },
        data: { question_bank_id: targetBankId },
      });
    });
  });

  describe('bulkDeleteBanks()', () => {
    it('should block deletion if questions in any of the banks are in active exams', async () => {
      const b1 = UUID();
      const b2 = UUID();
      const q1 = UUID();

      mockPrisma.question.findMany.mockResolvedValue([{ id: q1 }]);
      mockPrisma.examQuestion.findMany.mockResolvedValue([
        {
          question_id: q1,
          exam: { id: UUID(), title: 'Draft Exam', status: ExamStatus.DRAFT },
        },
      ]);

      await expect(service.bulkDeleteBanks([b1, b2])).rejects.toThrow(BadRequestException);
      expect(mockPrisma.questionBank.updateMany).not.toHaveBeenCalled();
    });

    it('should cascade soft-delete all questions and banks in batch', async () => {
      const b1 = UUID();
      const b2 = UUID();
      const q1 = UUID();
      const q2 = UUID();

      mockPrisma.question.findMany.mockResolvedValue([{ id: q1 }, { id: q2 }]);
      mockPrisma.examQuestion.findMany.mockResolvedValue([]);
      mockPrisma.question.updateMany.mockResolvedValue({ count: 2 });
      mockPrisma.questionBank.updateMany.mockResolvedValue({ count: 2 });

      const res = await service.bulkDeleteBanks([b1, b2]);

      expect(res.count).toBe(2);
      expect(res.questions_count).toBe(2);
      expect(mockPrisma.question.updateMany).toHaveBeenCalledWith({
        where: { question_bank_id: { in: [b1, b2] }, deleted_at: null },
        data: { deleted_at: expect.any(Date) },
      });
      expect(mockPrisma.questionBank.updateMany).toHaveBeenCalledWith({
        where: { id: { in: [b1, b2] }, deleted_at: null },
        data: { deleted_at: expect.any(Date) },
      });
    });
  });
});
