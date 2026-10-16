'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { sessionApi } from '@/lib/api-service';
import { toast } from 'sonner';
import {
  ShieldCheck,
  RotateCcw,
  Clock,
  Unlock,
  AlertOctagon,
  Loader2,
  UserCheck,
  CheckCircle,
  Megaphone,
} from 'lucide-react';

export interface ActionStudentSession {
  id: string;
  student_user_id?: string;
  student: {
    nis: string;
    full_name: string;
    class?: { name: string };
  };
  status: string;
  warning_count: number;
  remaining_time_seconds: number | null;
}

interface StudentActionDialogProps {
  session: ActionStudentSession | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  onSendMessage?: (session: ActionStudentSession) => void;
}

export function StudentActionDialog({
  session,
  open,
  onOpenChange,
  onSuccess,
  onSendMessage,
}: StudentActionDialogProps) {
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [confirmForceSubmit, setConfirmForceSubmit] = useState(false);

  if (!session) return null;

  const isCompleted = session.status === 'SUBMITTED' || session.status === 'AUTO_SUBMITTED';

  const handleForceSubmit = async () => {
    if (!confirmForceSubmit) {
      setConfirmForceSubmit(true);
      return;
    }
    try {
      setLoadingAction('force-submit');
      await sessionApi.forceSubmit(session.id);
      toast.success(`Ujian ${session.student.full_name} berhasil dikumpulkan secara paksa`);
      setConfirmForceSubmit(false);
      onOpenChange(false);
      onSuccess?.();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Gagal mengumpulkan paksa ujian siswa');
    } finally {
      setLoadingAction(null);
    }
  };

  const handleResetWarnings = async () => {
    try {
      setLoadingAction('reset-warnings');
      await sessionApi.resetWarnings(session.id);
      toast.success(`Peringatan pelanggaran ${session.student.full_name} direset ke 0`);
      onOpenChange(false);
      onSuccess?.();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Gagal mereset peringatan pelanggaran');
    } finally {
      setLoadingAction(null);
    }
  };

  const handleExtendTime = async (minutes: number) => {
    try {
      setLoadingAction(`extend-${minutes}`);
      await sessionApi.extendTime(session.id, minutes);
      toast.success(`Waktu ujian ${session.student.full_name} berhasil ditambah ${minutes} menit`);
      onOpenChange(false);
      onSuccess?.();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Gagal menambah waktu ujian');
    } finally {
      setLoadingAction(null);
    }
  };

  const handleUnlock = async () => {
    try {
      setLoadingAction('unlock');
      await sessionApi.unlock(session.id);
      toast.success(`Kunci perangkat/sesi ${session.student.full_name} berhasil dibuka`);
      onOpenChange(false);
      onSuccess?.();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Gagal membuka kunci sesi');
    } finally {
      setLoadingAction(null);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(val) => {
        if (!val) setConfirmForceSubmit(false);
        onOpenChange(val);
      }}
    >
      <DialogContent className="max-w-md p-0 gap-0 sm:rounded-2xl border-border/80 shadow-2xl">
        <DialogHeader className="p-6 pb-4 border-b border-border/60">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 border border-primary/20">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <DialogTitle className="text-base font-bold text-foreground truncate">
                Tindakan Pengawas (Proctor Controls)
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5 truncate">
                {session.student.full_name} ({session.student.nis}) &middot; {session.student.class?.name || 'Kelas'}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="p-6 space-y-4">
          {/* Quick Stats overview */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-muted/40 border border-border/60 text-xs">
            <div>
              <span className="text-muted-foreground block text-[10px] uppercase font-bold tracking-wider">Status Sesi</span>
              <Badge variant={isCompleted ? 'default' : 'success'} className="mt-1">
                {isCompleted ? 'Selesai' : 'Aktif Berjalan'}
              </Badge>
            </div>
            <div className="text-right">
              <span className="text-muted-foreground block text-[10px] uppercase font-bold tracking-wider">Peringatan Strike</span>
              <span className={`font-mono font-bold text-sm ${session.warning_count > 0 ? 'text-rose-600' : 'text-foreground'}`}>
                {session.warning_count} Pelanggaran
              </span>
            </div>
          </div>

          {/* Action 1: Extend Time Buttons */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-primary" /> Tambah Waktu Pengerjaan
            </label>
            <div className="grid grid-cols-4 gap-2">
              {[5, 10, 15, 30].map((mins) => (
                <Button
                  key={mins}
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={isCompleted || loadingAction !== null}
                  onClick={() => handleExtendTime(mins)}
                  className="rounded-xl text-xs font-bold hover:bg-primary/10 hover:text-primary hover:border-primary/50 transition-all"
                >
                  {loadingAction === `extend-${mins}` ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    `+${mins}m`
                  )}
                </Button>
              ))}
            </div>
          </div>

          {/* Action 2: Reset Warning Strikes */}
          <div className="p-3.5 rounded-xl border border-border/80 bg-background space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <RotateCcw className="h-3.5 w-3.5 text-amber-500" /> Reset Poin Pelanggaran
                </p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Kembalikan jumlah strike peringatan siswa ke 0.
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={session.warning_count === 0 || loadingAction !== null}
                onClick={handleResetWarnings}
                className="rounded-xl text-xs font-bold shrink-0"
              >
                {loadingAction === 'reset-warnings' ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  'Reset Strike'
                )}
              </Button>
            </div>
          </div>

          {/* Action 3: Unlock Session */}
          <div className="p-3.5 rounded-xl border border-border/80 bg-background space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <Unlock className="h-3.5 w-3.5 text-indigo-500" /> Buka Kunci Perangkat / Sesi
                </p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Reset device lock agar siswa dapat login/resume di perangkat baru.
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isCompleted || loadingAction !== null}
                onClick={handleUnlock}
                className="rounded-xl text-xs font-bold shrink-0"
              >
                {loadingAction === 'unlock' ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  'Buka Kunci'
                )}
              </Button>
            </div>
          </div>

          {/* Action 4: Kirim Pesan Langsung */}
          {onSendMessage && (
            <div className="p-3.5 rounded-xl border border-sky-500/30 bg-sky-500/5 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-sky-600 dark:text-sky-400 flex items-center gap-1.5">
                    <Megaphone className="h-3.5 w-3.5" /> Kirim Pesan / Teguran Khusus
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Kirim pesan broadcast yang hanya akan muncul pada layar siswa ini.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={isCompleted || loadingAction !== null}
                  onClick={() => {
                    onOpenChange(false);
                    onSendMessage(session);
                  }}
                  className="rounded-xl text-xs font-bold shrink-0 border-sky-500/40 text-sky-600 hover:bg-sky-500 hover:text-white transition-all"
                >
                  Kirim Pesan
                </Button>
              </div>
            </div>
          )}

          {/* Action 5: Force Submit */}
          <div className={`p-3.5 rounded-xl border transition-all ${confirmForceSubmit ? 'border-rose-500 bg-rose-500/10' : 'border-rose-500/30 bg-rose-500/5'}`}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-bold text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
                  <AlertOctagon className="h-3.5 w-3.5" /> Paksa Kumpulkan Ujian
                </p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {confirmForceSubmit
                    ? 'Konfirmasi: Lembar jawaban siswa akan langsung dinilai dan sesi ditutup permanen.'
                    : 'Segera hentikan pengerjaan siswa dan hitung skor secara langsung.'}
                </p>
              </div>
              <Button
                type="button"
                variant={confirmForceSubmit ? 'destructive' : 'outline'}
                size="sm"
                disabled={isCompleted || loadingAction !== null}
                onClick={handleForceSubmit}
                className={`rounded-xl text-xs font-bold shrink-0 ${!confirmForceSubmit ? 'border-rose-500/50 text-rose-600 hover:bg-rose-500 hover:text-white' : ''}`}
              >
                {loadingAction === 'force-submit' ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : confirmForceSubmit ? (
                  'Ya, Kumpulkan Paksa!'
                ) : (
                  'Paksa Kumpul'
                )}
              </Button>
            </div>
            {confirmForceSubmit && (
              <div className="mt-2 text-right">
                <button
                  type="button"
                  onClick={() => setConfirmForceSubmit(false)}
                  className="text-[11px] text-muted-foreground hover:underline cursor-pointer"
                >
                  Batal
                </button>
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="p-4 px-6 border-t border-border/50 bg-muted/20">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="rounded-xl w-full sm:w-auto"
          >
            Tutup
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
