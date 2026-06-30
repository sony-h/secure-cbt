'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Modal } from '@/components/ui/modal';
import { toast } from 'sonner';

interface MajorOption { id: string; name: string; code: string; }
interface YearOption { id: string; name: string; is_active: boolean; }

export function ClassDialog({ open, onClose, form, setForm, majors, years, onSave, isEditing }: {
  open: boolean; onClose: () => void;
  form: { name: string; major_id: string; academic_year_id: string; grade_level: number };
  setForm: (f: any) => void;
  majors: MajorOption[]; years: YearOption[];
  onSave: () => void; isEditing: boolean;
}) {
  return (
    <Modal open={open} onClose={onClose} title={isEditing ? 'Edit Kelas' : 'Tambah Kelas'} footer={
      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={onClose}>Batal</Button>
        <Button onClick={onSave}>{isEditing ? 'Simpan' : 'Tambah'}</Button>
      </div>
    }>
      <div className="space-y-4">
        <div className="space-y-2"><Label>Nama Kelas</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="contoh: XII MIPA 1" /></div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2"><Label>Jurusan</Label>
            <Select value={form.major_id} onValueChange={(v) => setForm({ ...form, major_id: v })}>
              <SelectTrigger><SelectValue placeholder="Pilih" /></SelectTrigger>
              <SelectContent>{majors.map((m) => (<SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>))}</SelectContent>
            </Select>
          </div>
          <div className="space-y-2"><Label>Tingkat</Label>
            <Select value={String(form.grade_level)} onValueChange={(v) => setForm({ ...form, grade_level: Number(v) })}>
              <SelectTrigger><SelectValue placeholder="Pilih" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="11">11</SelectItem>
                <SelectItem value="12">12</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="space-y-2"><Label>Tahun Ajaran</Label>
          <Select value={form.academic_year_id} onValueChange={(v) => setForm({ ...form, academic_year_id: v })}>
            <SelectTrigger><SelectValue placeholder="Pilih" /></SelectTrigger>
            <SelectContent>{years.map((y) => (<SelectItem key={y.id} value={y.id}>{y.name} {y.is_active ? '(Aktif)' : ''}</SelectItem>))}</SelectContent>
          </Select>
        </div>
      </div>
    </Modal>
  );
}
