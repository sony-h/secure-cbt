'use client';

import { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { questionBankApi } from '@/lib/api-service';
import { toast } from 'sonner';
import { Loader2, ArrowRightLeft } from 'lucide-react';

export interface BulkMoveDialogProps {
  open: boolean;
  onClose: () => void;
  selectedQuestionIds: string[];
  banks: Array<{ id: string; title: string; subject?: { name: string } }>;
  currentBankId?: string;
  onSuccess: () => void;
}

export function BulkMoveDialog({
  open,
  onClose,
  selectedQuestionIds,
  banks,
  currentBankId,
  onSuccess,
}: BulkMoveDialogProps) {
  const [targetBankId, setTargetBankId] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      // Pick first bank that is not current bank, or empty
      const defaultBank = banks.find((b) => b.id !== currentBankId);
      setTargetBankId(defaultBank?.id ?? '');
    }
  }, [open, banks, currentBankId]);

  const handleMove = async () => {
    if (!targetBankId || targetBankId === currentBankId) {
      toast.error('Pilih bank soal tujuan yang berbeda');
      return;
    }

    setSubmitting(true);
    try {
      const res = await questionBankApi.bulkMoveQuestions({
        ids: selectedQuestionIds,
        target_bank_id: targetBankId,
      });
      toast.success(res.data?.message || `${selectedQuestionIds.length} soal berhasil dipindahkan`);
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Gagal memindahkan soal');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Pindahkan Soal ke Bank Lain"
      description={`Pindahkan ${selectedQuestionIds.length} soal terpilih ke bank soal tujuan.`}
      maxWidth="sm:max-w-md"
      footer={
        <div className="flex justify-end gap-2 w-full">
          <Button variant="outline" onClick={onClose} disabled={submitting}>
            Batal
          </Button>
          <Button
            onClick={handleMove}
            disabled={submitting || !targetBankId || targetBankId === currentBankId}
            className="gap-2"
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Memindahkan...
              </>
            ) : (
              <>
                <ArrowRightLeft className="h-4 w-4" />
                Pindahkan
              </>
            )}
          </Button>
        </div>
      }
    >
      <div className="space-y-4 py-2">
        <div className="space-y-2">
          <label htmlFor="target-bank-select" className="text-sm font-medium">
            Bank Soal Tujuan
          </label>
          <select
            id="target-bank-select"
            aria-label="Bank Soal Tujuan"
            className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
            value={targetBankId}
            onChange={(e) => setTargetBankId(e.target.value)}
            disabled={submitting}
          >
            <option value="">Pilih Bank Soal...</option>
            {banks.map((b) => (
              <option key={b.id} value={b.id} disabled={b.id === currentBankId}>
                {b.title} {b.subject?.name ? `(${b.subject.name})` : ''} {b.id === currentBankId ? '— (Bank Saat Ini)' : ''}
              </option>
            ))}
          </select>
        </div>

        <p className="text-xs text-muted-foreground">
          Semua soal yang dipindahkan akan dialihkan ke bank tujuan dengan tetap mempertahankan opsi jawaban, tingkat kesulitan, dan tag.
        </p>
      </div>
    </Modal>
  );
}
