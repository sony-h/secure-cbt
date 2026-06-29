'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import type { ExamFormData } from '../create-exam-modal';

interface Props {
  form: ExamFormData;
  setForm: (f: ExamFormData) => void;
}

const settings = [
  { key: 'randomize_questions', label: 'Acak urutan soal', desc: 'Soal ditampilkan berbeda untuk setiap siswa' },
  { key: 'randomize_answers', label: 'Acak pilihan jawaban', desc: 'Urutan A/B/C/D diacak per siswa' },
  { key: 'auto_submit_enabled', label: 'Auto-submit saat waktu habis', desc: 'Jawaban otomatis dikumpulkan' },
  { key: 'fullscreen_required', label: 'Wajib fullscreen', desc: 'Layar penuh selama ujian berlangsung' },
];

export function SettingsStep({ form, setForm }: Props) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Jumlah Paket Soal</Label>
          <Input type="number" value={form.package_count} onChange={(e) => setForm({ ...form, package_count: Number(e.target.value) })} min={1} max={26} />
          <p className="text-xs text-muted-foreground">Paket A, B, C, dst.</p>
        </div>
        <div className="space-y-2">
          <Label>Batas Peringatan</Label>
          <Input type="number" value={form.warning_limit} onChange={(e) => setForm({ ...form, warning_limit: Number(e.target.value) })} min={0} max={10} />
          <p className="text-xs text-muted-foreground">Maksimal kecurangan sebelum force-submit</p>
        </div>
      </div>
      <div className="space-y-3 pt-2">
        {settings.map((s) => (
          <label key={s.key} className="flex items-center justify-between p-3 rounded-md border cursor-pointer hover:bg-muted">
            <div>
              <p className="text-sm font-medium">{s.label}</p>
              <p className="text-xs text-muted-foreground">{s.desc}</p>
            </div>
            <Checkbox
              checked={(form as any)[s.key]}
              onCheckedChange={() => setForm({ ...form, [s.key]: !(form as any)[s.key] })}
            />
          </label>
        ))}
      </div>
    </div>
  );
}
