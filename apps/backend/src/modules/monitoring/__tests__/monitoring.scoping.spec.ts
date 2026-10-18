import { ForbiddenException } from '@nestjs/common';
import { MonitoringService } from '../monitoring.service';
import { UserRole } from '@secure-cbt/shared';
import { vi, describe, it, expect, beforeEach } from 'vitest';

const SUB_IPA = '00000000-0000-4000-8000-000000000001';
const SUB_IPS = '00000000-0000-4000-8000-000000000002';
const EXAM_IPA = '00000000-0000-4000-8000-000000000011';
const EXAM_IPS = '00000000-0000-4000-8000-000000000012';
const USER_TEACHER = '00000000-0000-4000-8000-000000000021';

describe('MonitoringService - Teacher Proctor Access Scoping', () => {
  let service: MonitoringService;
  let mockPrisma: any;
  let mockSessionService: any;

  beforeEach(() => {
    mockPrisma = {
      teacher: {
        findUnique: vi.fn(),
      },
      exam: {
        findFirst: vi.fn(),
        findUnique: vi.fn(),
      },
      examSession: {
        findMany: vi.fn().mockResolvedValue([]),
        findUnique: vi.fn(),
      },
      examQuestion: {
        groupBy: vi.fn().mockResolvedValue([]),
      },
      sessionLog: {
        findMany: vi.fn().mockResolvedValue([]),
      },
    };
    mockSessionService = {
      autoSubmit: vi.fn(),
    };

    service = new MonitoringService(mockPrisma as any, mockSessionService as any);
  });

  describe('getExamMonitoring', () => {
    it('throws ForbiddenException when non-proctor teacher tries to monitor unassigned subject exam', async () => {
      mockPrisma.exam.findFirst.mockResolvedValue({
        id: EXAM_IPS,
        title: 'Ujian IPS',
        subject_id: SUB_IPS,
      });
      mockPrisma.teacher.findUnique.mockResolvedValue({
        id: 't-1',
        can_monitor_all_subjects: false,
        teacher_subjects: [{ subject_id: SUB_IPA }],
      });

      await expect(
        service.getExamMonitoring(EXAM_IPS, USER_TEACHER, UserRole.TEACHER),
      ).rejects.toThrow(ForbiddenException);
    });

    it('allows proctor teacher (can_monitor_all_subjects: true) to monitor any subject exam', async () => {
      mockPrisma.exam.findFirst.mockResolvedValue({
        id: EXAM_IPS,
        title: 'Ujian IPS',
        subject_id: SUB_IPS,
      });
      mockPrisma.teacher.findUnique.mockResolvedValue({
        id: 't-1',
        can_monitor_all_subjects: true,
        teacher_subjects: [{ subject_id: SUB_IPA }],
      });

      const res = await service.getExamMonitoring(EXAM_IPS, USER_TEACHER, UserRole.TEACHER);
      expect(res.exam_id).toBe(EXAM_IPS);
    });

    it('allows regular teacher to monitor exam of their own assigned subject', async () => {
      mockPrisma.exam.findFirst.mockResolvedValue({
        id: EXAM_IPA,
        title: 'Ujian IPA',
        subject_id: SUB_IPA,
      });
      mockPrisma.teacher.findUnique.mockResolvedValue({
        id: 't-1',
        can_monitor_all_subjects: false,
        teacher_subjects: [{ subject_id: SUB_IPA }],
      });

      const res = await service.getExamMonitoring(EXAM_IPA, USER_TEACHER, UserRole.TEACHER);
      expect(res.exam_id).toBe(EXAM_IPA);
    });
  });
});
