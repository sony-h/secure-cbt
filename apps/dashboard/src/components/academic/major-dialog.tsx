'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Modal } from '@/components/ui/modal';
import { toast } from 'sonner';

export function MajorDialog({ open, onClose, onSave, isEditing, initialName, initialCode }: {
  open: boolean; onClose: () => void; onSave: (name: string, code: string) => void;
  isEditing: boolean; initialName?: string; initialCode?: string;
}) {
  const [name, setName] = useState(''); const [code, setCode] = useState('');
  useEffect(() => {
    if (open) { setName(initialName || ''); setCode(initialCode || ''); }
  }, [open, initialName, initialCode]);
  return (
    <Modal open={open} onClose={onClose} title={isEditing ? 'Edit Jurusan' : 'Tambah Jurusan'} footer={
      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={onClose}>Batal</Button>
        <Button onClick={() => { if (name.trim() && code.trim()) { onSave(name, code); } else toast.error('Nama dan kode harus diisi'); }}>{isEditing ? 'Simpan' : 'Tambah'}</Button>
      </div>
    }>
      <div className="space-y-4">
        <div className="space-y-2"><Label>Nama Jurusan</Label><Input placeholder="contoh: MIPA" value={name} onChange={(e) => setName(e.target.value)} /></div>
        <div className="space-y-2"><Label>Kode Jurusan</Label><Input placeholder="contoh: MIPA" value={code} onChange={(e) => setCode(e.target.value)} /></div>
      </div>
    </Modal>
  );
}
