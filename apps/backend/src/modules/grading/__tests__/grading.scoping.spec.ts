import { ForbiddenException } from '@nestjs/common';
import { GradingService } from '../grading.service';
import { UserRole, QuestionType } from '@secure-cbt/shared';
import { vi, describe, it, expect, beforeEach } from 'vitest';

const SUB_IPA = '00000000-0000-4000-8000-000000000001';
const SUB_IPS = '00000000-0000-4000-8000-000000000002';
const USER_TEACHER = '00000000-0000-4000-8000-000000000011';
const EXAM_IPS = '00000000-0000-4000-8000-000000000021';
const SESSION_1 = '00000000-0000-4000-8000-000000000031';

describe('GradingService - Teacher Subject Scoping', () => {
  let service: GradingService;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      teacher: {
        findUnique: vi.fn(),
      },
      exam: {
        findUnique: vi.fn(),
      },
      examSession: {
        findUnique: vi.fn(),
        findMany: vi.fn(),
      },
      answer: {
        findFirst: vi.fn(),
        update: vi.fn(),
      },
      score: {
        upsert: vi.fn(),
      },
      sessionLog: {
        create: vi.fn(),
      },
      setting: {
        findFirst: vi.fn(),
      },
      $transaction: vi.fn((cb) => cb(mockPrisma)),
    };

    service = new GradingService(mockPrisma as any);
  });

  describe('getPendingEssays', () => {
    it('throws ForbiddenException when teacher accesses pending essays of unassigned subject even if proctor', async () => {
      mockPrisma.exam.findUnique.mockResolvedValue({
        id: EXAM_IPS,
        subject_id: SUB_IPS,
      });
      mockPrisma.teacher.findUnique.mockResolvedValue({
        id: 't-1',
        can_monitor_all_subjects: true, // Proctor status must NOT allow grading other subjects!
        teacher_subjects: [{ subject_id: SUB_IPA }],
      });

      await expect(
        service.getPendingEssays(EXAM_IPS, undefined, 'pending', USER_TEACHER, UserRole.TEACHER),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('gradeEssay', () => {
    it('throws ForbiddenException when teacher grades essay from unassigned subject', async () => {
      mockPrisma.examSession.findUnique.mockResolvedValue({
        id: SESSION_1,
        exam: { subject_id: SUB_IPS },
      });
      mockPrisma.teacher.findUnique.mockResolvedValue({
        id: 't-1',
        can_monitor_all_subjects: true,
        teacher_subjects: [{ subject_id: SUB_IPA }],
      });

      await expect(
        service.gradeEssay(
          {
            session_id: SESSION_1,
            question_id: '00000000-0000-4000-8000-000000000041',
            score: 85,
          },
          USER_TEACHER,
          UserRole.TEACHER,
        ),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
