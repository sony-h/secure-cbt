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
});
