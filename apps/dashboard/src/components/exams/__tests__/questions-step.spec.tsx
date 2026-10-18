import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { QuestionsStep } from '../exam-steps/questions-step';
import type { ExamFormData } from '../create-exam-modal';

describe('QuestionsStep Select All', () => {
  const baseForm: ExamFormData = {
    title: 'Test Exam',
    description: '',
    subject_id: 'sub-1',
    duration_minutes: 60,
    start_at: '',
    end_at: '',
    class_ids: [],
    question_ids: [],
    package_count: 1,
    randomize_questions: false,
    randomize_answers: false,
    warning_limit: 3,
    auto_submit_enabled: true,
    fullscreen_required: true,
    is_random_pool: false,
    pool_question_count: null,
    pool_mode: 'BALANCED',
    points_easy: 1,
    points_medium: 2,
    points_hard: 3,
    show_results: true,
    violation_vibration_enabled: true,
    violation_alarm_enabled: true,
    violation_alarm_duration_seconds: 3,
    violation_alarm_sound: 'sharp_beep',
  };

  const sampleQuestions = [
    { id: 'q-1', content: 'Soal 1', type: 'MULTIPLE_CHOICE', difficulty: 'EASY', question_bank: { id: 'b-1', title: 'Bank 1', subject: { name: 'MTK' } } },
    { id: 'q-2', content: 'Soal 2', type: 'MULTIPLE_CHOICE', difficulty: 'MEDIUM', question_bank: { id: 'b-1', title: 'Bank 1', subject: { name: 'MTK' } } },
    { id: 'q-3', content: 'Soal 3', type: 'ESSAY', difficulty: 'HARD', question_bank: { id: 'b-2', title: 'Bank 2', subject: { name: 'MTK' } } },
  ];

  const sampleBanks = [
    { id: 'b-1', title: 'Bank 1', subject: { name: 'MTK' }, _count: { questions: 2 } },
    { id: 'b-2', title: 'Bank 2', subject: { name: 'MTK' }, _count: { questions: 1 } },
  ];

  it('renders select all toggle and selects all filtered questions when clicked', () => {
    const setForm = vi.fn();
    render(
      <QuestionsStep
        form={baseForm}
        setForm={setForm}
        banks={sampleBanks}
        questions={sampleQuestions}
        bankFilter="all"
        setBankFilter={vi.fn()}
      />
    );

    const selectAllBtn = screen.getByTestId('select-all-questions');
    expect(selectAllBtn).toBeTruthy();

    fireEvent.click(selectAllBtn);
    expect(setForm).toHaveBeenCalledWith(
      expect.objectContaining({
        question_ids: ['q-1', 'q-2', 'q-3'],
      }),
    );
  });

  it('deselects all filtered questions when all filtered are already selected', () => {
    const setForm = vi.fn();
    const allSelectedForm: ExamFormData = {
      ...baseForm,
      question_ids: ['q-1', 'q-2', 'q-3'],
    };

    render(
      <QuestionsStep
        form={allSelectedForm}
        setForm={setForm}
        banks={sampleBanks}
        questions={sampleQuestions}
        bankFilter="all"
        setBankFilter={vi.fn()}
      />
    );

    const selectAllBtn = screen.getByTestId('select-all-questions');
    fireEvent.click(selectAllBtn);

    expect(setForm).toHaveBeenCalledWith(
      expect.objectContaining({
        question_ids: [],
      }),
    );
  });

  it('only selects filtered questions when a specific bank is filtered, keeping other selected questions', () => {
    const setForm = vi.fn();
    // q-3 from bank 2 is already selected
    const initialForm: ExamFormData = {
      ...baseForm,
      question_ids: ['q-3'],
    };

    render(
      <QuestionsStep
        form={initialForm}
        setForm={setForm}
        banks={sampleBanks}
        questions={sampleQuestions}
        bankFilter="b-1"
        setBankFilter={vi.fn()}
      />
    );

    const selectAllBtn = screen.getByTestId('select-all-questions');
    fireEvent.click(selectAllBtn);

    // Should now contain q-3 plus q-1 and q-2 from bank 1
    expect(setForm).toHaveBeenCalledWith(
      expect.objectContaining({
        question_ids: expect.arrayContaining(['q-1', 'q-2', 'q-3']),
      }),
    );
  });
});
