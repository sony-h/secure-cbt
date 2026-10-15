import { NotFoundException } from '@nestjs/common';
import { ReportService } from '../report.service';
import { QuestionType, SessionStatus, DifficultyLevel } from '@secure-cbt/shared';
import { vi, describe, it, expect, beforeEach } from 'vitest';

function UUID() { return crypto.randomUUID?.() ?? '00000000-0000-0000-0000-000000000001'; }

describe('ReportService', () => {
  let service: ReportService;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      exam: { findFirst: vi.fn(), findUnique: vi.fn() },
      examSession: { findUnique: vi.fn(), findMany: vi.fn() },
      student: { findMany: vi.fn() },
      class: { findUnique: vi.fn() },
      setting: { findFirst: vi.fn() },
    };
    service = new ReportService(mockPrisma as any);
  });

  describe('getSessionReview()', () => {
    it('should throw NotFoundException if session is not found', async () => {
      mockPrisma.examSession.findUnique.mockResolvedValue(null);
      await expect(service.getSessionReview(UUID())).rejects.toThrow(NotFoundException);
    });

    it('should return session review with question details, student answer, key, and explanation even if exam is ongoing', async () => {
      const sessionId = UUID();
      const questionId = UUID();
      const opt1Id = UUID();
      const opt2Id = UUID();

      mockPrisma.examSession.findUnique.mockResolvedValue({
        id: sessionId,
        student_id: UUID(),
        status: SessionStatus.SUBMITTED,
        submitted_at: new Date('2026-10-15T10:00:00Z'),
        student: {
          full_name: 'Ahmad Siswa',
          nis: '202501001',
          class: { name: 'XII RPL 1' },
        },
        score: {
          total_score: 100,
          correct_count: 1,
          wrong_count: 0,
        },
        exam: {
          id: UUID(),
          title: 'Ujian KKA',
          subject: { name: 'KKA' },
          exam_questions: [
            {
              id: 'eq-1',
              position: 1,
              package_id: null,
              question: {
                id: questionId,
                type: QuestionType.MULTIPLE_CHOICE,
                content: 'Apa kepanjangan KKA?',
                image_url: null,
                difficulty: DifficultyLevel.EASY,
                explanation: 'KKA adalah Keamanan Komputer dan Jaringan',
                options: [
                  { id: opt1Id, content: 'Pilihan Salah', image_url: null, is_correct: false, order: 1 },
                  { id: opt2Id, content: 'Pilihan Benar', image_url: null, is_correct: true, order: 2 },
                ],
              },
            },
          ],
        },
        answers: [
          {
            question_id: questionId,
            answer_text: opt2Id,
            is_correct: true,
            score: 100,
            feedback: null,
          },
        ],
      });

      const result = await service.getSessionReview(sessionId);

      expect(result.session_id).toBe(sessionId);
      expect(result.student_name).toBe('Ahmad Siswa');
      expect(result.nis).toBe('202501001');
      expect(result.score).toBe(100);
      expect(result.questions).toHaveLength(1);
      expect(result.questions[0]).toEqual({
        id: questionId,
        number: 1,
        type: QuestionType.MULTIPLE_CHOICE,
        content: 'Apa kepanjangan KKA?',
        image_url: null,
        difficulty: DifficultyLevel.EASY,
        explanation: 'KKA adalah Keamanan Komputer dan Jaringan',
        student_answer: opt2Id,
        is_correct: true,
        score: 100,
        feedback: null,
        options: [
          { id: opt1Id, content: 'Pilihan Salah', image_url: null, is_correct: false, order: 1 },
          { id: opt2Id, content: 'Pilihan Benar', image_url: null, is_correct: true, order: 2 },
        ],
      });
    });
  });

  describe('getItemAnalysis()', () => {
    it('should throw NotFoundException if exam is not found', async () => {
      mockPrisma.exam.findFirst.mockResolvedValue(null);
      await expect(service.getItemAnalysis(UUID())).rejects.toThrow(NotFoundException);
    });

    it('should calculate difficulty index, pass rate, and distractor distribution across student sessions', async () => {
      const examId = UUID();
      const questionId = UUID();
      const optA = UUID();
      const optB = UUID();

      mockPrisma.exam.findFirst.mockResolvedValue({
        id: examId,
        title: 'Ujian Akhir Semester',
        exam_questions: [
          {
            id: 'eq-1',
            position: 1,
            question: {
              id: questionId,
              type: QuestionType.MULTIPLE_CHOICE,
              content: 'Soal 1',
              difficulty: DifficultyLevel.MEDIUM,
              options: [
                { id: optA, order: 1, content: 'Opsi A (Salah)', is_correct: false },
                { id: optB, order: 2, content: 'Opsi B (Benar)', is_correct: true },
              ],
            },
          },
        ],
      });

      // 4 student sessions submitted
      // 3 students answered Opt B (correct), 1 student answered Opt A (wrong)
      mockPrisma.examSession.findMany.mockResolvedValue([
        {
          id: UUID(),
          status: SessionStatus.SUBMITTED,
          answers: [{ question_id: questionId, answer_text: optB, is_correct: true }],
        },
        {
          id: UUID(),
          status: SessionStatus.SUBMITTED,
          answers: [{ question_id: questionId, answer_text: optB, is_correct: true }],
        },
        {
          id: UUID(),
          status: SessionStatus.SUBMITTED,
          answers: [{ question_id: questionId, answer_text: optB, is_correct: true }],
        },
        {
          id: UUID(),
          status: SessionStatus.SUBMITTED,
          answers: [{ question_id: questionId, answer_text: optA, is_correct: false }],
        },
      ]);

      const result = await service.getItemAnalysis(examId);

      expect(result.exam_id).toBe(examId);
      expect(result.total_sessions).toBe(4);
      expect(result.questions).toHaveLength(1);

      const qAnalysis = result.questions[0];
      expect(qAnalysis.question_id).toBe(questionId);
      expect(qAnalysis.number).toBe(1);
      expect(qAnalysis.total_answered).toBe(4);
      expect(qAnalysis.correct_count).toBe(3);
      expect(qAnalysis.wrong_count).toBe(1);
      expect(qAnalysis.difficulty_index).toBe(0.75); // 3 / 4
      expect(qAnalysis.pass_rate).toBe(75);
      expect(qAnalysis.distractor_distribution).toEqual([
        {
          option_id: optA,
          order: 1,
          content: 'Opsi A (Salah)',
          is_correct: false,
          count: 1,
          percentage: 25,
        },
        {
          option_id: optB,
          order: 2,
          content: 'Opsi B (Benar)',
          is_correct: true,
          count: 3,
          percentage: 75,
        },
      ]);
    });

    it('should handle questions with 0 answered sessions without dividing by zero', async () => {
      const examId = UUID();
      const questionId = UUID();

      mockPrisma.exam.findFirst.mockResolvedValue({
        id: examId,
        title: 'Ujian Kosong',
        exam_questions: [
          {
            id: 'eq-1',
            position: 1,
            question: {
              id: questionId,
              type: QuestionType.MULTIPLE_CHOICE,
              content: 'Soal Belum Ada Yang Jawab',
              difficulty: DifficultyLevel.EASY,
              options: [],
            },
          },
        ],
      });

      mockPrisma.examSession.findMany.mockResolvedValue([]);

      const result = await service.getItemAnalysis(examId);

      expect(result.total_sessions).toBe(0);
      expect(result.questions[0].difficulty_index).toBe(0);
      expect(result.questions[0].pass_rate).toBe(0);
    });
  });
});
