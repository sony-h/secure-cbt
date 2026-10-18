import { describe, it, expect, vi } from 'vitest';
import { ForbiddenException } from '@nestjs/common';
import {
  getTeacherScope,
  assertTeacherSubjectAccess,
  assertTeacherMonitorAccess,
  TeacherScope,
} from '../teacher-access.helper';

describe('TeacherAccessHelper', () => {
  describe('getTeacherScope', () => {
    it('returns populated scope for existing teacher', async () => {
      const mockPrisma: any = {
        teacher: {
          findUnique: vi.fn().mockResolvedValue({
            id: 'teacher-1',
            can_monitor_all_subjects: true,
            teacher_subjects: [
              { subject_id: 'sub-1' },
              { subject_id: 'sub-2' },
            ],
          }),
        },
      };

      const scope = await getTeacherScope(mockPrisma, 'user-1');
      expect(scope).toEqual({
        teacherId: 'teacher-1',
        canMonitorAllSubjects: true,
        subjectIds: ['sub-1', 'sub-2'],
      });
    });

    it('returns empty scope when teacher record is missing', async () => {
      const mockPrisma: any = {
        teacher: {
          findUnique: vi.fn().mockResolvedValue(null),
        },
      };

      const scope = await getTeacherScope(mockPrisma, 'user-none');
      expect(scope).toEqual({
        teacherId: '',
        canMonitorAllSubjects: false,
        subjectIds: [],
      });
    });
  });

  describe('assertTeacherSubjectAccess', () => {
    const scope: TeacherScope = {
      teacherId: 't-1',
      canMonitorAllSubjects: true, // Proctor status should NOT bypass subject access for question/exam/grading
      subjectIds: ['sub-matematika'],
    };

    it('passes when subject is assigned to teacher', () => {
      expect(() =>
        assertTeacherSubjectAccess(scope, 'sub-matematika'),
      ).not.toThrow();
    });

    it('throws ForbiddenException when subject is NOT assigned to teacher even if proctor', () => {
      expect(() =>
        assertTeacherSubjectAccess(scope, 'sub-fisika'),
      ).toThrow(ForbiddenException);
    });
  });

  describe('assertTeacherMonitorAccess', () => {
    it('passes when teacher is assigned to the subject', () => {
      const scope: TeacherScope = {
        teacherId: 't-1',
        canMonitorAllSubjects: false,
        subjectIds: ['sub-matematika'],
      };
      expect(() =>
        assertTeacherMonitorAccess(scope, 'sub-matematika'),
      ).not.toThrow();
    });

    it('passes for any subject when teacher has canMonitorAllSubjects = true', () => {
      const scope: TeacherScope = {
        teacherId: 't-1',
        canMonitorAllSubjects: true,
        subjectIds: ['sub-matematika'],
      };
      expect(() =>
        assertTeacherMonitorAccess(scope, 'sub-biologi'),
      ).not.toThrow();
    });

    it('throws ForbiddenException when subject is not assigned and canMonitorAllSubjects is false', () => {
      const scope: TeacherScope = {
        teacherId: 't-1',
        canMonitorAllSubjects: false,
        subjectIds: ['sub-matematika'],
      };
      expect(() =>
        assertTeacherMonitorAccess(scope, 'sub-biologi'),
      ).toThrow(ForbiddenException);
    });
  });
});
