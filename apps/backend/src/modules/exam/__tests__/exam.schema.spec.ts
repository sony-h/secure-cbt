import { describe, it, expect } from 'vitest';
import { createExamSchema, updateExamSchema } from '@secure-cbt/shared';

describe('createExamSchema with Random Pool & Difficulty Point Weights', () => {
  const baseValidExam = {
    title: 'Ujian Harian Matematika',
    subject_id: '00000000-0000-0000-0000-000000000001',
    duration_minutes: 60,
    start_at: new Date().toISOString(),
    end_at: new Date(Date.now() + 3600000).toISOString(),
    class_ids: ['00000000-0000-0000-0000-000000000002'],
    question_ids: ['00000000-0000-0000-0000-000000000003'],
  };

  it('parses valid random pool configuration with custom points', () => {
    const input = {
      ...baseValidExam,
      is_random_pool: true,
      pool_question_count: 30,
      pool_mode: 'BALANCED',
      points_easy: 1,
      points_medium: 2,
      points_hard: 3,
    };

    const parsed = createExamSchema.parse(input);
    expect(parsed.is_random_pool).toBe(true);
    expect(parsed.pool_question_count).toBe(30);
    expect(parsed.pool_mode).toBe('BALANCED');
    expect(parsed.points_easy).toBe(1);
    expect(parsed.points_medium).toBe(2);
    expect(parsed.points_hard).toBe(3);
  });

  it('defaults is_random_pool to false and default difficulty points to 1, 2, 3', () => {
    const parsed = createExamSchema.parse(baseValidExam);
    expect(parsed.is_random_pool).toBe(false);
    expect(parsed.points_easy).toBe(1);
    expect(parsed.points_medium).toBe(2);
    expect(parsed.points_hard).toBe(3);
    expect(parsed.pool_mode).toBe('BALANCED');
  });

  it('rejects non-positive points or pool_question_count', () => {
    expect(() =>
      createExamSchema.parse({
        ...baseValidExam,
        is_random_pool: true,
        pool_question_count: 0,
      }),
    ).toThrow();

    expect(() =>
      createExamSchema.parse({
        ...baseValidExam,
        points_easy: -1,
      }),
    ).toThrow();
  });
});
