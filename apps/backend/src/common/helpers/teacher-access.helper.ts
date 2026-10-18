import { ForbiddenException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

export interface TeacherScope {
  teacherId: string;
  canMonitorAllSubjects: boolean;
  subjectIds: string[];
}

/**
 * Resolves teacher profile, assigned subjects, and proctor permissions for a given user ID.
 */
export async function getTeacherScope(
  prisma: PrismaService | Prisma.TransactionClient,
  userId: string,
): Promise<TeacherScope> {
  const teacher = await (prisma as any).teacher.findUnique({
    where: { user_id: userId },
    include: {
      teacher_subjects: {
        select: { subject_id: true },
      },
    },
  });

  if (!teacher) {
    return {
      teacherId: '',
      canMonitorAllSubjects: false,
      subjectIds: [],
    };
  }

  return {
    teacherId: teacher.id,
    canMonitorAllSubjects: !!teacher.can_monitor_all_subjects,
    subjectIds: teacher.teacher_subjects.map((ts: any) => ts.subject_id),
  };
}

/**
 * Asserts that a teacher is assigned to teach a specific subject.
 * Note: Proctor/all-subjects status does NOT grant access to edit/create/grade other subjects' materials.
 */
export function assertTeacherSubjectAccess(
  scope: TeacherScope,
  subjectId: string,
  message = 'Anda tidak memiliki hak akses untuk mata pelajaran ini',
): void {
  if (!scope.subjectIds.includes(subjectId)) {
    throw new ForbiddenException(message);
  }
}

/**
 * Asserts that a teacher can monitor an exam or view reports for a specific subject.
 * Proctor status (canMonitorAllSubjects: true) grants access across all subjects for monitoring/reports.
 */
export function assertTeacherMonitorAccess(
  scope: TeacherScope,
  subjectId: string,
  message = 'Anda tidak memiliki izin memantau atau melihat laporan ujian ini',
): void {
  if (scope.canMonitorAllSubjects) return;
  if (!scope.subjectIds.includes(subjectId)) {
    throw new ForbiddenException(message);
  }
}
