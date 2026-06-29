'use client';

import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/table';
import type { ExamFormData } from '../create-exam-modal';

interface Props {
  form: ExamFormData;
  setForm: (f: ExamFormData) => void;
  banks: { id: string; title: string; subject: { name: string }; _count: { questions: number } }[];
  questions: { id: string; content: string; type: string; difficulty: string; question_bank: { id: string; title: string; subject: { name: string } } }[];
  bankFilter: string;
  setBankFilter: (v: string) => void;
}

export function QuestionsStep({ form, setForm, banks, questions, bankFilter, setBankFilter }: Props) {
  const filteredQuestions = bankFilter
    ? questions.filter((q) => q.question_bank?.id === bankFilter)
    : questions;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Label className="whitespace-nowrap">Filter Bank:</Label>
        <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={bankFilter} onChange={(e) => setBankFilter(e.target.value)}>
          <option value="">Semua Bank</option>
          {banks.map((b) => (<option key={b.id} value={b.id}>{b.title} ({b._count.questions} soal)</option>))}
        </select>
      </div>
      <p className="text-sm text-muted-foreground">{form.question_ids.length} soal dipilih</p>
      <div className="max-h-60 overflow-y-auto space-y-2 border rounded-md p-2">
        {filteredQuestions.map((q) => (
          <label key={q.id} className={`flex items-start gap-2 p-2 rounded cursor-pointer hover:bg-muted ${form.question_ids.includes(q.id) ? 'bg-primary/5 border border-primary/30 rounded' : ''}`}>
            <input
              type="checkbox"
              className="mt-1"
              checked={form.question_ids.includes(q.id)}
              onChange={() => {
                const ids = form.question_ids.includes(q.id)
                  ? form.question_ids.filter((i) => i !== q.id)
                  : [...form.question_ids, q.id];
                setForm({ ...form, question_ids: ids });
              }}
            />
            <div className="flex-1 text-sm">
              <p className="font-medium line-clamp-2">{q.content}</p>
              <div className="flex gap-2 mt-1">
                <Badge variant="secondary" className="text-xs">{q.type}</Badge>
                <Badge variant="outline" className="text-xs">{q.difficulty}</Badge>
              </div>
            </div>
          </label>
        ))}
        {filteredQuestions.length === 0 && (
          <p className="text-center text-muted-foreground py-4">Tidak ada soal tersedia</p>
        )}
      </div>
    </div>
  );
}
