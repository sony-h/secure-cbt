'use client';

import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Key } from 'lucide-react';

export function TokenModal({ token, onClose }: { token: string | null; onClose: () => void }) {
  return (
    <Modal open={!!token} onClose={onClose} title="Token Ujian">
      <div className="text-center py-4">
        <Key className="mx-auto h-10 w-10 text-primary mb-3" />
        <div className="text-4xl font-mono font-bold tracking-widest text-primary py-3 bg-muted rounded-md select-all">{token}</div>
        <p className="text-sm text-muted-foreground mt-3">Bagikan token ini ke siswa untuk mengikuti ujian.</p>
      </div>
      <div className="flex justify-center pt-4 border-t">
        <Button className="w-full" onClick={onClose}>Tutup</Button>
      </div>
    </Modal>
  );
}
