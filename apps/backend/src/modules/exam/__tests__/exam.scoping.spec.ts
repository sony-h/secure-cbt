import { ForbiddenException, BadRequestException } from '@nestjs/common';
import { ExamService } from '../exam.service';
import { UserRole } from '@secure-cbt/shared';
import { vi, describe, it, expect, beforeEach } from 'vitest';

const SUB_IPA = '00000000-0000-4000-8000-000000000001';
const SUB_IPS = '00000000-0000-4000-8000-000000000002';
const USER_TEACHER = '00000000-0000-4000-8000-000000000011';
const EXAM_1 = '00000000-0000-4000-8000-000000000021';

describe('ExamService - Teacher Subject Scoping', () => {
  let service: ExamService;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      teacher: {
        findUnique: vi.fn(),
      },
      exam: {
        findFirst: vi.fn(),
        findUnique: vi.fn().mockResolvedValue({ id: EXAM_1, subject_id: SUB_IPA }),
        findMany: vi.fn(),
        count: vi.fn(),
        create: vi.fn().mockResolvedValue({ id: EXAM_1, subject_id: SUB_IPA }),
        update: vi.fn(),
      },
      examClass: {
        createMany: vi.fn(),
      },
      examPackage: {
        create: vi.fn().mockResolvedValue({ id: 'pkg-1' }),
      },
      examQuestion: {
        createMany: vi.fn(),
      },
      question: {
        findMany: vi.fn().mockResolvedValue([]),
      },
      class: {
        findMany: vi.fn().mockResolvedValue([]),
      },
      $transaction: vi.fn((cb) => cb(mockPrisma)),
    };

    service = new ExamService(mockPrisma as any);
  });

  describe('create', () => {
    it('throws ForbiddenException if teacher creates exam for unassigned subject', async () => {
      mockPrisma.teacher.findUnique.mockResolvedValue({
        id: 'teacher-1',
        can_monitor_all_subjects: false,
        teacher_subjects: [{ subject_id: SUB_IPA }],
      });

      const now = new Date();
      const end = new Date(now.getTime() + 7200000);

      await expect(
        service.create(
          {
            title: 'Ujian IPS',
            subject_id: SUB_IPS,
            duration_minutes: 60,
            start_at: now.toISOString(),
            end_at: end.toISOString(),
            class_ids: ['00000000-0000-4000-8000-000000000031'],
            question_ids: ['00000000-0000-4000-8000-000000000041'],
          },
          USER_TEACHER,
          UserRole.TEACHER,
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('allows teacher to create exam for assigned subject', async () => {
      mockPrisma.teacher.findUnique.mockResolvedValue({
        id: 'teacher-1',
        can_monitor_all_subjects: false,
        teacher_subjects: [{ subject_id: SUB_IPA }],
      });
      mockPrisma.exam.create.mockResolvedValue({ id: EXAM_1, subject_id: SUB_IPA });

      const now = new Date();
      const end = new Date(now.getTime() + 7200000);

      const res = await service.create(
        {
          title: 'Ujian IPA',
          subject_id: SUB_IPA,
          duration_minutes: 60,
          start_at: now.toISOString(),
          end_at: end.toISOString(),
          class_ids: ['00000000-0000-4000-8000-000000000031'],
          question_ids: ['00000000-0000-4000-8000-000000000041'],
        },
        USER_TEACHER,
        UserRole.TEACHER,
      );

      expect(res.id).toBe(EXAM_1);
    });
  });

  describe('findAll', () => {
    it('scopes exams to assigned subjects for regular teacher in management mode', async () => {
      mockPrisma.teacher.findUnique.mockResolvedValue({
        id: 'teacher-1',
        can_monitor_all_subjects: false,
        teacher_subjects: [{ subject_id: SUB_IPA }],
      });
      mockPrisma.exam.findMany.mockResolvedValue([]);
      mockPrisma.exam.count.mockResolvedValue(0);

      await service.findAll({}, USER_TEACHER, UserRole.TEACHER, 'management');

      expect(mockPrisma.exam.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            deleted_at: null,
            subject_id: { in: [SUB_IPA] },
          }),
        }),
      );
    });

    it('allows proctor teacher to see all exams in monitoring context', async () => {
      mockPrisma.teacher.findUnique.mockResolvedValue({
        id: 'teacher-1',
        can_monitor_all_subjects: true,
        teacher_subjects: [{ subject_id: SUB_IPA }],
      });
      mockPrisma.exam.findMany.mockResolvedValue([]);
      mockPrisma.exam.count.mockResolvedValue(0);

      await service.findAll({}, USER_TEACHER, UserRole.TEACHER, 'monitoring');

      expect(mockPrisma.exam.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.not.objectContaining({
            subject_id: { in: [SUB_IPA] },
          }),
        }),
      );
    });
  });
});
