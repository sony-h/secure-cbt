import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { ViolationDeterrenceCard } from '../violation-deterrence-card';
import type { ExamFormData } from '../create-exam-modal';

describe('ViolationDeterrenceCard', () => {
  const baseForm: ExamFormData = {
    title: 'Test Exam',
    description: '',
    subject_id: 'sub-1',
    duration_minutes: 60,
    start_at: '',
    end_at: '',
    class_ids: [],
    question_ids: ['q-1'],
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

  it('renders violation deterrence switches and selectors when alarm is enabled', () => {
    const setForm = vi.fn();
    render(<ViolationDeterrenceCard form={baseForm} setForm={setForm} />);

    expect(screen.getByText(/Pengaturan Alarm & Getar Pelanggaran/i)).toBeDefined();
    expect(screen.getByText(/Getar HP Saat Terjadi Pelanggaran/i)).toBeDefined();
    expect(screen.getByText(/Bunyikan Alarm Suara Saat Terjadi Pelanggaran/i)).toBeDefined();
    expect(screen.getByText(/Durasi Alarm Pelanggaran/i)).toBeDefined();
    expect(screen.getByText(/Pilihan Nada Alarm \(Tone\)/i)).toBeDefined();
  });

  it('calls setForm when toggling vibration switch', () => {
    const setForm = vi.fn();
    render(<ViolationDeterrenceCard form={baseForm} setForm={setForm} />);

    const vibrationSwitch = screen.getByRole('switch', { name: /Getar HP Saat Terjadi Pelanggaran/i });
    fireEvent.click(vibrationSwitch);

    expect(setForm).toHaveBeenCalledWith(
      expect.objectContaining({
        violation_vibration_enabled: false,
      }),
    );
  });

  it('calls setForm when toggling alarm switch', () => {
    const setForm = vi.fn();
    render(<ViolationDeterrenceCard form={baseForm} setForm={setForm} />);

    const alarmSwitch = screen.getByRole('switch', { name: /Bunyikan Alarm Suara Saat Terjadi Pelanggaran/i });
    fireEvent.click(alarmSwitch);

    expect(setForm).toHaveBeenCalledWith(
      expect.objectContaining({
        violation_alarm_enabled: false,
      }),
    );
  });

  it('hides duration and sound tone selectors when alarm is disabled', () => {
    const disabledAlarmForm: ExamFormData = {
      ...baseForm,
      violation_alarm_enabled: false,
    };
    const setForm = vi.fn();
    render(<ViolationDeterrenceCard form={disabledAlarmForm} setForm={setForm} />);

    expect(screen.queryByText(/Durasi Alarm Pelanggaran/i)).toBeNull();
    expect(screen.queryByText(/Pilihan Nada Alarm \(Tone\)/i)).toBeNull();
  });
});
