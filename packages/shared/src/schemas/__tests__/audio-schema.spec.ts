import { describe, it, expect } from 'vitest';
import {
  createQuestionSchema,
  updateQuestionSchema,
  createExamSchema,
  updateExamSchema,
  QuestionType,
  DifficultyLevel,
} from '../../index';

describe('Audio Stimulus and Violation Deterrence Schemas', () => {
  const baseValidQuestion = {
    question_bank_id: '00000000-0000-0000-0000-000000000001',
    type: QuestionType.MULTIPLE_CHOICE,
    content: 'Listen to the conversation and answer the question.',
    difficulty: DifficultyLevel.MEDIUM,
    options: [
      { content: 'Option A', is_correct: true },
      { content: 'Option B', is_correct: false },
    ],
  };

  const baseValidExam = {
    title: 'Ujian Bahasa Inggris Listening',
    subject_id: '00000000-0000-0000-0000-000000000002',
    duration_minutes: 60,
    start_at: new Date().toISOString(),
    end_at: new Date(Date.now() + 3600000).toISOString(),
    class_ids: ['00000000-0000-0000-0000-000000000003'],
    question_ids: ['00000000-0000-0000-0000-000000000004'],
  };

  describe('Question Schema - Audio Stimulus', () => {
    it('accepts valid audio_url and audio_play_limit', () => {
      const parsed = createQuestionSchema.parse({
        ...baseValidQuestion,
        audio_url: 'https://example.com/audio/listening-1.mp3',
        audio_play_limit: 2,
      });

      expect(parsed.audio_url).toBe('https://example.com/audio/listening-1.mp3');
      expect(parsed.audio_play_limit).toBe(2);
    });

    it('accepts boundary play limits (1 and 10)', () => {
      const parsedMin = createQuestionSchema.parse({
        ...baseValidQuestion,
        audio_play_limit: 1,
      });
      expect(parsedMin.audio_play_limit).toBe(1);

      const parsedMax = createQuestionSchema.parse({
        ...baseValidQuestion,
        audio_play_limit: 10,
      });
      expect(parsedMax.audio_play_limit).toBe(10);
    });

    it('accepts null or omitted audio fields', () => {
      const parsedNull = createQuestionSchema.parse({
        ...baseValidQuestion,
        audio_url: null,
        audio_play_limit: null,
      });
      expect(parsedNull.audio_url).toBeNull();
      expect(parsedNull.audio_play_limit).toBeNull();

      const parsedOmitted = createQuestionSchema.parse(baseValidQuestion);
      expect(parsedOmitted.audio_url).toBeUndefined();
      expect(parsedOmitted.audio_play_limit).toBeUndefined();
    });

    it('rejects invalid audio_url', () => {
      expect(() =>
        createQuestionSchema.parse({
          ...baseValidQuestion,
          audio_url: 'not-a-valid-url',
        }),
      ).toThrow();
    });

    it('rejects audio_play_limit < 1 (e.g. 0)', () => {
      expect(() =>
        createQuestionSchema.parse({
          ...baseValidQuestion,
          audio_play_limit: 0,
        }),
      ).toThrow();
    });

    it('rejects audio_play_limit > 10 (e.g. 11)', () => {
      expect(() =>
        createQuestionSchema.parse({
          ...baseValidQuestion,
          audio_play_limit: 11,
        }),
      ).toThrow();
    });

    it('rejects non-integer audio_play_limit', () => {
      expect(() =>
        createQuestionSchema.parse({
          ...baseValidQuestion,
          audio_play_limit: 2.5,
        }),
      ).toThrow();
    });

    it('supports audio fields in updateQuestionSchema', () => {
      const parsed = updateQuestionSchema.parse({
        audio_url: 'https://example.com/audio/updated.mp3',
        audio_play_limit: 3,
      });
      expect(parsed.audio_url).toBe('https://example.com/audio/updated.mp3');
      expect(parsed.audio_play_limit).toBe(3);

      expect(() =>
        updateQuestionSchema.parse({
          audio_play_limit: 0,
        }),
      ).toThrow();
    });
  });

  describe('Exam Schema - Violation Alarm & Deterrence Settings', () => {
    it('applies default violation alarm options when omitted', () => {
      const parsed = createExamSchema.parse(baseValidExam);

      expect(parsed.violation_vibration_enabled).toBe(true);
      expect(parsed.violation_alarm_enabled).toBe(true);
      expect(parsed.violation_alarm_duration_seconds).toBe(3);
      expect(parsed.violation_alarm_sound).toBe('sharp_beep');
    });

    it('accepts custom violation alarm options', () => {
      const parsed = createExamSchema.parse({
        ...baseValidExam,
        violation_vibration_enabled: false,
        violation_alarm_enabled: false,
        violation_alarm_duration_seconds: 5,
        violation_alarm_sound: 'siren',
      });

      expect(parsed.violation_vibration_enabled).toBe(false);
      expect(parsed.violation_alarm_enabled).toBe(false);
      expect(parsed.violation_alarm_duration_seconds).toBe(5);
      expect(parsed.violation_alarm_sound).toBe('siren');
    });

    it('accepts all valid violation alarm sounds', () => {
      const validSounds = ['sharp_beep', 'siren', 'digital_pulse', 'warning_radar'] as const;

      for (const sound of validSounds) {
        const parsed = createExamSchema.parse({
          ...baseValidExam,
          violation_alarm_sound: sound,
        });
        expect(parsed.violation_alarm_sound).toBe(sound);
      }
    });

    it('rejects invalid violation_alarm_duration_seconds (only 3 or 5 allowed)', () => {
      expect(() =>
        createExamSchema.parse({
          ...baseValidExam,
          violation_alarm_duration_seconds: 4,
        }),
      ).toThrow();

      expect(() =>
        createExamSchema.parse({
          ...baseValidExam,
          violation_alarm_duration_seconds: 10,
        }),
      ).toThrow();

      expect(() =>
        createExamSchema.parse({
          ...baseValidExam,
          violation_alarm_duration_seconds: 1,
        }),
      ).toThrow();
    });

    it('rejects unsupported violation alarm sound', () => {
      expect(() =>
        createExamSchema.parse({
          ...baseValidExam,
          violation_alarm_sound: 'unsupported_sound',
        }),
      ).toThrow();
    });

    it('validates violation deterrence fields in updateExamSchema', () => {
      const parsedEmpty = updateExamSchema.parse({});
      expect(parsedEmpty.violation_vibration_enabled).toBeUndefined();
      expect(parsedEmpty.violation_alarm_enabled).toBeUndefined();
      expect(parsedEmpty.violation_alarm_duration_seconds).toBeUndefined();
      expect(parsedEmpty.violation_alarm_sound).toBeUndefined();

      const parsedCustom = updateExamSchema.parse({
        violation_vibration_enabled: false,
        violation_alarm_duration_seconds: 5,
        violation_alarm_sound: 'digital_pulse',
      });
      expect(parsedCustom.violation_vibration_enabled).toBe(false);
      expect(parsedCustom.violation_alarm_duration_seconds).toBe(5);
      expect(parsedCustom.violation_alarm_sound).toBe('digital_pulse');

      expect(() =>
        updateExamSchema.parse({
          violation_alarm_duration_seconds: 7,
        }),
      ).toThrow();
    });
  });
});
