import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GradingService } from '../grading.service';
import { QuestionType } from '@secure-cbt/shared';

describe('GradingService - Difficulty Point Weighting & Dual Scoring', () => {
  let service: GradingService;
  let mockPrisma: any;
  let mockEventEmitter: any;

  beforeEach(() => {
    mockPrisma = {
      answer: { findUnique: vi.fn(), update: vi.fn() },
      examSession: { findUnique: vi.fn() },
      questionOption: { findMany: vi.fn() },
      score: { upsert: vi.fn(), findUnique: vi.fn() },
      setting: { findFirst: vi.fn().mockResolvedValue({ passing_grade: 70 }) },
      $transaction: vi.fn((fn: any) => fn(mockPrisma)),
    };
    mockEventEmitter = { emit: vi.fn() };
    service = new GradingService(mockPrisma as any, mockEventEmitter as any);
  });

  it('calculates weighted raw points and normalized score (0-100) based on question difficulty', async () => {
    const qEasy = { id: 'q-easy', difficulty: 'EASY', type: QuestionType.MULTIPLE_CHOICE };
    const qMed = { id: 'q-med', difficulty: 'MEDIUM', type: QuestionType.MULTIPLE_CHOICE };
    const qHard = { id: 'q-hard', difficulty: 'HARD', type: QuestionType.MULTIPLE_CHOICE };

    const tx = {
      examSession: { findUnique: vi.fn() },
      questionOption: { findMany: vi.fn() },
      answer: { update: vi.fn() },
    };

    tx.examSession.findUnique.mockResolvedValue({
      id: 'session-1',
      question_order: null,
      package_id: null,
      exam: {
        points_easy: 1,
        points_medium: 2,
        points_hard: 3,
        exam_questions: [
          { id: 'eq-1', package_id: null, question: qEasy },
          { id: 'eq-2', package_id: null, question: qMed },
          { id: 'eq-3', package_id: null, question: qHard },
        ],
      },
      answers: [
        {
          id: 'ans-1',
          question_id: 'q-easy',
          question: qEasy,
          score: 100,
          is_correct: true,
          answer_text: 'opt-easy-1',
        },
        {
          id: 'ans-2',
          question_id: 'q-med',
          question: qMed,
          score: 100,
          is_correct: true,
          answer_text: 'opt-med-1',
        },
        {
          id: 'ans-3',
          question_id: 'q-hard',
          question: qHard,
          score: 0,
          is_correct: false,
          answer_text: 'wrong-opt',
        },
      ],
    });

    const result = await service.calculateTotalScore(tx as any, 'session-1');

    // Total possible = 1 (easy) + 2 (med) + 3 (hard) = 6 points
    // Earned = 1 (easy correct) + 2 (med correct) + 0 (hard wrong) = 3 points
    // Normalized score = (3 / 6) * 100 = 50.00
    expect(result.raw_points_possible).toBe(6);
    expect(result.raw_points_earned).toBe(3);
    expect(result.total_score).toBe(50);
    expect(result.correct_count).toBe(2);
    expect(result.wrong_count).toBe(1);
    expect(result.total_questions).toBe(3);
  });

  it('calculates score based on question_order subset when random pool is used', async () => {
    const qEasy = { id: 'q-easy', difficulty: 'EASY', type: QuestionType.MULTIPLE_CHOICE };
    const qMed = { id: 'q-med', difficulty: 'MEDIUM', type: QuestionType.MULTIPLE_CHOICE };
    const qHard = { id: 'q-hard', difficulty: 'HARD', type: QuestionType.MULTIPLE_CHOICE };

    const tx = {
      examSession: { findUnique: vi.fn() },
      questionOption: { findMany: vi.fn() },
      answer: { update: vi.fn() },
    };

    // Bank has 3 questions, but student session was assigned only eq-1 and eq-3
    tx.examSession.findUnique.mockResolvedValue({
      id: 'session-2',
      question_order: ['eq-1', 'eq-3'],
      package_id: null,
      exam: {
        points_easy: 2,
        points_medium: 3,
        points_hard: 5,
        exam_questions: [
          { id: 'eq-1', package_id: null, question: qEasy },
          { id: 'eq-2', package_id: null, question: qMed },
          { id: 'eq-3', package_id: null, question: qHard },
        ],
      },
      answers: [
        {
          id: 'ans-1',
          question_id: 'q-easy',
          question: qEasy,
          score: 100,
          is_correct: true,
          answer_text: 'opt-easy-1',
        },
        {
          id: 'ans-3',
          question_id: 'q-hard',
          question: qHard,
          score: 0,
          is_correct: false,
          answer_text: 'wrong-opt',
        },
      ],
    });

    const result = await service.calculateTotalScore(tx as any, 'session-2');

    // Possible = 2 (easy) + 5 (hard) = 7
    // Earned = 2 (easy correct) = 2
    // Normalized score = (2 / 7) * 100 = 28.57
    expect(result.raw_points_possible).toBe(7);
    expect(result.raw_points_earned).toBe(2);
    expect(result.total_score).toBeCloseTo(28.57, 2);
    expect(result.total_questions).toBe(2);
  });
});
