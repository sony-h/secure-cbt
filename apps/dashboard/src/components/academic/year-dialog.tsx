'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Modal } from '@/components/ui/modal';
import { toast } from 'sonner';

export function YearDialog({ open, onClose, onSave, isEditing, initialName, initialActive }: {
  open: boolean; onClose: () => void; onSave: (name: string, isActive: boolean) => void;
  isEditing: boolean; initialName?: string; initialActive?: boolean;
}) {
  const [name, setName] = useState('');
  const [isActive, setIsActive] = useState(false);
  useEffect(() => {
    if (open) { setName(initialName || ''); setIsActive(initialActive || false); }
  }, [open, initialName, initialActive]);
  return (
    <Modal open={open} onClose={onClose} title={isEditing ? 'Edit Tahun Ajaran' : 'Tambah Tahun Ajaran'} footer={
      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={onClose}>Batal</Button>
        <Button onClick={() => { if (name.trim()) { onSave(name, isActive); } else toast.error('Nama harus diisi'); }}>{isEditing ? 'Simpan' : 'Tambah'}</Button>
      </div>
    }>
      <div className="space-y-4">
        <div className="space-y-2"><Label>Nama Tahun Ajaran</Label><Input placeholder="contoh: 2026/2027" value={name} onChange={(e) => setName(e.target.value)} /></div>
        <label className="flex items-center gap-3 rounded-md border px-3 py-2 cursor-pointer hover:bg-muted/50">
          <Checkbox checked={isActive} onCheckedChange={(v) => setIsActive(v === true)} />
          <span className="text-sm">Jadikan tahun ajaran aktif</span>
        </label>
      </div>
    </Modal>
  );
}
