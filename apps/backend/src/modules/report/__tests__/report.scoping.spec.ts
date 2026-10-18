import { ForbiddenException } from '@nestjs/common';
import { ReportService } from '../report.service';
import { UserRole } from '@secure-cbt/shared';
import { vi, describe, it, expect, beforeEach } from 'vitest';

const SUB_IPA = '00000000-0000-4000-8000-000000000001';
const SUB_IPS = '00000000-0000-4000-8000-000000000002';
const EXAM_IPS = '00000000-0000-4000-8000-000000000012';
const USER_TEACHER = '00000000-0000-4000-8000-000000000021';

describe('ReportService - Teacher Proctor Access Scoping', () => {
  let service: ReportService;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      teacher: {
        findUnique: vi.fn(),
      },
      exam: {
        findFirst: vi.fn(),
      },
      examSession: {
        findMany: vi.fn().mockResolvedValue([]),
      },
      setting: {
        findFirst: vi.fn().mockResolvedValue({ passing_grade: 75 }),
      },
    };

    service = new ReportService(mockPrisma as any);
  });

  describe('getExamReport', () => {
    it('throws ForbiddenException when non-proctor teacher tries to view report of unassigned subject exam', async () => {
      mockPrisma.exam.findFirst.mockResolvedValue({
        id: EXAM_IPS,
        title: 'Ujian IPS',
        subject_id: SUB_IPS,
        subject: { name: 'IPS' },
      });
      mockPrisma.teacher.findUnique.mockResolvedValue({
        id: 't-1',
        can_monitor_all_subjects: false,
        teacher_subjects: [{ subject_id: SUB_IPA }],
      });

      await expect(
        service.getExamReport(EXAM_IPS, undefined, undefined, undefined, USER_TEACHER, UserRole.TEACHER),
      ).rejects.toThrow(ForbiddenException);
    });

    it('allows proctor teacher (can_monitor_all_subjects: true) to view report of any subject exam', async () => {
      mockPrisma.exam.findFirst.mockResolvedValue({
        id: EXAM_IPS,
        title: 'Ujian IPS',
        subject_id: SUB_IPS,
        subject: { name: 'IPS' },
      });
      mockPrisma.teacher.findUnique.mockResolvedValue({
        id: 't-1',
        can_monitor_all_subjects: true,
        teacher_subjects: [{ subject_id: SUB_IPA }],
      });

      const res = await service.getExamReport(
        EXAM_IPS,
        undefined,
        undefined,
        undefined,
        USER_TEACHER,
        UserRole.TEACHER,
      );
      expect(res.exam_id).toBe(EXAM_IPS);
    });
  });
});
