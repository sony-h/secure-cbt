import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { SettingsStep } from '../exam-steps/settings-step';
import type { ExamFormData } from '../create-exam-modal';

describe('SettingsStep', () => {
  const baseForm: ExamFormData = {
    title: 'Test Exam',
    description: '',
    subject_id: 'sub-1',
    duration_minutes: 60,
    start_at: '',
    end_at: '',
    class_ids: [],
    question_ids: ['q-1', 'q-2'],
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
    show_explanation: false,
    max_attempts: 1,
    violation_vibration_enabled: true,
    violation_alarm_enabled: true,
    violation_alarm_duration_seconds: 3,
    violation_alarm_sound: 'sharp_beep',
  };

  it('renders both show_results and show_explanation settings options', () => {
    const setForm = vi.fn();
    render(<SettingsStep form={baseForm} setForm={setForm} />);

    expect(screen.getByText('Tampilkan Nilai ke Siswa')).toBeTruthy();
    expect(screen.getByText('Tampilkan Pembahasan & Kunci Jawaban')).toBeTruthy();
  });

  it('toggles show_explanation independently from show_results', () => {
    const setForm = vi.fn();
    render(<SettingsStep form={baseForm} setForm={setForm} />);

    const explanationLabel = screen.getByText('Tampilkan Pembahasan & Kunci Jawaban');
    fireEvent.click(explanationLabel);

    expect(setForm).toHaveBeenCalledWith(
      expect.objectContaining({
        show_explanation: true,
      })
    );
  });
});
