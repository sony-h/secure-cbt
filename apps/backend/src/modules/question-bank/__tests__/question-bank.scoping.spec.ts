import { ForbiddenException } from '@nestjs/common';
import { QuestionBankService } from '../question-bank.service';
import { UserRole, QuestionType } from '@secure-cbt/shared';
import { vi, describe, it, expect, beforeEach } from 'vitest';

const SUB_IPA = '00000000-0000-4000-8000-000000000001';
const SUB_IPS = '00000000-0000-4000-8000-000000000002';
const SUB_MTK = '00000000-0000-4000-8000-000000000003';
const BANK_1 = '00000000-0000-4000-8000-000000000011';
const USER_1 = '00000000-0000-4000-8000-000000000021';

describe('QuestionBankService - Teacher Subject Scoping', () => {
  let service: QuestionBankService;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      teacher: {
        findUnique: vi.fn(),
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
      question: {
        findFirst: vi.fn(),
        findUnique: vi.fn(),
        findMany: vi.fn(),
        count: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        updateMany: vi.fn(),
      },
      examQuestion: {
        findMany: vi.fn().mockResolvedValue([]),
      },
      questionOption: {
        createMany: vi.fn(),
      },
      questionTag: {
        createMany: vi.fn(),
      },
      $transaction: vi.fn((cb) => cb(mockPrisma)),
    };

    service = new QuestionBankService(mockPrisma as any);
  });

  describe('getBanks', () => {
    it('scopes banks to assigned subjects for TEACHER role', async () => {
      mockPrisma.teacher.findUnique.mockResolvedValue({
        id: 'teacher-1',
        can_monitor_all_subjects: false,
        teacher_subjects: [{ subject_id: SUB_IPA }, { subject_id: SUB_IPS }],
      });
      mockPrisma.questionBank.findMany.mockResolvedValue([]);

      await service.getBanks(USER_1, UserRole.TEACHER);

      expect(mockPrisma.questionBank.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            deleted_at: null,
            subject_id: { in: [SUB_IPA, SUB_IPS] },
          }),
        }),
      );
    });

    it('returns empty array if teacher has no assigned subjects', async () => {
      mockPrisma.teacher.findUnique.mockResolvedValue({
        id: 'teacher-2',
        can_monitor_all_subjects: false,
        teacher_subjects: [],
      });

      const res = await service.getBanks('user-2', UserRole.TEACHER);
      expect(res).toEqual([]);
      expect(mockPrisma.questionBank.findMany).not.toHaveBeenCalled();
    });

    it('does not scope banks by teacher subjects for ADMIN role', async () => {
      mockPrisma.questionBank.findMany.mockResolvedValue([]);

      await service.getBanks('admin-user', UserRole.ADMIN);

      expect(mockPrisma.questionBank.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { deleted_at: null },
        }),
      );
    });
  });

  describe('createBank', () => {
    it('throws ForbiddenException if teacher creates bank for unassigned subject', async () => {
      mockPrisma.teacher.findUnique.mockResolvedValue({
        id: 'teacher-1',
        can_monitor_all_subjects: false,
        teacher_subjects: [{ subject_id: SUB_IPA }],
      });

      await expect(
        service.createBank(
          { title: 'Bank MTK', subject_id: SUB_MTK },
          USER_1,
          UserRole.TEACHER,
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('allows teacher to create bank for assigned subject', async () => {
      mockPrisma.teacher.findUnique.mockResolvedValue({
        id: 'teacher-1',
        can_monitor_all_subjects: false,
        teacher_subjects: [{ subject_id: SUB_IPA }],
      });
      mockPrisma.questionBank.create.mockResolvedValue({ id: BANK_1 });

      const res = await service.createBank(
        { title: 'Bank IPA', subject_id: SUB_IPA },
        USER_1,
        UserRole.TEACHER,
      );

      expect(res).toEqual({ id: BANK_1 });
    });
  });

  describe('create (Question)', () => {
    it('throws ForbiddenException if teacher adds question to bank of unassigned subject', async () => {
      mockPrisma.teacher.findUnique.mockResolvedValue({
        id: 'teacher-1',
        can_monitor_all_subjects: false,
        teacher_subjects: [{ subject_id: SUB_IPA }],
      });
      mockPrisma.questionBank.findUnique.mockResolvedValue({
        id: BANK_1,
        subject_id: SUB_MTK,
      });

      await expect(
        service.create(
          {
            question_bank_id: BANK_1,
            type: QuestionType.ESSAY,
            content: 'Jelaskan konsep fotosintesis!',
            difficulty: 'EASY',
          },
          USER_1,
          UserRole.TEACHER,
        ),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
