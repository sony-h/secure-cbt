'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import { RotateCcw } from 'lucide-react';
import { RandomPoolCard } from '../random-pool-card';
import { ViolationDeterrenceCard } from '../violation-deterrence-card';
import type { ExamFormData } from '../create-exam-modal';

interface Props {
  form: ExamFormData;
  setForm: (f: ExamFormData) => void;
}

const settings = [
  { key: 'show_results', label: 'Tampilkan Nilai ke Siswa', desc: 'Siswa dapat melihat skor/nilai setelah ujian selesai' },
  { key: 'show_explanation', label: 'Tampilkan Pembahasan & Kunci Jawaban', desc: 'Siswa dapat melihat pembahasan dan kunci jawaban setelah seluruh jadwal ujian selesai' },
  { key: 'randomize_questions', label: 'Acak urutan soal', desc: 'Soal ditampilkan berbeda untuk setiap siswa' },
  { key: 'randomize_answers', label: 'Acak pilihan jawaban', desc: 'Urutan A/B/C/D diacak per siswa' },
  { key: 'auto_submit_enabled', label: 'Auto-submit saat waktu habis', desc: 'Jawaban otomatis dikumpulkan' },
  { key: 'fullscreen_required', label: 'Wajib fullscreen', desc: 'Layar penuh selama ujian berlangsung' },
];

export function SettingsStep({ form, setForm }: Props) {
  return (
    <div className="space-y-4">
      <RandomPoolCard
        form={form}
        setForm={setForm}
        totalSelectedQuestions={form.question_ids?.length || 0}
      />

      <ViolationDeterrenceCard
        form={form}
        setForm={setForm}
      />

      {/* Multiple Attempts Configuration */}
      <div className="p-4 rounded-xl border border-border/80 bg-card space-y-3">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label className="text-sm font-bold flex items-center gap-1.5">
              <RotateCcw className="h-4 w-4 text-primary" /> Batas Kesempatan Ujian (Attempts)
            </Label>
            <p className="text-xs text-muted-foreground">
              Tentukan berapa kali siswa diperbolehkan mengerjakan ujian ini.
            </p>
          </div>
          <Badge variant="outline" className="text-xs font-semibold text-primary border-primary/30">
            Nilai Terbaik (Best Score)
          </Badge>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Batas Maksimal Percobaan</Label>
            <Select
              value={form.max_attempts === null || form.max_attempts === 0 ? 'unlimited' : String(form.max_attempts)}
              onValueChange={(val) => {
                setForm({
                  ...form,
                  max_attempts: val === 'unlimited' ? null : Number(val),
                });
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Pilih batas percobaan" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1 Kali (Standar Ujian Resmi)</SelectItem>
                <SelectItem value="2">2 Kali (Ujian + 1x Pengulangan)</SelectItem>
                <SelectItem value="3">3 Kali Percobaan</SelectItem>
                <SelectItem value="5">5 Kali Percobaan</SelectItem>
                <SelectItem value="unlimited">Tanpa Batas (Bebas Latihan)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="text-xs text-muted-foreground flex items-center bg-muted/40 p-2.5 rounded-lg border border-border/60">
            Nilai resmi di rapor/laporan otomatis diambil dari Nilai Tertinggi (Best Score) dari seluruh percobaan siswa.
          </div>
        </div>
      </div>

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
