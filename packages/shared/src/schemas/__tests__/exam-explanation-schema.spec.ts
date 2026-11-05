import { describe, it, expect } from 'vitest';
import { createExamSchema, updateExamSchema } from '../exam.schema';

describe('Exam Explanation Visibility Schemas', () => {
  const baseValidExam = {
    title: 'Ujian Matematika',
    subject_id: '11111111-1111-1111-1111-111111111111',
    duration_minutes: 60,
    start_at: '2026-11-04T08:00:00Z',
    end_at: '2026-11-04T10:00:00Z',
    class_ids: ['11111111-1111-1111-1111-111111111111'],
    question_ids: ['11111111-1111-1111-1111-111111111111'],
  };

  it('defaults show_explanation to false in createExamSchema when omitted', () => {
    const res = createExamSchema.safeParse(baseValidExam);
    expect(res.success).toBe(true);
    if (res.success) {
      expect(res.data.show_explanation).toBe(false);
      expect(res.data.show_results).toBe(true);
    }
  });

  it('accepts explicit show_explanation boolean true in createExamSchema', () => {
    const res = createExamSchema.safeParse({
      ...baseValidExam,
      show_explanation: true,
    });
    expect(res.success).toBe(true);
    if (res.success) {
      expect(res.data.show_explanation).toBe(true);
    }
  });

  it('accepts show_explanation in updateExamSchema', () => {
    const res = updateExamSchema.safeParse({
      show_explanation: true,
    });
    expect(res.success).toBe(true);
    if (res.success) {
      expect(res.data.show_explanation).toBe(true);
    }
  });
});
