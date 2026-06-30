'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Modal } from '@/components/ui/modal';

interface MajorOption { id: string; name: string; code: string; }

export function SubjectDialog({ open, onClose, form, setForm, majors, onSave, isEditing }: {
  open: boolean; onClose: () => void;
  form: { name: string; code: string; major_id: string };
  setForm: (f: any) => void;
  majors: MajorOption[];
  onSave: () => void; isEditing: boolean;
}) {
  return (
    <Modal open={open} onClose={onClose} title={isEditing ? 'Edit Mapel' : 'Tambah Mata Pelajaran'} footer={
      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={onClose}>Batal</Button>
        <Button onClick={onSave}>{isEditing ? 'Simpan' : 'Tambah'}</Button>
      </div>
    }>
      <div className="space-y-4">
        <div className="space-y-2"><Label>Nama Mapel</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="contoh: Matematika" /></div>
        <div className="space-y-2"><Label>Kode Mapel</Label><Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="contoh: MTK" /></div>
        <div className="space-y-2"><Label>Jurusan (opsional)</Label>
          <Select value={form.major_id} onValueChange={(v) => setForm({ ...form, major_id: v })}>
            <SelectTrigger><SelectValue placeholder="Umum (semua jurusan)" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="">Umum (semua jurusan)</SelectItem>
              {majors.map((m) => (<SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </Modal>
  );
}
