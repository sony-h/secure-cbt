import { describe, it, expect } from 'vitest';
import {
  importQuestionItemSchema,
  confirmImportQuestionsSchema,
  QuestionType,
  DifficultyLevel,
} from '@secure-cbt/shared';

describe('Question Import Schemas (Multi-Type Support)', () => {
  it('validates standard MULTIPLE_CHOICE question (>= 2 options)', () => {
    const input = {
      content: 'Ibu kota Indonesia adalah...',
      type: QuestionType.MULTIPLE_CHOICE,
      difficulty: DifficultyLevel.EASY,
      options: [
        { order: 1, content: 'Jakarta', is_correct: false },
        { order: 2, content: 'Nusantara', is_correct: true },
      ],
    };

    const parsed = importQuestionItemSchema.parse(input);
    expect(parsed.type).toBe(QuestionType.MULTIPLE_CHOICE);
    expect(parsed.options).toHaveLength(2);
  });

  it('validates MULTI_SELECT question with multiple correct answers', () => {
    const input = {
      content: 'Manakah bahasa pemrograman interpreted?',
      type: QuestionType.MULTI_SELECT,
      options: [
        { order: 1, content: 'Python', is_correct: true },
        { order: 2, content: 'JavaScript', is_correct: true },
        { order: 3, content: 'C++', is_correct: false },
      ],
    };

    const parsed = importQuestionItemSchema.parse(input);
    expect(parsed.type).toBe(QuestionType.MULTI_SELECT);
    expect(parsed.options.filter((o) => o.is_correct)).toHaveLength(2);
  });

  it('validates TRUE_FALSE question with Benar & Salah options', () => {
    const input = {
      content: 'Bumi itu bulat.',
      type: QuestionType.TRUE_FALSE,
      options: [
        { order: 1, content: 'Benar', is_correct: true },
        { order: 2, content: 'Salah', is_correct: false },
      ],
    };

    const parsed = importQuestionItemSchema.parse(input);
    expect(parsed.type).toBe(QuestionType.TRUE_FALSE);
    expect(parsed.options).toHaveLength(2);
  });

  it('validates SHORT_ANSWER question with 1 accepted answer option', () => {
    const input = {
      content: 'Bahasa resmi Brazil adalah...',
      type: QuestionType.SHORT_ANSWER,
      options: [
        { order: 1, content: 'Portugis', is_correct: true },
      ],
    };

    const parsed = importQuestionItemSchema.parse(input);
    expect(parsed.type).toBe(QuestionType.SHORT_ANSWER);
    expect(parsed.options).toHaveLength(1);
  });

  it('validates ESSAY question with 0 options', () => {
    const input = {
      content: 'Jelaskan perbedaan mitosis dan meiosis!',
      type: QuestionType.ESSAY,
      explanation: 'Mitosis terjadi pada sel somatis, meiosis pada sel gamet.',
      options: [],
    };

    const parsed = importQuestionItemSchema.parse(input);
    expect(parsed.type).toBe(QuestionType.ESSAY);
    expect(parsed.options).toHaveLength(0);
  });

  it('validates MATCHING question with paired options', () => {
    const input = {
      content: 'Jodohkanlah pahlawan dengan asalnya:',
      type: QuestionType.MATCHING,
      options: [
        { order: 1, content: JSON.stringify({ left: 'Kartini', right: 'Jepara' }), is_correct: true },
        { order: 2, content: JSON.stringify({ left: 'Diponegoro', right: 'Jogja' }), is_correct: true },
      ],
    };

    const parsed = importQuestionItemSchema.parse(input);
    expect(parsed.type).toBe(QuestionType.MATCHING);
    expect(parsed.options).toHaveLength(2);
  });

  it('rejects MULTIPLE_CHOICE with less than 2 options', () => {
    const input = {
      content: 'Soal tidak lengkap',
      type: QuestionType.MULTIPLE_CHOICE,
      options: [
        { order: 1, content: 'Opsi 1', is_correct: true },
      ],
    };

    expect(() => importQuestionItemSchema.parse(input)).toThrow();
  });

  it('rejects SHORT_ANSWER with 0 options', () => {
    const input = {
      content: 'Soal isian tanpa kunci',
      type: QuestionType.SHORT_ANSWER,
      options: [],
    };

    expect(() => importQuestionItemSchema.parse(input)).toThrow();
  });

  it('validates confirmImportQuestionsSchema with mixed question types including ESSAY and SHORT_ANSWER', () => {
    const input = {
      bank_id: '00000000-0000-0000-0000-000000000001',
      questions: [
        {
          content: 'Soal PG',
          type: QuestionType.MULTIPLE_CHOICE,
          difficulty: DifficultyLevel.EASY,
          options: [
            { order: 1, content: 'A', is_correct: true },
            { order: 2, content: 'B', is_correct: false },
          ],
        },
        {
          content: 'Soal Isian',
          type: QuestionType.SHORT_ANSWER,
          difficulty: DifficultyLevel.MEDIUM,
          options: [
            { order: 1, content: 'Kunci Isian', is_correct: true },
          ],
        },
        {
          content: 'Soal Esai',
          type: QuestionType.ESSAY,
          difficulty: DifficultyLevel.HARD,
          explanation: 'Rubrik esai',
          options: [],
        },
      ],
    };

    const parsed = confirmImportQuestionsSchema.parse(input);
    expect(parsed.questions).toHaveLength(3);
    expect(parsed.questions[2].options).toHaveLength(0);
  });

  it('rejects confirmImportQuestionsSchema when MULTIPLE_CHOICE has no correct answer', () => {
    const input = {
      bank_id: '00000000-0000-0000-0000-000000000001',
      questions: [
        {
          content: 'Soal tanpa kunci',
          type: QuestionType.MULTIPLE_CHOICE,
          options: [
            { order: 1, content: 'A', is_correct: false },
            { order: 2, content: 'B', is_correct: false },
          ],
        },
      ],
    };

    expect(() => confirmImportQuestionsSchema.parse(input)).toThrow(
      /Minimal 1 opsi harus ditandai sebagai kunci jawaban benar/,
    );
  });

  it('rejects confirmImportQuestionsSchema when MATCHING option JSON is incomplete', () => {
    const input = {
      bank_id: '00000000-0000-0000-0000-000000000001',
      questions: [
        {
          content: 'Jodohkan:',
          type: QuestionType.MATCHING,
          options: [
            { order: 1, content: JSON.stringify({ left: 'A', right: '' }), is_correct: true },
            { order: 2, content: JSON.stringify({ left: 'B', right: 'Target B' }), is_correct: true },
          ],
        },
      ],
    };

    expect(() => confirmImportQuestionsSchema.parse(input)).toThrow(
      /Pasangan opsi ke-1 tidak lengkap/,
    );
  });
});
