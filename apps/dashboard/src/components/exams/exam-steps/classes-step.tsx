'use client';

import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import type { ExamFormData } from '../create-exam-modal';

interface Props {
  form: ExamFormData;
  setForm: (f: ExamFormData) => void;
  classes: { id: string; name: string; major?: { name: string } }[];
}

export function ClassesStep({ form, setForm, classes }: Props) {
  return (
    <div className="space-y-4">
      <Label>Pilih Kelas Peserta</Label>
      <p className="text-sm text-muted-foreground">Pilih kelas yang akan mengikuti ujian ini.</p>
      <div className="grid grid-cols-2 gap-3">
        {classes.map((c) => (
          <label key={c.id} className={`flex items-center gap-2 p-3 rounded-md border cursor-pointer transition hover:bg-muted ${form.class_ids.includes(c.id) ? 'border-primary bg-primary/5' : ''}`}>
            <Checkbox
              checked={form.class_ids.includes(c.id)}
              onCheckedChange={() => {
                const ids = form.class_ids.includes(c.id)
                  ? form.class_ids.filter((i) => i !== c.id)
                  : [...form.class_ids, c.id];
                setForm({ ...form, class_ids: ids });
              }}
            />
            <span className="text-sm font-medium">{c.name}</span>
            {c.major && <span className="text-xs text-muted-foreground">({c.major.name})</span>}
          </label>
        ))}
      </div>
    </div>
  );
}
