'use client';

import { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '@/components/ui/select';
import { X, Plus } from 'lucide-react';
import { Modal } from '@/components/ui/modal';

export type QuestionFormData = {
  question_bank_id: string;
  type: string;
  content: string;
  difficulty: string;
  explanation: string;
  options: { content: string; is_correct: boolean }[];
  tags: string[];
};

type QuestionBank = {
  id: string;
  title: string;
  subject: { id: string; name: string; code: string };
};

export const questionTypes = [
  { value: 'MULTIPLE_CHOICE', label: 'Pilihan Ganda' },
  { value: 'MULTI_SELECT', label: 'Multi Pilih' },
  { value: 'TRUE_FALSE', label: 'Benar/Salah' },
  { value: 'SHORT_ANSWER', label: 'Isian Singkat' },
  { value: 'MATCHING', label: 'Menjodohkan' },
  { value: 'ESSAY', label: 'Esai' },
];

export const difficultyLevels = [
  { value: 'EASY', label: 'Mudah' },
  { value: 'MEDIUM', label: 'Sedang' },
  { value: 'HARD', label: 'Sulit' },
];

export const DEFAULT_OPTION_COUNT = 5;

export function makeEmptyOptions(count: number = DEFAULT_OPTION_COUNT) {
  return Array.from({ length: count }, () => ({ content: '', is_correct: false }));
}

export const emptyQuestionForm: QuestionFormData = {
  question_bank_id: '',
  type: 'MULTIPLE_CHOICE',
  content: '',
  difficulty: 'MEDIUM',
  explanation: '',
  options: makeEmptyOptions(),
  tags: [],
};

export function QuestionModal({
  open,
  onClose,
  form,
  setForm,
  banks,
  onSave,
  isEditing,
}: {
  open: boolean;
  onClose: () => void;
  form: QuestionFormData;
  setForm: (f: QuestionFormData) => void;
  banks: QuestionBank[];
  onSave: () => void;
  isEditing: boolean;
}) {
  const tagInputRef = useRef<HTMLInputElement>(null);

  const addTag = (tag: string) => {
    if (tag && !form.tags.includes(tag)) {
      setForm({ ...form, tags: [...form.tags, tag] });
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={isEditing ? 'Edit Soal' : 'Tambah Soal'} maxWidth="sm:max-w-2xl" footer={
      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={onClose}>Batal</Button>
        <Button onClick={onSave}>{isEditing ? 'Simpan' : 'Buat Soal'}</Button>
      </div>
    }>
      <div className="space-y-4 max-h-[65vh] overflow-y-auto pr-2">
        <div className="space-y-2">
          <Label>Bank Soal</Label>
          <Select value={form.question_bank_id} onValueChange={(v) => setForm({ ...form, question_bank_id: v })}>
            <SelectTrigger><SelectValue placeholder="Pilih Bank Soal" /></SelectTrigger>
            <SelectContent>
              {banks.map((b) => (
                <SelectItem key={b.id} value={b.id}>{b.title} ({b.subject.name})</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Tipe Soal</Label>
            <Select
              value={form.type}
              onValueChange={(v) => {
                let newOptions = form.options;
                if (v === 'TRUE_FALSE') {
                  newOptions = [
                    { content: 'Benar', is_correct: true },
                    { content: 'Salah', is_correct: false },
                  ];
                } else if (form.type === 'TRUE_FALSE' && v !== 'TRUE_FALSE') {
                  newOptions = makeEmptyOptions(5);
                }
                setForm({ ...form, type: v, options: newOptions });
              }}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {questionTypes.map((t) => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Tingkat Kesulitan</Label>
            <Select value={form.difficulty} onValueChange={(v) => setForm({ ...form, difficulty: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {difficultyLevels.map((d) => (
                  <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label>Pertanyaan</Label>
          <textarea
            className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={form.content}
            onChange={(e) => setForm({ ...form, content: e.target.value })}
            placeholder="Tulis pertanyaan di sini..."
          />
        </div>

        {form.type !== 'ESSAY' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Pilihan Jawaban</Label>
              <span className="text-xs text-muted-foreground">{form.options.length} opsi</span>
            </div>
            {form.options.map((opt, idx) => (
              <div key={idx} className="flex items-center gap-3">
                <span className="w-8 text-sm font-medium text-muted-foreground shrink-0">
                  {String.fromCharCode(65 + idx)}.
                </span>
                <Input
                  value={opt.content}
                    onChange={(e) => {
                      const newOpts = [...form.options];
                      const curr = newOpts[idx]!;
                      newOpts[idx] = { ...curr, content: e.target.value };
                    setForm({ ...form, options: newOpts });
                  }}
                  placeholder={`Pilihan ${String.fromCharCode(65 + idx)}`}
                />
                  <Checkbox id={`correct-${idx}`}
                    checked={opt.is_correct}
                    onCheckedChange={() => {
                      const newOpts = [...form.options];
                      if (form.type === 'MULTI_SELECT') {
                        const curr = newOpts[idx]!;
                        newOpts[idx] = { ...curr, is_correct: !opt.is_correct };
                      } else {
                        newOpts.forEach((opt, i) => {
                          newOpts[i] = { ...opt, is_correct: i === idx };
                        });
                      }
                      setForm({ ...form, options: newOpts });
                    }}
                  />
                <label htmlFor={`correct-${idx}`} className="flex items-center gap-1 text-sm cursor-pointer shrink-0">Benar</label>
                {form.type !== 'TRUE_FALSE' && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="shrink-0"
                    disabled={form.options.length <= 2}
                    onClick={() => {
                      if (form.options.length <= 2) return;
                      const newOpts = form.options.filter((_, i) => i !== idx);
                      const hadCorrect = form.options.some((o, i) => i !== idx && o.is_correct);
                      if (!hadCorrect && opt.is_correct) {
                        const first = newOpts[0]!;
                        newOpts[0] = { content: first.content, is_correct: true };
                      }
                      setForm({ ...form, options: newOpts });
                    }}
                    title="Hapus opsi"
                  >
                    <X className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                  </Button>
                )}
              </div>
            ))}
            {form.type !== 'TRUE_FALSE' && (
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                disabled={form.options.length >= 26}
                onClick={() => {
                  setForm({ ...form, options: [...form.options, { content: '', is_correct: false }] });
                }}
              >
                <Plus className="mr-1 h-3 w-3" />
                Tambah Opsi ({form.options.length}/26)
              </Button>
            )}
          </div>
        )}

        <div className="space-y-2">
          <Label>Pembahasan (opsional)</Label>
          <textarea
            className="flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={form.explanation}
            onChange={(e) => setForm({ ...form, explanation: e.target.value })}
            placeholder="Tulis pembahasan jawaban..."
          />
        </div>

        <div className="space-y-2">
          <Label>Tag</Label>
          <div className="flex items-center gap-2">
            <Input
              ref={tagInputRef}
              placeholder="Tambahkan tag..."
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  addTag((e.target as HTMLInputElement).value);
                  (e.target as HTMLInputElement).value = '';
                }
              }}
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const input = tagInputRef.current;
                if (input) {
                  addTag(input.value);
                  input.value = '';
                }
              }}
            >
              Tambah
            </Button>
          </div>
          {form.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {form.tags.map((tag, i) => (
                <Badge key={i} variant="secondary" className="gap-1">
                  {tag}
                  <button
                    onClick={() => setForm({ ...form, tags: form.tags.filter((_, j) => j !== i) })}
                    className="ml-1 hover:text-destructive"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
