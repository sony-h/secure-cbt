'use client';

import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '@/components/ui/select';
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
  const filteredQuestions = bankFilter && bankFilter !== 'all'
    ? questions.filter((q) => q.question_bank?.id === bankFilter)
    : questions;

  const filteredIds = filteredQuestions.map((q) => q.id);
  const selectedFilteredCount = filteredQuestions.filter((q) => form.question_ids.includes(q.id)).length;
  const allFilteredSelected = filteredQuestions.length > 0 && selectedFilteredCount === filteredQuestions.length;
  const isIndeterminate = selectedFilteredCount > 0 && !allFilteredSelected;

  const handleToggleSelectAll = () => {
    if (allFilteredSelected) {
      const filteredSet = new Set(filteredIds);
      setForm({
        ...form,
        question_ids: form.question_ids.filter((id) => !filteredSet.has(id)),
      });
    } else {
      const mergedSet = new Set([...form.question_ids, ...filteredIds]);
      setForm({
        ...form,
        question_ids: Array.from(mergedSet),
      });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Label className="whitespace-nowrap">Filter Bank:</Label>
        <Select value={bankFilter} onValueChange={(v) => setBankFilter(v)}>
          <SelectTrigger className="w-full"><SelectValue placeholder="Semua Bank" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Bank</SelectItem>
            {banks.map((b) => (<SelectItem key={b.id} value={b.id}>{b.title} ({b._count.questions} soal)</SelectItem>))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{form.question_ids.length} soal dipilih</p>
        {filteredQuestions.length > 0 && (
          <label
            data-testid="select-all-questions"
            className="flex items-center gap-2 cursor-pointer select-none text-sm font-medium hover:text-primary transition-colors"
          >
            <Checkbox
              checked={allFilteredSelected ? true : isIndeterminate ? 'indeterminate' : false}
              onCheckedChange={handleToggleSelectAll}
            />
            <span>
              Pilih Semua ({filteredQuestions.length})
            </span>
          </label>
        )}
      </div>

      <div className="max-h-60 overflow-y-auto space-y-2 border rounded-md p-2">
        {filteredQuestions.map((q) => (
          <label key={q.id} className={`flex items-start gap-2 p-2 rounded cursor-pointer hover:bg-muted ${form.question_ids.includes(q.id) ? 'bg-primary/5 border border-primary/30 rounded' : ''}`}>
            <Checkbox
              className="mt-1"
              checked={form.question_ids.includes(q.id)}
              onCheckedChange={() => {
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
