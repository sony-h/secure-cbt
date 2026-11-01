import { describe, it, expect } from 'vitest';
import {
  createQuestionSchema,
  updateQuestionSchema,
  QuestionType,
  DifficultyLevel,
  SocketEvent,
} from '../../index';

describe('Task 1: Shared Enums and Schemas', () => {
  it('should define SocketEvent.SESSION_WARNINGS_ADJUSTED', () => {
    expect((SocketEvent as any).SESSION_WARNINGS_ADJUSTED).toBe('session.warnings_adjusted');
  });

  it('should accept optional case_sensitive boolean in createQuestionSchema for SHORT_ANSWER', () => {
    const validData = {
      question_bank_id: '00000000-0000-0000-0000-000000000001',
      type: QuestionType.SHORT_ANSWER,
      content: 'Apa ibukota Indonesia?',
      difficulty: DifficultyLevel.MEDIUM,
      case_sensitive: true,
      options: [{ content: 'Nusantara', is_correct: true }],
    };
    const parsed = createQuestionSchema.parse(validData);
    expect((parsed as any).case_sensitive).toBe(true);
  });

  it('should default case_sensitive to false if omitted', () => {
    const validData = {
      question_bank_id: '00000000-0000-0000-0000-000000000001',
      type: QuestionType.SHORT_ANSWER,
      content: 'Apa ibukota Indonesia?',
      difficulty: DifficultyLevel.MEDIUM,
      options: [{ content: 'Nusantara', is_correct: true }],
    };
    const parsed = createQuestionSchema.parse(validData);
    expect((parsed as any).case_sensitive).toBe(false);
  });

  it('should accept case_sensitive in updateQuestionSchema', () => {
    const parsed = updateQuestionSchema.parse({
      case_sensitive: true,
    });
    expect((parsed as any).case_sensitive).toBe(true);
  });
});
