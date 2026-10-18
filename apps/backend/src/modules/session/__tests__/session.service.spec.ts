import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { SessionService } from '../session.service';
import { GradingService } from '../../grading/grading.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { SessionStatus, ExamStatus, QuestionType, SocketEvent } from '@secure-cbt/shared';
import { vi, describe, it, expect, beforeEach } from 'vitest';

function UUID() { return crypto.randomUUID?.() ?? '00000000-0000-0000-0000-000000000001'; }

function createMockPrisma() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mock: Record<string, any> = {
    user: { findUnique: vi.fn() },
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
    sessionLog: { create: vi.fn(), findMany: vi.fn() },
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

    it('should sample a subset of questions when is_random_pool is enabled', async () => {
      const examId = UUID();
      const studentId = UUID();
      const candidateQuestions = [
        { id: 'eq-1', position: 1, package_id: null, question: { id: UUID(), difficulty: 'EASY', type: 'MULTIPLE_CHOICE', content: 'Q1', options: [] } },
        { id: 'eq-2', position: 2, package_id: null, question: { id: UUID(), difficulty: 'EASY', type: 'MULTIPLE_CHOICE', content: 'Q2', options: [] } },
        { id: 'eq-3', position: 3, package_id: null, question: { id: UUID(), difficulty: 'HARD', type: 'MULTIPLE_CHOICE', content: 'Q3', options: [] } },
        { id: 'eq-4', position: 4, package_id: null, question: { id: UUID(), difficulty: 'HARD', type: 'MULTIPLE_CHOICE', content: 'Q4', options: [] } },
      ];

      mockPrisma.examToken.findUnique.mockResolvedValue({
        id: UUID(),
        token: 'POOL123',
        expires_at: new Date(Date.now() + 3600000),
        exam: {
          id: examId,
          status: ExamStatus.PUBLISHED,
          start_at: new Date(Date.now() - 3600000),
          end_at: new Date(Date.now() + 3600000),
          randomize_questions: false,
          randomize_answers: false,
          duration_minutes: 60,
          is_random_pool: true,
          pool_question_count: 2,
          pool_mode: 'BALANCED',
        },
      });
      mockPrisma.student.findUnique.mockResolvedValue({ id: studentId, class_id: UUID() });
      mockPrisma.examClass.findFirst.mockResolvedValue({ id: UUID() });
      mockPrisma.examSession.findFirst
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null);
      mockPrisma.examPackage.findMany.mockResolvedValue([]);
      mockPrisma.examSession.create.mockResolvedValue({
        id: 'pool-session',
        exam_id: examId,
        status: SessionStatus.ACTIVE,
        exam: {
          is_random_pool: true,
          pool_question_count: 2,
          pool_mode: 'BALANCED',
          randomize_questions: false,
          randomize_answers: false,
          exam_questions: candidateQuestions,
        },
      });

      const result = await service.start({ token: 'POOL123', device_id: 'device-pool' }, 'user-1');
      expect(result.questions).toHaveLength(2);
      expect(mockPrisma.examSession.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'pool-session' },
          data: expect.objectContaining({
            question_order: expect.arrayContaining([expect.any(String)]),
          }),
        }),
      );
    });

    it('should include audio_url, audio_play_limit and exam violation settings in start output', async () => {
      const examId = UUID();
      const studentId = UUID();
      const questionId = UUID();

      mockPrisma.examToken.findUnique.mockResolvedValue({
        id: UUID(),
        token: 'AUDIO123',
        expires_at: new Date(Date.now() + 3600000),
        exam: {
          id: examId,
          status: ExamStatus.PUBLISHED,
          start_at: new Date(Date.now() - 3600000),
          end_at: new Date(Date.now() + 3600000),
          randomize_questions: false,
          randomize_answers: false,
          duration_minutes: 60,
          violation_vibration_enabled: true,
          violation_alarm_enabled: true,
          violation_alarm_duration_seconds: 5,
          violation_alarm_sound: 'siren',
        },
      });
      mockPrisma.student.findUnique.mockResolvedValue({ id: studentId, class_id: UUID() });
      mockPrisma.examClass.findFirst.mockResolvedValue({ id: UUID() });
      mockPrisma.examSession.findFirst
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null);
      mockPrisma.examPackage.findMany.mockResolvedValue([]);
      mockPrisma.examSession.create.mockResolvedValue({
        id: 'session-audio',
        exam_id: examId,
        status: SessionStatus.ACTIVE,
        exam: {
          id: examId,
          violation_vibration_enabled: true,
          violation_alarm_enabled: true,
          violation_alarm_duration_seconds: 5,
          violation_alarm_sound: 'siren',
          exam_questions: [
            {
              id: 'eq-audio-1',
              position: 1,
              package_id: null,
              question: {
                id: questionId,
                type: 'MULTIPLE_CHOICE',
                content: 'Listen to the audio and choose the correct answer',
                image_url: null,
                audio_url: 'https://example.com/audio/listening-1.mp3',
                audio_play_limit: 2,
                options: [
                  { id: 'opt-1', content: 'Option A', image_url: null },
                  { id: 'opt-2', content: 'Option B', image_url: null },
                ],
              },
            },
          ],
          randomize_questions: false,
          randomize_answers: false,
        },
      });

      const result = await service.start({ token: 'AUDIO123', device_id: 'device-1' }, 'user-1');

      expect(result.questions).toHaveLength(1);
      expect((result.questions[0] as any).question.audio_url).toBe('https://example.com/audio/listening-1.mp3');
      expect((result.questions[0] as any).question.audio_play_limit).toBe(2);
      expect((result.exam as any).violation_vibration_enabled).toBe(true);
      expect((result.exam as any).violation_alarm_enabled).toBe(true);
      expect((result.exam as any).violation_alarm_duration_seconds).toBe(5);
      expect((result.exam as any).violation_alarm_sound).toBe('siren');
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

    it('should include audio_url, audio_play_limit and exam violation settings in resume output', async () => {
      const studentId = UUID();
      const questionId = UUID();
      mockPrisma.student.findUnique.mockResolvedValue({ id: studentId });
      mockPrisma.examSession.findUnique.mockResolvedValue({
        id: UUID(),
        student_id: studentId,
        status: SessionStatus.ACTIVE,
        package_id: null,
        question_order: ['eq-audio-1'],
        exam: {
          randomize_questions: false,
          randomize_answers: false,
          violation_vibration_enabled: false,
          violation_alarm_enabled: true,
          violation_alarm_duration_seconds: 3,
          violation_alarm_sound: 'digital_pulse',
          exam_questions: [
            {
              id: 'eq-audio-1',
              position: 1,
              package_id: null,
              question: {
                id: questionId,
                type: 'MULTIPLE_CHOICE',
                content: 'Listening Comprehension',
                image_url: null,
                audio_url: 'https://example.com/audio/dialogue.wav',
                audio_play_limit: 3,
                options: [{ id: 'opt-1', content: 'Response A', image_url: null }],
              },
            },
          ],
        },
        package: null,
      });
      mockPrisma.examSession.update.mockResolvedValue({});

      const result = await service.resume({ session_id: UUID() }, 'user-1');

      expect(result.questions).toHaveLength(1);
      expect((result.questions[0] as any).question.audio_url).toBe('https://example.com/audio/dialogue.wav');
      expect((result.questions[0] as any).question.audio_play_limit).toBe(3);
      expect((result.exam as any).violation_vibration_enabled).toBe(false);
      expect((result.exam as any).violation_alarm_enabled).toBe(true);
      expect((result.exam as any).violation_alarm_duration_seconds).toBe(3);
      expect((result.exam as any).violation_alarm_sound).toBe('digital_pulse');
    });

    it('should return saved answers map on resume', async () => {
      const studentId = UUID();
      const questionId = UUID();
      mockPrisma.student.findUnique.mockResolvedValue({ id: studentId });
      mockPrisma.examSession.findUnique.mockResolvedValue({
        id: UUID(),
        student_id: studentId,
        status: SessionStatus.ACTIVE,
        package_id: null,
        remaining_time_seconds: 2400,
        warning_count: 1,
        question_order: ['eq-1'],
        answers: [{ question_id: questionId, answer_text: 'Jawaban tersimpan' }],
        student: { full_name: 'Budi Student' },
        exam: {
          end_at: new Date(Date.now() + 3600 * 1000),
          duration_minutes: 60,
          randomize_questions: false,
          randomize_answers: false,
          warning_limit: 5,
          auto_submit_enabled: true,
          exam_questions: [
            {
              id: 'eq-1',
              position: 1,
              package_id: null,
              question: { id: questionId, type: 'SHORT_ANSWER', content: 'Q?', options: [] },
            },
          ],
        },
      });
      mockPrisma.examSession.update.mockResolvedValue({});

      const result = await service.resume({ session_id: UUID() }, 'user-1');

      expect(result.answers).toEqual({ [questionId]: 'Jawaban tersimpan' });
      expect(result.remaining_time_seconds).toBe(2400);
      expect(result.warning_count).toBe(1);
      expect(result.auto_submit_required).toBe(false);
    });

    it('should increment warning_count, emit alert, and mark auto_submit_required when resumed_from_exit hits limit', async () => {
      const studentId = UUID();
      const sessionId = UUID();
      const examId = UUID();
      mockPrisma.student.findUnique.mockResolvedValue({ id: studentId });
      mockPrisma.examSession.findUnique.mockResolvedValue({
        id: sessionId,
        exam_id: examId,
        student_id: studentId,
        status: SessionStatus.ACTIVE,
        package_id: null,
        remaining_time_seconds: 1800,
        warning_count: 4,
        question_order: [],
        answers: [],
        student: { full_name: 'Ahmad Siswa' },
        exam: {
          id: examId,
          end_at: new Date(Date.now() + 3600 * 1000),
          duration_minutes: 60,
          randomize_questions: false,
          randomize_answers: false,
          warning_limit: 5,
          auto_submit_enabled: true,
          exam_questions: [],
        },
      });
      mockPrisma.examSession.update.mockResolvedValue({});

      const result = await service.resume({ session_id: sessionId, resumed_from_exit: true }, 'user-1');

      expect(mockPrisma.examSession.update).toHaveBeenCalledWith({
        where: { id: sessionId },
        data: { status: SessionStatus.ACTIVE, warning_count: 5 },
      });
      expect(mockEventEmitter.emit).toHaveBeenCalledWith(SocketEvent.WARNING_TRIGGERED, expect.objectContaining({
        sessionId,
        studentName: 'Ahmad Siswa',
        count: 5,
        event: 'APP_EXITED',
      }));
      expect(result.warning_count).toBe(5);
      expect(result.auto_submit_required).toBe(true);
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

    it('should throw ForbiddenException if show_results is disabled by teacher', async () => {
      const studentId = UUID();
      const sessionId = UUID();
      mockPrisma.student.findUnique.mockResolvedValue({ id: studentId });

      const pastEnd = new Date(Date.now() - 3600000);
      mockPrisma.examSession.findUnique.mockResolvedValue({
        id: sessionId,
        student_id: studentId,
        status: SessionStatus.SUBMITTED,
        exam: {
          id: UUID(),
          title: 'Finished Exam Without Results',
          status: ExamStatus.FINISHED,
          end_at: pastEnd,
          show_results: false,
          subject: { name: 'Matematika' },
          exam_questions: [],
        },
        answers: [],
        score: { total_score: 100 },
        student: { full_name: 'Test Student' },
      });

      await expect(service.getReview(sessionId, 'user-1')).rejects.toThrow(
        'Pembahasan dan nilai ujian dinonaktifkan oleh guru pengampu.',
      );
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

  describe('forceSubmit()', () => {
    it('should throw NotFoundException if session does not exist', async () => {
      mockPrisma.examSession.findUnique.mockResolvedValue(null);
      await expect(service.forceSubmit(UUID(), 'proctor-1')).rejects.toThrow(NotFoundException);
    });

    it('should return session if already submitted', async () => {
      const sessionId = UUID();
      const existing = {
        id: sessionId,
        status: SessionStatus.SUBMITTED,
        student: { full_name: 'Test Student', user_id: 'user-std' },
      };
      mockPrisma.examSession.findUnique.mockResolvedValue(existing);

      const result = await service.forceSubmit(sessionId, 'proctor-1');
      expect(result).toBe(existing);
      expect(mockPrisma.$transaction).not.toHaveBeenCalled();
    });

    it('should force submit active session, log FORCED_SUBMIT, and emit events', async () => {
      const sessionId = UUID();
      const examId = UUID();
      const studentId = UUID();
      const studentUserId = 'user-std';
      mockPrisma.examSession.findUnique.mockResolvedValue({
        id: sessionId,
        exam_id: examId,
        student_id: studentId,
        status: SessionStatus.ACTIVE,
        student: { full_name: 'Test Student', user_id: studentUserId },
      });

      mockPrisma.$transaction.mockImplementation(async (fn: any) => {
        const tx = { ...mockPrisma };
        tx.examSession = {
          update: vi.fn().mockResolvedValue({ id: sessionId, status: SessionStatus.SUBMITTED }),
        };
        tx.sessionLog = { create: vi.fn().mockResolvedValue({}) };
        tx.score = { upsert: vi.fn().mockResolvedValue({}) };
        tx.setting = { findFirst: vi.fn().mockResolvedValue({ passing_grade: 75 }) };
        return fn(tx);
      });

      mockGradingService.calculateTotalScore.mockResolvedValue({
        total_score: 85, correct_count: 8, wrong_count: 2, essay_score: 0, total_questions: 10,
      });

      const result = await service.forceSubmit(sessionId, 'proctor-1');
      expect(mockPrisma.$transaction).toHaveBeenCalled();
      expect(result.status).toBe(SessionStatus.SUBMITTED);
      expect(mockEventEmitter.emit).toHaveBeenCalledWith(SocketEvent.SESSION_FORCE_SUBMIT, expect.objectContaining({
        sessionId,
        examId,
        studentId,
        studentUserId,
      }));
      expect(mockEventEmitter.emit).toHaveBeenCalledWith(SocketEvent.SESSION_FINISHED, expect.objectContaining({
        sessionId,
        examId,
        studentId,
      }));
    });

    it('should record proctor teacher full_name in session log instead of raw user ID', async () => {
      const sessionId = UUID();
      const examId = UUID();
      const studentId = UUID();
      const proctorUserId = UUID();

      mockPrisma.examSession.findUnique.mockResolvedValue({
        id: sessionId,
        exam_id: examId,
        student_id: studentId,
        status: SessionStatus.ACTIVE,
        student: { full_name: 'Test Student', user_id: 'user-std' },
      });

      mockPrisma.user.findUnique.mockResolvedValue({
        username: 'pak_budi',
        teacher: { full_name: 'Budi Santoso, S.Pd.' },
      });

      let capturedLogData: any;
      mockPrisma.$transaction.mockImplementation(async (fn: any) => {
        const tx = { ...mockPrisma };
        tx.examSession = {
          update: vi.fn().mockResolvedValue({ id: sessionId, status: SessionStatus.SUBMITTED }),
        };
        tx.sessionLog = {
          create: vi.fn().mockImplementation(async ({ data }: any) => {
            capturedLogData = data;
            return {};
          }),
        };
        tx.score = { upsert: vi.fn().mockResolvedValue({}) };
        tx.setting = { findFirst: vi.fn().mockResolvedValue({ passing_grade: 75 }) };
        return fn(tx);
      });

      mockGradingService.calculateTotalScore.mockResolvedValue({
        total_score: 85, correct_count: 8, wrong_count: 2, essay_score: 0, total_questions: 10,
      });

      await service.forceSubmit(sessionId, proctorUserId);
      expect(capturedLogData?.description).toContain('Budi Santoso, S.Pd.');
      expect(capturedLogData?.description).not.toContain(proctorUserId);
    });
  });

  describe('resetWarnings()', () => {
    it('should throw NotFoundException if session not found', async () => {
      mockPrisma.examSession.findUnique.mockResolvedValue(null);
      await expect(service.resetWarnings(UUID(), 'proctor-1')).rejects.toThrow(NotFoundException);
    });

    it('should reset warning count to 0 and log WARNINGS_RESET', async () => {
      const sessionId = UUID();
      const examId = UUID();
      const studentId = UUID();
      const studentUserId = 'user-std';
      mockPrisma.examSession.findUnique.mockResolvedValue({
        id: sessionId,
        exam_id: examId,
        student_id: studentId,
        warning_count: 3,
        student: { full_name: 'Student Strike', user_id: studentUserId },
      });

      mockPrisma.$transaction.mockImplementation(async (fn: any) => {
        const tx = { ...mockPrisma };
        tx.examSession = {
          update: vi.fn().mockResolvedValue({ id: sessionId, warning_count: 0 }),
        };
        tx.sessionLog = { create: vi.fn().mockResolvedValue({}) };
        return fn(tx);
      });

      const result = await service.resetWarnings(sessionId, 'proctor-1');
      expect(result.warning_count).toBe(0);
      expect(mockEventEmitter.emit).toHaveBeenCalledWith(SocketEvent.SESSION_WARNINGS_RESET, expect.objectContaining({
        sessionId,
        examId,
        studentUserId,
        warningCount: 0,
      }));
    });
  });

  describe('extendTime()', () => {
    it('should throw BadRequestException if additional minutes <= 0', async () => {
      await expect(service.extendTime(UUID(), 0, 'proctor-1')).rejects.toThrow(BadRequestException);
      await expect(service.extendTime(UUID(), -5, 'proctor-1')).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException if session not found', async () => {
      mockPrisma.examSession.findUnique.mockResolvedValue(null);
      await expect(service.extendTime(UUID(), 10, 'proctor-1')).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if session is already completed', async () => {
      mockPrisma.examSession.findUnique.mockResolvedValue({
        id: UUID(),
        status: SessionStatus.SUBMITTED,
        student: { full_name: 'Done Student', user_id: 'user-1' },
      });
      await expect(service.extendTime(UUID(), 10, 'proctor-1')).rejects.toThrow(BadRequestException);
    });

    it('should extend remaining time by specified minutes and emit event', async () => {
      const sessionId = UUID();
      const examId = UUID();
      const studentId = UUID();
      const studentUserId = 'user-std';
      mockPrisma.examSession.findUnique.mockResolvedValue({
        id: sessionId,
        exam_id: examId,
        student_id: studentId,
        status: SessionStatus.ACTIVE,
        remaining_time_seconds: 300,
        student: { full_name: 'Active Student', user_id: studentUserId },
      });

      mockPrisma.$transaction.mockImplementation(async (fn: any) => {
        const tx = { ...mockPrisma };
        tx.examSession = {
          update: vi.fn().mockResolvedValue({ id: sessionId, remaining_time_seconds: 900 }),
        };
        tx.sessionLog = { create: vi.fn().mockResolvedValue({}) };
        return fn(tx);
      });

      const result = await service.extendTime(sessionId, 10, 'proctor-1');
      expect(result.remaining_time_seconds).toBe(900);
      expect(mockEventEmitter.emit).toHaveBeenCalledWith(SocketEvent.SESSION_TIME_EXTENDED, expect.objectContaining({
        sessionId,
        examId,
        studentUserId,
        additionalMinutes: 10,
        additionalSeconds: 600,
        remainingTimeSeconds: 900,
      }));
    });
  });

  describe('unlockSession()', () => {
    it('should throw NotFoundException if session not found', async () => {
      mockPrisma.examSession.findUnique.mockResolvedValue(null);
      await expect(service.unlockSession(UUID(), 'proctor-1')).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if session completed', async () => {
      mockPrisma.examSession.findUnique.mockResolvedValue({
        id: UUID(),
        status: SessionStatus.SUBMITTED,
        student: { full_name: 'Done Student', user_id: 'user-1' },
      });
      await expect(service.unlockSession(UUID(), 'proctor-1')).rejects.toThrow(BadRequestException);
    });

    it('should unlock session, clear device_id, set status ACTIVE, and emit event', async () => {
      const sessionId = UUID();
      const examId = UUID();
      const studentId = UUID();
      const studentUserId = 'user-std';
      mockPrisma.examSession.findUnique.mockResolvedValue({
        id: sessionId,
        exam_id: examId,
        student_id: studentId,
        status: SessionStatus.PAUSED,
        device_id: 'locked-dev-123',
        student: { full_name: 'Locked Student', user_id: studentUserId },
      });

      mockPrisma.$transaction.mockImplementation(async (fn: any) => {
        const tx = { ...mockPrisma };
        tx.examSession = {
          update: vi.fn().mockResolvedValue({ id: sessionId, device_id: null, status: SessionStatus.ACTIVE }),
        };
        tx.sessionLog = { create: vi.fn().mockResolvedValue({}) };
        return fn(tx);
      });

      const result = await service.unlockSession(sessionId, 'proctor-1');
      expect(result.device_id).toBeNull();
      expect(result.status).toBe(SessionStatus.ACTIVE);
      expect(mockEventEmitter.emit).toHaveBeenCalledWith(SocketEvent.SESSION_UNLOCKED, expect.objectContaining({
        sessionId,
        examId,
        studentUserId,
      }));
    });
  });

  describe('syncTime()', () => {
    it('should update remaining_time_seconds for active session', async () => {
      const studentId = UUID();
      const sessionId = UUID();
      mockPrisma.student.findUnique.mockResolvedValue({ id: studentId });
      mockPrisma.examSession.findUnique.mockResolvedValue({
        id: sessionId,
        student_id: studentId,
        status: SessionStatus.ACTIVE,
      });
      mockPrisma.examSession.update.mockResolvedValue({ id: sessionId, remaining_time_seconds: 1500 });

      const result = await service.syncTime({ session_id: sessionId, remaining_time_seconds: 1500 }, 'user-1');
      expect(mockPrisma.examSession.update).toHaveBeenCalledWith({
        where: { id: sessionId },
        data: { remaining_time_seconds: 1500 },
      });
      expect(result.remaining_time_seconds).toBe(1500);
    });
  });
});
