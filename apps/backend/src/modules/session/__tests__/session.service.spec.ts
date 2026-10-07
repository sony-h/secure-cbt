import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { SessionService } from '../session.service';
import { GradingService } from '../../grading/grading.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { SessionStatus, ExamStatus, QuestionType } from '@secure-cbt/shared';
import { vi, describe, it, expect, beforeEach } from 'vitest';

function UUID() { return crypto.randomUUID?.() ?? '00000000-0000-0000-0000-000000000001'; }

function createMockPrisma() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mock: Record<string, any> = {
    examToken: { findUnique: vi.fn() },
    student: { findUnique: vi.fn() },
    examClass: { findFirst: vi.fn() },
    examSession: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    examPackage: { findMany: vi.fn() },
    exam: { update: vi.fn() },
    answer: { upsert: vi.fn() },
    questionOption: { findMany: vi.fn() },
    score: { upsert: vi.fn() },
    setting: { findFirst: vi.fn().mockResolvedValue({ passing_grade: 70 }) },
    $transaction: vi.fn((fn: any) => fn(mock)),
  };
  return mock;
}

describe('SessionService', () => {
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

  describe('start()', () => {
    it('should throw BadRequestException for already completed exam', async () => {
      const examId = UUID();
      mockPrisma.examToken.findUnique.mockResolvedValue({
        id: UUID(),
        token: 'TOKEN1234',
        expires_at: new Date(Date.now() + 3600000),
        exam: {
          id: examId,
          status: ExamStatus.PUBLISHED,
          start_at: new Date(Date.now() - 3600000),
          end_at: new Date(Date.now() + 3600000),
          randomize_questions: false,
          randomize_answers: false,
          duration_minutes: 60,
        },
      });
      mockPrisma.student.findUnique.mockResolvedValue({ id: UUID(), class_id: UUID() });
      mockPrisma.examClass.findFirst.mockResolvedValue({ id: UUID() });
      mockPrisma.examSession.findFirst
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ id: UUID(), status: SessionStatus.SUBMITTED });

      await expect(
        service.start({ token: 'TOKEN1234', device_id: 'device-1' }, 'user-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should create a new session for valid token', async () => {
      const examId = UUID();
      const studentId = UUID();
      mockPrisma.examToken.findUnique.mockResolvedValue({
        id: UUID(),
        token: 'TOKEN1234',
        expires_at: new Date(Date.now() + 3600000),
        exam: {
          id: examId,
          status: ExamStatus.PUBLISHED,
          start_at: new Date(Date.now() - 3600000),
          end_at: new Date(Date.now() + 3600000),
          randomize_questions: false,
          randomize_answers: false,
          duration_minutes: 60,
        },
      });
      mockPrisma.student.findUnique.mockResolvedValue({ id: studentId, class_id: UUID() });
      mockPrisma.examClass.findFirst.mockResolvedValue({ id: UUID() });
      mockPrisma.examSession.findFirst
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null);
      mockPrisma.examPackage.findMany.mockResolvedValue([]);
      mockPrisma.examSession.create.mockResolvedValue({
        id: 'new-session',
        exam_id: examId,
        status: SessionStatus.ACTIVE,
        exam: { exam_questions: [], randomize_questions: false, randomize_answers: false },
      });

      const result = await service.start({ token: 'TOKEN1234', device_id: 'device-1' }, 'user-1');
      expect(mockPrisma.examSession.create).toHaveBeenCalled();
      expect(result.id).toBe('new-session');
    });
  });

  describe('resume()', () => {
    it('should return persisted question order', async () => {
      const studentId = UUID();
      mockPrisma.student.findUnique.mockResolvedValue({ id: studentId });
      mockPrisma.examSession.findUnique.mockResolvedValue({
        id: UUID(),
        student_id: studentId,
        status: SessionStatus.ACTIVE,
        package_id: null,
        question_order: ['eq-1', 'eq-2'],
        exam: {
          randomize_questions: true,
          randomize_answers: false,
          exam_questions: [
            { id: 'eq-1', position: 1, package_id: null, question: { id: UUID(), type: 'MULTIPLE_CHOICE', content: 'Q1', image_url: 'https://example.com/q1.webp', options: [{ id: 'opt-1', content: 'O1', image_url: 'https://example.com/o1.webp' }] } },
            { id: 'eq-2', position: 2, package_id: null, question: { id: UUID(), type: 'MULTIPLE_CHOICE', content: 'Q2', image_url: null, options: [] } },
          ],
        },
        package: null,
      });
      mockPrisma.examSession.update.mockResolvedValue({});

      const result = await service.resume({ session_id: UUID() }, 'user-1');
      expect(mockPrisma.examSession.update).toHaveBeenCalled();
      expect(result.questions).toHaveLength(2);
      const qWithImg: any = result.questions.find((q: any) => q.id === 'eq-1');
      expect(qWithImg?.question.image_url).toBe('https://example.com/q1.webp');
      expect(qWithImg?.question.options[0]?.image_url).toBe('https://example.com/o1.webp');
    });

    it('should throw for completed sessions', async () => {
      const studentId = UUID();
      mockPrisma.student.findUnique.mockResolvedValue({ id: studentId });
      mockPrisma.examSession.findUnique.mockResolvedValue({
        id: UUID(),
        student_id: studentId,
        status: SessionStatus.SUBMITTED,
      });

      await expect(
        service.resume({ session_id: UUID() }, 'user-1'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('submit()', () => {
    it('should be wrapped in transaction', async () => {
      const studentId = UUID();
      const sessionId = UUID();
      mockPrisma.student.findUnique.mockResolvedValue({ id: studentId });
      mockPrisma.examSession.findUnique.mockResolvedValue({
        id: sessionId,
        student_id: studentId,
        exam_id: UUID(),
        status: SessionStatus.ACTIVE,
        student: { full_name: 'Test Student' },
      });

      mockPrisma.$transaction.mockImplementation(async (fn: any) => {
        const tx = { ...mockPrisma };
        tx.examSession = {
          update: vi.fn().mockResolvedValue({ id: sessionId, status: 'SUBMITTED' }),
        };
        tx.score = { upsert: vi.fn().mockResolvedValue({}) };
        tx.setting = { findFirst: vi.fn().mockResolvedValue({ passing_grade: 70 }) };
        return fn(tx);
      });

      mockGradingService.calculateTotalScore.mockResolvedValue({
        total_score: 80, correct_count: 8, wrong_count: 2, essay_score: 0, total_questions: 10,
      });

      const result = await service.submit({ session_id: sessionId }, 'user-1');
      expect(mockPrisma.$transaction).toHaveBeenCalled();
      expect(result.status).toBe('SUBMITTED');
    });

    it('should return session idempotently if already submitted or auto-submitted', async () => {
      const studentId = UUID();
      const sessionId = UUID();
      mockPrisma.student.findUnique.mockResolvedValue({ id: studentId });
      mockPrisma.examSession.findUnique.mockResolvedValue({
        id: sessionId,
        student_id: studentId,
        status: SessionStatus.AUTO_SUBMITTED,
      });

      const result = await service.submit({ session_id: sessionId }, 'user-1');
      expect(mockPrisma.$transaction).not.toHaveBeenCalled();
      expect(result.status).toBe(SessionStatus.AUTO_SUBMITTED);
    });
  });

  describe('autoSubmit()', () => {
    it('should be wrapped in transaction', async () => {
      const sessionId = UUID();
      mockPrisma.examSession.findUnique.mockResolvedValue({
        id: sessionId,
        student_id: UUID(),
        exam_id: UUID(),
        status: SessionStatus.ACTIVE,
        student: { full_name: 'Test Student' },
      });

      mockPrisma.$transaction.mockImplementation(async (fn: any) => {
        const tx = { ...mockPrisma };
        tx.examSession = {
          update: vi.fn().mockResolvedValue({ id: sessionId, status: 'AUTO_SUBMITTED' }),
        };
        tx.score = { upsert: vi.fn().mockResolvedValue({}) };
        tx.setting = { findFirst: vi.fn().mockResolvedValue({ passing_grade: 70 }) };
        return fn(tx);
      });

      mockGradingService.calculateTotalScore.mockResolvedValue({
        total_score: 70, correct_count: 7, wrong_count: 3, essay_score: 0, total_questions: 10,
      });

      const result = await service.autoSubmit(sessionId);
      expect(mockPrisma.$transaction).toHaveBeenCalled();
      expect(result!.status).toBe('AUTO_SUBMITTED');
    });

    it('should return undefined if session not found or not active', async () => {
      mockPrisma.examSession.findUnique.mockResolvedValue(null);
      const result = await service.autoSubmit(UUID());
      expect(result).toBeUndefined();
    });
  });

  describe('getReview()', () => {
    it('should return review questions and explanations when exam is finished', async () => {
      const studentId = UUID();
      const sessionId = UUID();
      const qId = UUID();
      mockPrisma.student.findUnique.mockResolvedValue({ id: studentId });

      const pastEnd = new Date(Date.now() - 3600000); // 1 hour ago
      mockPrisma.examSession.findUnique.mockResolvedValue({
        id: sessionId,
        student_id: studentId,
        status: SessionStatus.SUBMITTED,
        question_order: null,
        package_id: null,
        submitted_at: new Date(),
        student: { full_name: 'Test Student' },
        score: { total_score: 100, correct_count: 1, wrong_count: 0 },
        exam: {
          id: UUID(),
          title: 'Finished Exam',
          status: ExamStatus.FINISHED,
          end_at: pastEnd,
          subject: { name: 'Matematika' },
          exam_questions: [
            {
              id: 'eq-1',
              position: 1,
              package_id: null,
              question: {
                id: qId,
                type: QuestionType.MULTIPLE_CHOICE,
                content: 'Berapakah 2 + 2?',
                image_url: null,
                difficulty: 'EASY',
                explanation: '2 + 2 = 4',
                options: [
                  { id: 'opt-1', content: '4', image_url: null, is_correct: true, order: 1 },
                  { id: 'opt-2', content: '5', image_url: null, is_correct: false, order: 2 },
                ],
              },
            },
          ],
        },
        answers: [
          {
            question_id: qId,
            answer_text: 'opt-1',
            is_correct: true,
            score: 100,
            feedback: null,
          },
        ],
      });

      const result = await service.getReview(sessionId, 'user-1');
      expect(result.exam_title).toBe('Finished Exam');
      expect(result.total_score).toBe(100);
      expect(result.questions).toHaveLength(1);
      const firstQ: any = result.questions[0];
      expect(firstQ.explanation).toBe('2 + 2 = 4');
      expect(firstQ.student_answer).toBe('opt-1');
      expect(firstQ.is_correct).toBe(true);
    });

    it('should throw ForbiddenException if exam is not finished yet', async () => {
      const studentId = UUID();
      const sessionId = UUID();
      mockPrisma.student.findUnique.mockResolvedValue({ id: studentId });

      const futureEnd = new Date(Date.now() + 3600000); // 1 hour in the future
      mockPrisma.examSession.findUnique.mockResolvedValue({
        id: sessionId,
        student_id: studentId,
        status: SessionStatus.SUBMITTED,
        exam: {
          id: UUID(),
          title: 'Active Exam',
          status: ExamStatus.ONGOING,
          end_at: futureEnd,
          subject: { name: 'Matematika' },
          exam_questions: [],
        },
        answers: [],
        score: { total_score: 100 },
        student: { full_name: 'Test Student' },
      });

      await expect(service.getReview(sessionId, 'user-1')).rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException if session is not submitted yet', async () => {
      const studentId = UUID();
      const sessionId = UUID();
      mockPrisma.student.findUnique.mockResolvedValue({ id: studentId });

      mockPrisma.examSession.findUnique.mockResolvedValue({
        id: sessionId,
        student_id: studentId,
        status: SessionStatus.ACTIVE,
        exam: {
          status: ExamStatus.FINISHED,
          end_at: new Date(Date.now() - 3600000),
          subject: { name: 'Matematika' },
          exam_questions: [],
        },
        answers: [],
        score: null,
        student: { full_name: 'Test Student' },
      });

      await expect(service.getReview(sessionId, 'user-1')).rejects.toThrow(BadRequestException);
    });
  });
});
