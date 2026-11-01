import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { SessionService } from '../session.service';
import { SessionStatus, SessionType, ExamStatus, SocketEvent } from '@secure-cbt/shared';
import { vi, describe, it, expect, beforeEach } from 'vitest';

function UUID() {
  return crypto.randomUUID?.() ?? '00000000-0000-0000-0000-000000000001';
}

function createMockPrisma() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mock: Record<string, any> = {
    user: { findUnique: vi.fn() },
    examToken: { findUnique: vi.fn() },
    student: { findUnique: vi.fn() },
    examClass: { findFirst: vi.fn() },
    examPackage: { findMany: vi.fn() },
    examQuestion: { findMany: vi.fn() },
    exam: { update: vi.fn() },
    examSession: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    sessionLog: {
      create: vi.fn(),
      createMany: vi.fn(),
    },
    $transaction: vi.fn((fn: any) => fn(mock)),
  };
  return mock;
}

describe('SessionService - Remedial Lifecycle', () => {
  let service: SessionService;
  let mockPrisma: ReturnType<typeof createMockPrisma>;
  let mockEventEmitter: { emit: ReturnType<typeof vi.fn> };
  let mockGradingService: { calculateTotalScore: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    mockPrisma = createMockPrisma();
    mockEventEmitter = { emit: vi.fn() };
    mockGradingService = { calculateTotalScore: vi.fn() };
    service = new SessionService(
      mockPrisma as any,
      mockEventEmitter as any,
      mockGradingService as any,
    );
  });

  describe('authorizeRemedial()', () => {
    it('sets is_remedial_allowed = true and logs event for eligible session', async () => {
      const sessionId = UUID();
      const examId = UUID();
      const studentId = UUID();
      const proctorUserId = UUID();

      const mockSession = {
        id: sessionId,
        exam_id: examId,
        student_id: studentId,
        attempt_number: 1,
        status: SessionStatus.SUBMITTED,
        is_remedial_allowed: false,
        exam: { id: examId, subject_id: UUID() },
        student: { id: studentId, user_id: UUID(), full_name: 'Dewi Lestari' },
      };

      mockPrisma.user.findUnique.mockResolvedValue({ id: proctorUserId, full_name: 'Guru Pengawas' });
      mockPrisma.examSession.findUnique.mockResolvedValue(mockSession);
      mockPrisma.examSession.findFirst.mockResolvedValue(null); // No attempt 2 yet
      mockPrisma.examSession.update.mockResolvedValue({ ...mockSession, is_remedial_allowed: true });

      const result = await service.authorizeRemedial(sessionId, proctorUserId);

      expect(result.is_remedial_allowed).toBe(true);
      expect(mockPrisma.examSession.update).toHaveBeenCalledWith({
        where: { id: sessionId },
        data: { is_remedial_allowed: true },
      });
      expect(mockPrisma.sessionLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          exam_session_id: sessionId,
          event: 'REMEDIAL_AUTHORIZED',
        }),
      });
      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        SocketEvent.SESSION_REMEDIAL_AUTHORIZED,
        expect.objectContaining({
          sessionId,
          studentId,
        }),
      );
    });

    it('throws BadRequestException if session is not yet completed', async () => {
      const sessionId = UUID();
      const proctorUserId = UUID();

      mockPrisma.user.findUnique.mockResolvedValue({ id: proctorUserId, full_name: 'Guru' });
      mockPrisma.examSession.findUnique.mockResolvedValue({
        id: sessionId,
        status: SessionStatus.ACTIVE,
        attempt_number: 1,
        exam: { subject_id: UUID() },
        student: { full_name: 'Dewi' },
      });

      await expect(service.authorizeRemedial(sessionId, proctorUserId)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('bulkAuthorizeRemedial()', () => {
    it('authorizes remedial in bulk for specified student IDs', async () => {
      const examId = UUID();
      const studentId1 = UUID();
      const studentId2 = UUID();
      const proctorUserId = UUID();

      mockPrisma.user.findUnique.mockResolvedValue({ id: proctorUserId, full_name: 'Guru' });
      mockPrisma.examSession.updateMany.mockResolvedValue({ count: 2 });

      const result = await service.bulkAuthorizeRemedial(examId, proctorUserId, {
        student_ids: [studentId1, studentId2],
      });

      expect(result.count).toBe(2);
      expect(mockPrisma.examSession.updateMany).toHaveBeenCalledWith({
        where: {
          exam_id: examId,
          student_id: { in: [studentId1, studentId2] },
          attempt_number: 1,
          status: { in: [SessionStatus.SUBMITTED, SessionStatus.AUTO_SUBMITTED, SessionStatus.EXPIRED] },
        },
        data: { is_remedial_allowed: true },
      });
    });
  });

  describe('start() with Remedial Attempt #2', () => {
    it('creates Attempt #2 session when Attempt #1 is submitted and is_remedial_allowed is true', async () => {
      const examId = UUID();
      const studentUserId = UUID();
      const studentId = UUID();
      const classId = UUID();
      const q1 = UUID();
      const q2 = UUID();

      mockPrisma.examToken.findUnique.mockResolvedValue({
        id: UUID(),
        token: 'REMEDIAL1',
        expires_at: new Date(Date.now() + 3600000),
        exam: {
          id: examId,
          status: ExamStatus.ONGOING,
          start_at: new Date(Date.now() - 3600000),
          end_at: new Date(Date.now() + 3600000),
          duration_minutes: 60,
          randomize_questions: true,
          randomize_answers: false,
          is_random_pool: false,
        },
      });

      mockPrisma.student.findUnique.mockResolvedValue({
        id: studentId,
        user_id: studentUserId,
        class_id: classId,
      });
      mockPrisma.examClass.findFirst.mockResolvedValue({ id: UUID() });

      // No active session
      mockPrisma.examSession.findFirst
        // 1st call: check active session -> null
        .mockResolvedValueOnce(null)
        // 2nd call: check completed attempt 1 -> returns completed attempt 1 with is_remedial_allowed = true
        .mockResolvedValueOnce({
          id: UUID(),
          exam_id: examId,
          student_id: studentId,
          attempt_number: 1,
          status: SessionStatus.SUBMITTED,
          is_remedial_allowed: true,
        })
        // 3rd call: check existing attempt 2 -> null (fresh remedial)
        .mockResolvedValueOnce(null);

      mockPrisma.examPackage.findMany.mockResolvedValue([{ id: UUID() }]);
      mockPrisma.examQuestion.findMany.mockResolvedValue([
        { question_id: q1, position: 1 },
        { question_id: q2, position: 2 },
      ]);

      const mockCreatedAttempt2 = {
        id: UUID(),
        exam_id: examId,
        student_id: studentId,
        attempt_number: 2,
        session_type: SessionType.REMEDIAL,
        status: SessionStatus.ACTIVE,
        remaining_time_seconds: 3600,
        exam: {
          exam_questions: [
            { question_id: q1, package_id: null, question: { options: [] } },
            { question_id: q2, package_id: null, question: { options: [] } },
          ],
        },
      };
      mockPrisma.examSession.create.mockResolvedValue(mockCreatedAttempt2);

      const result = await service.start(
        { token: 'REMEDIAL1', device_id: 'device-123' },
        studentUserId,
      );

      expect(mockPrisma.examSession.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            attempt_number: 2,
            session_type: SessionType.REMEDIAL,
          }),
        }),
      );
      expect(result.id).toBe(mockCreatedAttempt2.id);
    });

    it('rejects with BadRequestException if Attempt #1 is completed but is_remedial_allowed is false', async () => {
      const examId = UUID();
      const studentUserId = UUID();
      const studentId = UUID();

      mockPrisma.examToken.findUnique.mockResolvedValue({
        id: UUID(),
        token: 'TOKEN1',
        expires_at: new Date(Date.now() + 3600000),
        exam: {
          id: examId,
          status: ExamStatus.ONGOING,
          start_at: new Date(Date.now() - 3600000),
          end_at: new Date(Date.now() + 3600000),
          duration_minutes: 60,
        },
      });

      mockPrisma.student.findUnique.mockResolvedValue({
        id: studentId,
        user_id: studentUserId,
        class_id: UUID(),
      });
      mockPrisma.examClass.findFirst.mockResolvedValue({ id: UUID() });

      // No active session
      mockPrisma.examSession.findFirst
        .mockResolvedValueOnce(null)
        // Completed Attempt 1 without remedial authorization
        .mockResolvedValueOnce({
          id: UUID(),
          exam_id: examId,
          student_id: studentId,
          attempt_number: 1,
          status: SessionStatus.SUBMITTED,
          is_remedial_allowed: false,
        });

      await expect(
        service.start({ token: 'TOKEN1', device_id: 'device-123' }, studentUserId),
      ).rejects.toThrow('Anda sudah menyelesaikan ujian ini');
    });
  });

  describe('getReview() Anti-Cheat Lock', () => {
    it('throws ForbiddenException when student has is_remedial_allowed = true and Attempt #2 not yet submitted', async () => {
      const sessionId = UUID();
      const examId = UUID();
      const studentId = UUID();
      const studentUserId = UUID();

      mockPrisma.student.findUnique.mockResolvedValue({
        id: studentId,
        user_id: studentUserId,
      });

      mockPrisma.examSession.findUnique.mockResolvedValue({
        id: sessionId,
        exam_id: examId,
        student_id: studentId,
        attempt_number: 1,
        is_remedial_allowed: true,
        status: SessionStatus.SUBMITTED,
        exam: {
          id: examId,
          status: ExamStatus.FINISHED,
          end_at: new Date(Date.now() - 3600000),
          show_results: true,
        },
      });

      // Attempt #2 has not been submitted yet (null or ACTIVE)
      mockPrisma.examSession.findFirst.mockResolvedValue(null);

      await expect(service.getReview(sessionId, studentUserId)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });
});
