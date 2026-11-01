import { describe, it, expect } from 'vitest';
import { createExamSchema, updateExamSchema } from '../exam.schema';
import { SocketEvent } from '../../enums';

describe('Exam Attempts Schemas & Enums', () => {
  it('accepts valid max_attempts values (null, 1, 2, 5) and defaults to 1', () => {
    const valid1 = createExamSchema.safeParse({
      title: 'Ujian Matematika',
      subject_id: '11111111-1111-1111-1111-111111111111',
      duration_minutes: 60,
      start_at: '2026-11-01T08:00:00Z',
      end_at: '2026-11-01T10:00:00Z',
      class_ids: ['11111111-1111-1111-1111-111111111111'],
      question_ids: ['11111111-1111-1111-1111-111111111111'],
      max_attempts: 3,
    });
    expect(valid1.success).toBe(true);
    if (valid1.success) {
      expect(valid1.data.max_attempts).toBe(3);
    }

    const validUnlimited = createExamSchema.safeParse({
      title: 'Ujian Latihan',
      subject_id: '11111111-1111-1111-1111-111111111111',
      duration_minutes: 60,
      start_at: '2026-11-01T08:00:00Z',
      end_at: '2026-11-01T10:00:00Z',
      class_ids: ['11111111-1111-1111-1111-111111111111'],
      question_ids: ['11111111-1111-1111-1111-111111111111'],
      max_attempts: null,
    });
    expect(validUnlimited.success).toBe(true);
    if (validUnlimited.success) {
      expect(validUnlimited.data.max_attempts).toBeNull();
    }

    const defaultAttempt = createExamSchema.safeParse({
      title: 'Ujian Default',
      subject_id: '11111111-1111-1111-1111-111111111111',
      duration_minutes: 60,
      start_at: '2026-11-01T08:00:00Z',
      end_at: '2026-11-01T10:00:00Z',
      class_ids: ['11111111-1111-1111-1111-111111111111'],
      question_ids: ['11111111-1111-1111-1111-111111111111'],
    });
    expect(defaultAttempt.success).toBe(true);
    if (defaultAttempt.success) {
      expect(defaultAttempt.data.max_attempts).toBe(1);
    }
  });

  it('allows optional/nullable max_attempts in updateExamSchema', () => {
    const updateValid = updateExamSchema.safeParse({
      max_attempts: 5,
    });
    expect(updateValid.success).toBe(true);

    const updateNull = updateExamSchema.safeParse({
      max_attempts: null,
    });
    expect(updateNull.success).toBe(true);
  });

  it('rejects non-positive numbers other than null for max_attempts', () => {
    const invalidZero = createExamSchema.safeParse({
      title: 'Ujian Error',
      subject_id: '11111111-1111-1111-1111-111111111111',
      duration_minutes: 60,
      start_at: '2026-11-01T08:00:00Z',
      end_at: '2026-11-01T10:00:00Z',
      class_ids: ['11111111-1111-1111-1111-111111111111'],
      question_ids: ['11111111-1111-1111-1111-111111111111'],
      max_attempts: 0,
    });
    expect(invalidZero.success).toBe(false);

    const invalidNegative = createExamSchema.safeParse({
      title: 'Ujian Error Negatif',
      subject_id: '11111111-1111-1111-1111-111111111111',
      duration_minutes: 60,
      start_at: '2026-11-01T08:00:00Z',
      end_at: '2026-11-01T10:00:00Z',
      class_ids: ['11111111-1111-1111-1111-111111111111'],
      question_ids: ['11111111-1111-1111-1111-111111111111'],
      max_attempts: -1,
    });
    expect(invalidNegative.success).toBe(false);
  });

  it('includes SESSION_ATTEMPT_GRANTED socket event', () => {
    expect((SocketEvent as any).SESSION_ATTEMPT_GRANTED).toBe('session.attempt_granted');
  });
});
