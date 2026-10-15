import { NotFoundException } from '@nestjs/common';
import { GradingService } from '../grading.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { QuestionType } from '@secure-cbt/shared';
import { vi, describe, it, expect, beforeEach } from 'vitest';

function UUID() { return crypto.randomUUID?.() ?? '00000000-0000-0000-0000-000000000001'; }

describe('GradingService', () => {
  let service: GradingService;
  let mockPrisma: any;
  let mockEventEmitter: { emit: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    mockPrisma = {
      answer: { findUnique: vi.fn(), update: vi.fn() },
      examSession: { findUnique: vi.fn(), findMany: vi.fn() },
      questionOption: { findMany: vi.fn() },
      score: { upsert: vi.fn(), findFirst: vi.fn(), findUnique: vi.fn() },
      sessionLog: { create: vi.fn().mockResolvedValue({}), findMany: vi.fn().mockResolvedValue([]) },
      setting: { findFirst: vi.fn().mockResolvedValue({ passing_grade: 70 }) },
      $transaction: vi.fn((fn: any) => fn(mockPrisma)),
    };
    mockEventEmitter = { emit: vi.fn() };
    service = new GradingService(mockPrisma as any, mockEventEmitter as any);
  });

  describe('gradeEssay()', () => {
    it('should update answer score, log ESSAY_GRADED in SessionLog for initial grading, and call calculateTotalScore in transaction', async () => {
      const answerId = UUID();
      const sessionId = UUID();
      const questionId = UUID();
      const graderId = UUID();

      mockPrisma.answer.findUnique.mockResolvedValue({
        id: answerId,
        score: null,
        feedback: null,
        question: { type: QuestionType.ESSAY },
      });
      mockPrisma.answer.update.mockResolvedValue({});
      mockPrisma.examSession.findUnique.mockResolvedValue({
        id: sessionId, answers: [], package: null, exam: { exam_questions: [] },
      });
      mockPrisma.score.upsert.mockResolvedValue({});

      const result = await service.gradeEssay(
        { session_id: sessionId, question_id: questionId, score: 80, feedback: 'Good answer' },
        graderId,
      );

      expect(mockPrisma.$transaction).toHaveBeenCalled();
      expect(mockPrisma.sessionLog.create).toHaveBeenCalledWith({
        data: {
          exam_session_id: sessionId,
          event: 'ESSAY_GRADED',
          description: expect.stringContaining('"score":80'),
        },
      });
      const logData = JSON.parse(mockPrisma.sessionLog.create.mock.calls[0][0].data.description);
      expect(logData).toMatchObject({
        question_id: questionId,
        score: 80,
        feedback: 'Good answer',
        grader_id: graderId,
      });
      expect(mockPrisma.answer.update).toHaveBeenCalledWith({
        where: { id: answerId },
        data: { score: 80, is_correct: true, feedback: 'Good answer' },
      });
      expect(result).toEqual({ graded: true });
    });

    it('should log ESSAY_REVISED in SessionLog when revising an already graded essay', async () => {
      const answerId = UUID();
      const sessionId = UUID();
      const questionId = UUID();
      const graderId = UUID();

      mockPrisma.answer.findUnique.mockResolvedValue({
        id: answerId,
        score: 70,
        feedback: 'Initial feedback',
        question: { type: QuestionType.ESSAY },
      });
      mockPrisma.answer.update.mockResolvedValue({});
      mockPrisma.examSession.findUnique.mockResolvedValue({
        id: sessionId, answers: [], package: null, exam: { exam_questions: [] },
      });
      mockPrisma.score.upsert.mockResolvedValue({});

      const result = await service.gradeEssay(
        {
          session_id: sessionId,
          question_id: questionId,
          score: 85,
          feedback: 'Improved feedback',
          revision_note: 'Student provided additional supporting details',
        },
        graderId,
      );

      expect(mockPrisma.sessionLog.create).toHaveBeenCalledWith({
        data: {
          exam_session_id: sessionId,
          event: 'ESSAY_REVISED',
          description: expect.stringContaining('"previous_score":70'),
        },
      });
      const logData = JSON.parse(mockPrisma.sessionLog.create.mock.calls[0][0].data.description);
      expect(logData).toMatchObject({
        question_id: questionId,
        previous_score: 70,
        new_score: 85,
        previous_feedback: 'Initial feedback',
        new_feedback: 'Improved feedback',
        revision_note: 'Student provided additional supporting details',
        grader_id: graderId,
      });
      expect(mockPrisma.answer.update).toHaveBeenCalledWith({
        where: { id: answerId },
        data: { score: 85, is_correct: true, feedback: 'Improved feedback' },
      });
      expect(result).toEqual({ graded: true });
    });

    it('should throw NotFoundException if answer not found', async () => {
      mockPrisma.answer.findUnique.mockResolvedValue(null);

      await expect(
        service.gradeEssay({ session_id: UUID(), question_id: UUID(), score: 80 }, UUID()),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('calculateTotalScore()', () => {
    it('should auto-grade objective questions using PrismaTransactionClient', async () => {
      const tx = {
        examSession: { findUnique: vi.fn() },
        questionOption: { findMany: vi.fn() },
        answer: { update: vi.fn() },
      };
      const questionId = UUID();
      tx.examSession.findUnique.mockResolvedValue({
        id: UUID(), package_id: null,
        answers: [{
          id: UUID(), question_id: questionId, answer_text: 'opt-2',
          score: null, is_correct: null,
          question: { type: QuestionType.MULTIPLE_CHOICE },
        }],
        exam: { exam_questions: [{ id: UUID(), package_id: null }] },
      });
      tx.questionOption.findMany.mockResolvedValue([{ id: 'opt-2', is_correct: true }]);
      tx.answer.update.mockResolvedValue({});

      const result = await service.calculateTotalScore(tx as any, UUID());

      expect(tx.questionOption.findMany).toHaveBeenCalledWith({
        where: { question_id: questionId },
        orderBy: { order: 'asc' },
      });
      expect(tx.answer.update).toHaveBeenCalledWith({
        where: { id: result.correct_count > 0 ? expect.any(String) : expect.any(String) },
        data: { is_correct: true, score: 100 },
      });
      expect(result.total_score).toBe(100);
      expect(result.correct_count).toBe(1);
      expect(result.wrong_count).toBe(0);
    });

    it('should auto-grade SHORT_ANSWER questions case-insensitively', async () => {
      const tx = {
        examSession: { findUnique: vi.fn() },
        questionOption: { findMany: vi.fn() },
        answer: { update: vi.fn() },
      };
      const questionId = UUID();
      tx.examSession.findUnique.mockResolvedValue({
        id: UUID(), package_id: null,
        answers: [{
          id: UUID(), question_id: questionId, answer_text: '  Nusantara  ',
          score: null, is_correct: null,
          question: { type: QuestionType.SHORT_ANSWER },
        }],
        exam: { exam_questions: [{ id: UUID(), package_id: null }] },
      });
      tx.questionOption.findMany.mockResolvedValue([
        { id: 'opt-1', content: 'IKN' },
        { id: 'opt-2', content: 'nusantara' },
      ]);
      tx.answer.update.mockResolvedValue({});

      const result = await service.calculateTotalScore(tx as any, UUID());

      expect(tx.answer.update).toHaveBeenCalledWith({
        where: { id: expect.any(String) },
        data: { is_correct: true, score: 100 },
      });
      expect(result.total_score).toBe(100);
      expect(result.correct_count).toBe(1);
      expect(result.wrong_count).toBe(0);
    });

    it('should auto-grade MATCHING questions with partial credit', async () => {
      const tx = {
        examSession: { findUnique: vi.fn() },
        questionOption: { findMany: vi.fn() },
        answer: { update: vi.fn() },
      };
      const questionId = UUID();
      const pair1Id = 'pair-1';
      const pair2Id = 'pair-2';

      tx.examSession.findUnique.mockResolvedValue({
        id: UUID(), package_id: null,
        answers: [{
          id: UUID(), question_id: questionId,
          // Student matched pair1 correctly, pair2 wrongly
          answer_text: JSON.stringify({ [pair1Id]: pair1Id, [pair2Id]: 'wrong-pair' }),
          score: null, is_correct: null,
          question: { type: QuestionType.MATCHING },
        }],
        exam: { exam_questions: [{ id: UUID(), package_id: null }] },
      });
      tx.questionOption.findMany.mockResolvedValue([
        { id: pair1Id, content: JSON.stringify({ left: 'A', right: '1' }) },
        { id: pair2Id, content: JSON.stringify({ left: 'B', right: '2' }) },
      ]);
      tx.answer.update.mockResolvedValue({});

      const result = await service.calculateTotalScore(tx as any, UUID());

      // 1 of 2 pairs correct = 50%
      expect(tx.answer.update).toHaveBeenCalledWith({
        where: { id: expect.any(String) },
        data: { is_correct: false, score: 50 },
      });
      expect(result.total_score).toBe(50);
      expect(result.correct_count).toBe(1);
    });

    it('should throw NotFoundException if session not found', async () => {
      const tx = { examSession: { findUnique: vi.fn().mockResolvedValue(null) } };
      await expect(service.calculateTotalScore(tx as any, UUID())).rejects.toThrow(NotFoundException);
    });

    it('should re-evaluate objective questions previously graded wrong when forceReevaluate is true', async () => {
      const tx = {
        examSession: { findUnique: vi.fn() },
        questionOption: { findMany: vi.fn() },
        answer: { update: vi.fn() },
      };
      const questionId = UUID();
      tx.examSession.findUnique.mockResolvedValue({
        id: UUID(), package_id: null,
        answers: [{
          id: UUID(), question_id: questionId, answer_text: 'opt-new-correct',
          score: 0, is_correct: false, // previously evaluated wrong
          question: { type: QuestionType.MULTIPLE_CHOICE },
        }],
        exam: { exam_questions: [{ id: UUID(), package_id: null }] },
      });
      tx.questionOption.findMany.mockResolvedValue([
        { id: 'opt-new-correct', content: 'Correct Answer', is_correct: true, order: 1 },
      ]);
      tx.answer.update.mockResolvedValue({});

      // With forceReevaluate = true, it should recalculate and become correct
      const result = await service.calculateTotalScore(tx as any, UUID(), { forceReevaluate: true });

      expect(tx.answer.update).toHaveBeenCalledWith({
        where: { id: expect.any(String) },
        data: { is_correct: true, score: 100 },
      });
      expect(result.total_score).toBe(100);
      expect(result.correct_count).toBe(1);
    });

    it('should resolve stale option UUID by order or content fallback when options were regenerated', async () => {
      const tx = {
        examSession: { findUnique: vi.fn() },
        questionOption: { findMany: vi.fn() },
        answer: { update: vi.fn() },
      };
      const questionId = UUID();
      tx.examSession.findUnique.mockResolvedValue({
        id: UUID(), package_id: null,
        answers: [{
          id: UUID(), question_id: questionId,
          // Student answered with old option UUID or content that matches option 2
          answer_text: 'opt-old-uuid-2',
          score: null, is_correct: null,
          question: { type: QuestionType.MULTIPLE_CHOICE },
        }],
        exam: { exam_questions: [{ id: UUID(), package_id: null }] },
      });
      // Current DB options has new UUIDs, but opt-new-2 is correct and matches order 2
      tx.questionOption.findMany.mockResolvedValue([
        { id: 'opt-new-1', content: 'Wrong', is_correct: false, order: 1 },
        { id: 'opt-new-2', content: 'opt-old-uuid-2', is_correct: true, order: 2 },
      ]);
      tx.answer.update.mockResolvedValue({});

      const result = await service.calculateTotalScore(tx as any, UUID());

      expect(result.correct_count).toBe(1);
      expect(result.total_score).toBe(100);
    });

    it('should never overwrite manual essay scores during forceReevaluate', async () => {
      const tx = {
        examSession: { findUnique: vi.fn() },
        questionOption: { findMany: vi.fn() },
        answer: { update: vi.fn() },
      };
      const questionId = UUID();
      tx.examSession.findUnique.mockResolvedValue({
        id: UUID(), package_id: null,
        answers: [{
          id: UUID(), question_id: questionId,
          answer_text: 'Student essay text',
          score: 85, is_correct: true, feedback: 'Great explanation',
          question: { type: QuestionType.ESSAY },
        }],
        exam: { exam_questions: [{ id: UUID(), package_id: null }] },
      });

      const result = await service.calculateTotalScore(tx as any, UUID(), { forceReevaluate: true });

      // answer.update should NOT be called for essay to overwrite score
      expect(tx.answer.update).not.toHaveBeenCalled();
      expect(result.essay_score).toBe(85);
      expect(result.total_score).toBe(85);
    });
  });

  describe('regradeExam()', () => {
    it('should re-evaluate all submitted sessions for an exam and return score changes', async () => {
      const examId = UUID();
      const graderId = UUID();
      const sessionId = UUID();

      mockPrisma.exam = { findUnique: vi.fn().mockResolvedValue({ id: examId, title: 'KKA Exam' }) };
      mockPrisma.examSession.findMany = vi.fn().mockResolvedValue([
        {
          id: sessionId,
          student_id: UUID(),
          student: { full_name: 'Ahmad Siswa', nis: '202501001' },
          score: { total_score: 0 },
        },
      ]);
      mockPrisma.score.findUnique = vi.fn().mockResolvedValue({ total_score: 0 });
      mockPrisma.score.upsert = vi.fn().mockResolvedValue({});

      // Mock calculateTotalScore internal behavior
      vi.spyOn(service, 'calculateTotalScore').mockResolvedValue({
        total_score: 100,
        raw_points_earned: 10,
        raw_points_possible: 10,
        correct_count: 5,
        wrong_count: 0,
        essay_score: 0,
        total_questions: 5,
      });

      const res = await service.regradeExam(examId, graderId);

      expect(mockPrisma.examSession.findMany).toHaveBeenCalled();
      expect(service.calculateTotalScore).toHaveBeenCalledWith(
        mockPrisma,
        sessionId,
        { forceReevaluate: true },
      );
      expect(res.regraded_count).toBe(1);
      expect(res.score_changes).toHaveLength(1);
      expect(res.score_changes[0]).toEqual({
        session_id: sessionId,
        student_name: 'Ahmad Siswa',
        nis: '202501001',
        old_score: 0,
        new_score: 100,
      });
    });
  });

  describe('regradeSession()', () => {
    it('should re-evaluate a single session and update score', async () => {
      const sessionId = UUID();
      const graderId = UUID();

      mockPrisma.examSession.findUnique = vi.fn().mockResolvedValue({
        id: sessionId,
        student: { full_name: 'Budi Siswa', nis: '202501002' },
        score: { total_score: 50 },
      });
      mockPrisma.score.upsert = vi.fn().mockResolvedValue({});

      vi.spyOn(service, 'calculateTotalScore').mockResolvedValue({
        total_score: 80,
        raw_points_earned: 8,
        raw_points_possible: 10,
        correct_count: 4,
        wrong_count: 1,
        essay_score: 0,
        total_questions: 5,
      });

      const res = await service.regradeSession(sessionId, graderId);

      expect(res).toEqual({
        session_id: sessionId,
        student_name: 'Budi Siswa',
        nis: '202501002',
        old_score: 50,
        new_score: 80,
      });
    });
  });

  describe('getEssayHistory()', () => {
    it('should query SessionLog and return formatted history sorted newest first for matching questionId', async () => {
      const sessionId = UUID();
      const questionId = UUID();
      const otherQuestionId = UUID();
      const graderId = UUID();

      const logGraded = {
        id: UUID(),
        event: 'ESSAY_GRADED',
        exam_session_id: sessionId,
        description: JSON.stringify({
          question_id: questionId,
          score: 75,
          feedback: 'Cukup baik',
          grader_id: graderId,
          timestamp: '2026-10-15T10:00:00.000Z',
        }),
        created_at: new Date('2026-10-15T10:00:00.000Z'),
      };

      const logRevised = {
        id: UUID(),
        event: 'ESSAY_REVISED',
        exam_session_id: sessionId,
        description: JSON.stringify({
          question_id: questionId,
          previous_score: 75,
          new_score: 90,
          previous_feedback: 'Cukup baik',
          new_feedback: 'Analisis mendalam',
          revision_note: 'Siswa menambahkan argumentasi valid',
          grader_id: graderId,
          timestamp: '2026-10-15T11:00:00.000Z',
        }),
        created_at: new Date('2026-10-15T11:00:00.000Z'),
      };

      const logOtherQuestion = {
        id: UUID(),
        event: 'ESSAY_GRADED',
        exam_session_id: sessionId,
        description: JSON.stringify({
          question_id: otherQuestionId,
          score: 60,
          feedback: 'Perlu revisi',
          grader_id: graderId,
          timestamp: '2026-10-15T10:30:00.000Z',
        }),
        created_at: new Date('2026-10-15T10:30:00.000Z'),
      };

      // Mock returns ordered by created_at desc (newest first)
      mockPrisma.sessionLog.findMany.mockResolvedValue([logRevised, logOtherQuestion, logGraded]);

      const history = await service.getEssayHistory(sessionId, questionId);

      expect(mockPrisma.sessionLog.findMany).toHaveBeenCalledWith({
        where: {
          exam_session_id: sessionId,
          event: { in: ['ESSAY_GRADED', 'ESSAY_REVISED'] },
        },
        orderBy: { created_at: 'desc' },
      });

      expect(history).toHaveLength(2);
      expect(history[0]).toMatchObject({
        id: logRevised.id,
        event: 'ESSAY_REVISED',
        question_id: questionId,
        previous_score: 75,
        new_score: 90,
        revision_note: 'Siswa menambahkan argumentasi valid',
        grader_id: graderId,
      });
      expect(history[1]).toMatchObject({
        id: logGraded.id,
        event: 'ESSAY_GRADED',
        question_id: questionId,
        score: 75,
        feedback: 'Cukup baik',
        grader_id: graderId,
      });
    });
  });

  describe('getPendingEssays()', () => {
    const examId = UUID();

    it('should query with status "pending" by default', async () => {
      mockPrisma.examSession.findMany.mockResolvedValue([
        {
          id: 'ses-1',
          student: { full_name: 'Student 1', nis: '001', class: { name: 'XII-A' } },
          answers: [
            { score: null, question: { type: QuestionType.ESSAY } },
            { score: 80, question: { type: QuestionType.ESSAY } },
          ],
        },
      ]);

      const res = await service.getPendingEssays(examId);

      expect(mockPrisma.examSession.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            exam_id: examId,
            answers: {
              some: {
                question: { type: QuestionType.ESSAY },
                score: null,
              },
            },
          }),
        }),
      );
      expect(res).toEqual([
        {
          session_id: 'ses-1',
          student_name: 'Student 1',
          nis: '001',
          class_name: 'XII-A',
          pending_count: 1,
          graded_count: 1,
          total_essays: 2,
        },
      ]);
    });

    it('should query with status "completed" when specified', async () => {
      mockPrisma.examSession.findMany.mockResolvedValue([
        {
          id: 'ses-2',
          student: { full_name: 'Student 2', nis: '002', class: { name: 'XII-B' } },
          answers: [
            { score: 90, question: { type: QuestionType.ESSAY } },
            { score: 85, question: { type: QuestionType.ESSAY } },
          ],
        },
      ]);

      const res = await service.getPendingEssays(examId, undefined, 'completed');

      expect(mockPrisma.examSession.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            exam_id: examId,
            answers: {
              some: { question: { type: QuestionType.ESSAY } },
              none: { question: { type: QuestionType.ESSAY }, score: null },
            },
          }),
        }),
      );
      expect(res).toEqual([
        {
          session_id: 'ses-2',
          student_name: 'Student 2',
          nis: '002',
          class_name: 'XII-B',
          pending_count: 0,
          graded_count: 2,
          total_essays: 2,
        },
      ]);
    });

    it('should query with status "all" when specified', async () => {
      mockPrisma.examSession.findMany.mockResolvedValue([]);

      await service.getPendingEssays(examId, undefined, 'all');

      expect(mockPrisma.examSession.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            exam_id: examId,
            answers: {
              some: { question: { type: QuestionType.ESSAY } },
            },
          }),
        }),
      );
    });
  });
});
