import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { RandomPoolCard } from '../random-pool-card';
import type { ExamFormData } from '../create-exam-modal';

describe('RandomPoolCard', () => {
  const baseForm: ExamFormData = {
    title: 'Test Exam',
    description: '',
    subject_id: 'sub-1',
    duration_minutes: 60,
    start_at: '',
    end_at: '',
    class_ids: [],
    question_ids: ['q-1', 'q-2', 'q-3', 'q-4', 'q-5'],
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
  };

  it('renders disabled state when is_random_pool is false', () => {
    const setForm = vi.fn();
    render(<RandomPoolCard form={baseForm} setForm={setForm} totalSelectedQuestions={5} />);

    expect(screen.getByText(/Ambil Sebagian Soal Secara Acak/i)).toBeTruthy();
    expect(screen.queryByLabelText(/Jumlah Soal Dikerjakan/i)).toBeNull();
  });

  it('renders pool inputs and difficulty point inputs when is_random_pool is true', () => {
    const activeForm: ExamFormData = {
      ...baseForm,
      is_random_pool: true,
      pool_question_count: 3,
    };
    const setForm = vi.fn();
    render(<RandomPoolCard form={activeForm} setForm={setForm} totalSelectedQuestions={5} />);

    expect(screen.getByLabelText(/Jumlah Soal Dikerjakan/i)).toBeTruthy();
    expect(screen.getByText(/Seimbang/i)).toBeTruthy();
    expect(screen.getByText(/Acak Murni/i)).toBeTruthy();
    expect(screen.getByLabelText(/Mudah/i)).toBeTruthy();
    expect(screen.getByLabelText(/Sedang/i)).toBeTruthy();
    expect(screen.getByLabelText(/Sukar/i)).toBeTruthy();
  });

  it('calls setForm when toggling switch or modifying point weights', () => {
    const setForm = vi.fn();
    render(<RandomPoolCard form={baseForm} setForm={setForm} totalSelectedQuestions={5} />);

    const switchBtn = screen.getByRole('switch');
    fireEvent.click(switchBtn);

    expect(setForm).toHaveBeenCalledWith(
      expect.objectContaining({
        is_random_pool: true,
        pool_question_count: 5,
      }),
    );
  });
});
