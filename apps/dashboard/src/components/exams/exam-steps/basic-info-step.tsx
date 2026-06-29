'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { ExamFormData } from '../create-exam-modal';

interface Props {
  form: ExamFormData;
  setForm: (f: ExamFormData) => void;
  subjects: { id: string; name: string; code: string }[];
}

export function BasicInfoStep({ form, setForm, subjects }: Props) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Judul Ujian</Label>
        <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Contoh: UTS Matematika XII IPA" />
      </div>
      <div className="space-y-2">
        <Label>Deskripsi (opsional)</Label>
        <textarea className="flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Mata Pelajaran</Label>
          <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={form.subject_id} onChange={(e) => setForm({ ...form, subject_id: e.target.value })}>
            <option value="">Pilih Mapel</option>
            {subjects.map((s) => (<option key={s.id} value={s.id}>{s.name} ({s.code})</option>))}
          </select>
        </div>
        <div className="space-y-2">
          <Label>Durasi (menit)</Label>
          <Input type="number" value={form.duration_minutes} onChange={(e) => setForm({ ...form, duration_minutes: Number(e.target.value) })} min={1} max={300} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Waktu Mulai</Label>
          <Input type="datetime-local" value={form.start_at} onChange={(e) => setForm({ ...form, start_at: e.target.value })} />
        </div>
        <div className="space-y-2">
          <Label>Waktu Selesai</Label>
          <Input type="datetime-local" value={form.end_at} onChange={(e) => setForm({ ...form, end_at: e.target.value })} />
        </div>
      </div>
    </div>
  );
}
