'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Modal } from '@/components/ui/modal';
import { BasicInfoStep } from './exam-steps/basic-info-step';
import { ClassesStep } from './exam-steps/classes-step';
import { QuestionsStep } from './exam-steps/questions-step';
import { SettingsStep } from './exam-steps/settings-step';

interface Subject { id: string; name: string; code: string; }
interface Class { id: string; name: string; major?: { name: string }; }
interface Question { id: string; content: string; type: string; difficulty: string; question_bank: { id: string; title: string; subject: { name: string } }; }
interface QuestionBank { id: string; title: string; subject: { name: string }; _count: { questions: number }; }

export interface ExamFormData {
  title: string;
  description: string;
  subject_id: string;
  duration_minutes: number;
  start_at: string;
  end_at: string;
  class_ids: string[];
  question_ids: string[];
  package_count: number;
  randomize_questions: boolean;
  randomize_answers: boolean;
  warning_limit: number;
  auto_submit_enabled: boolean;
  fullscreen_required: boolean;
}

export const emptyExamForm: ExamFormData = {
  title: '', description: '', subject_id: '', duration_minutes: 60,
  start_at: '', end_at: '', class_ids: [], question_ids: [],
  package_count: 1, randomize_questions: false, randomize_answers: false,
  warning_limit: 3, auto_submit_enabled: true, fullscreen_required: true,
};

export function CreateExamModal({
  open, onClose, form, setForm, subjects, classes, banks, questions,
  bankFilter, setBankFilter, onSave, isEditing,
}: {
  open: boolean; onClose: () => void; form: ExamFormData; setForm: (f: ExamFormData) => void;
  subjects: Subject[]; classes: Class[]; banks: QuestionBank[]; questions: Question[];
  bankFilter: string; setBankFilter: (v: string) => void; onSave: () => void; isEditing: boolean;
}) {
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (open) setStep(0);
  }, [open]);

  const steps = ['Info Dasar', 'Kelas', 'Soal', 'Pengaturan'];

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEditing ? 'Edit Ujian' : 'Buat Ujian Baru'}
    >
      <div className="flex items-center gap-2 mb-6">
        {steps.map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <button
              onClick={() => setStep(i)}
              className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition ${
                i === step ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
              }`}
            >
              {i + 1}
            </button>
            <span className={`text-sm ${i === step ? 'font-medium' : 'text-muted-foreground'}`}>{s}</span>
            {i < steps.length - 1 && <div className="w-6 h-px bg-border" />}
          </div>
        ))}
      </div>

      <div key={step} className="animate-in fade-in slide-in-from-right-4 duration-200">
        {step === 0 && <BasicInfoStep form={form} setForm={setForm} subjects={subjects} />}
        {step === 1 && <ClassesStep form={form} setForm={setForm} classes={classes} />}
        {step === 2 && <QuestionsStep form={form} setForm={setForm} banks={banks} questions={questions} bankFilter={bankFilter} setBankFilter={setBankFilter} />}
        {step === 3 && <SettingsStep form={form} setForm={setForm} />}
      </div>

      <div className="flex justify-between mt-6 pt-4 border-t">
        <div>
          {step > 0 && (
            <Button variant="outline" onClick={() => setStep(step - 1)}>Sebelumnya</Button>
          )}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onClose}>Batal</Button>
          {step < 3 ? (
            <Button onClick={() => setStep(step + 1)}>Selanjutnya</Button>
          ) : (
            <Button onClick={onSave}>{isEditing ? 'Simpan' : 'Buat Ujian'}</Button>
          )}
        </div>
      </div>
    </Modal>
  );
}
