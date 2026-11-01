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
import { Checkbox } from '@/components/ui/checkbox';
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
  RefreshCw,
  GraduationCap,
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
  attempt_number?: number;
  is_remedial_allowed?: boolean;
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
  const [reopenMinutes, setReopenMinutes] = useState<number>(5);
  const [resetStrikesOnReopen, setResetStrikesOnReopen] = useState<boolean>(true);

  if (!session) return null;

  const isCompleted =
    session.status === 'SUBMITTED' ||
    session.status === 'AUTO_SUBMITTED' ||
    session.status === 'EXPIRED';

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

  const handleAdjustWarnings = async (delta: number) => {
    try {
      setLoadingAction(`adjust-warnings-${delta}`);
      await sessionApi.adjustWarnings(session.id, delta);
      const actionText = delta > 0 ? `ditambah ${delta}` : `dikurangi ${Math.abs(delta)}`;
      toast.success(`Peringatan pelanggaran ${session.student.full_name} berhasil ${actionText}`);
      onOpenChange(false);
      onSuccess?.();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Gagal mengubah poin pelanggaran');
    } finally {
      setLoadingAction(null);
    }
  };

  const handleExtendTime = async (minutes: number) => {
    try {
      setLoadingAction(`extend-${minutes}`);
      await sessionApi.extendTime(session.id, minutes);
      const actionText = minutes > 0 ? `ditambah ${minutes}` : `dikurangi ${Math.abs(minutes)}`;
      toast.success(`Waktu ujian ${session.student.full_name} berhasil ${actionText} menit`);
      onOpenChange(false);
      onSuccess?.();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Gagal mengubah waktu ujian');
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

  const handleReopen = async () => {
    try {
      setLoadingAction('reopen');
      await sessionApi.reopen(session.id, {
        additional_minutes: reopenMinutes,
        reset_strikes: resetStrikesOnReopen,
      });
      toast.success(`Sesi ${session.student.full_name} berhasil dibuka kembali (+${reopenMinutes}m)`);
      onOpenChange(false);
      onSuccess?.();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Gagal membuka kembali sesi');
    } finally {
      setLoadingAction(null);
    }
  };

  const handleAuthorizeRemedial = async () => {
    try {
      setLoadingAction('authorize-remedial');
      await sessionApi.authorizeRemedial(session.id);
      toast.success(`Ujian remedial berhasil diizinkan untuk ${session.student.full_name}`);
      onOpenChange(false);
      onSuccess?.();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Gagal mengizinkan remedial');
    } finally {
      setLoadingAction(null);
    }
  };

  const handleGrantExtraAttempt = async () => {
    try {
      setLoadingAction('grant-attempt');
      await sessionApi.grantExtraAttempt(session.id, {
        reason: 'Dispensasi kuota percobaan dari pengawas',
      });
      toast.success(`Berhasil memberikan +1 kuota percobaan untuk ${session.student.full_name}`);
      onOpenChange(false);
      onSuccess?.();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Gagal menambahkan kuota percobaan');
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
              <div className="flex items-center gap-1.5 mt-1">
                <Badge variant={isCompleted ? 'default' : 'success'}>
                  {isCompleted ? 'Selesai' : 'Aktif Berjalan'}
                </Badge>
                {session.attempt_number === 2 && (
                  <Badge variant="outline" className="text-indigo-600 border-indigo-500/30 font-bold">
                    Remedial
                  </Badge>
                )}
              </div>
            </div>
            <div className="text-right">
              <span className="text-muted-foreground block text-[10px] uppercase font-bold tracking-wider">Peringatan Strike</span>
              <span className={`font-mono font-bold text-sm ${session.warning_count > 0 ? 'text-rose-600' : 'text-foreground'}`}>
                {session.warning_count} Pelanggaran
              </span>
            </div>
          </div>

          {/* Recovery Action: Reopen Session (Accidental Submit Recovery) */}
          {(session.status === 'SUBMITTED' || session.status === 'AUTO_SUBMITTED') && (
            <div className="p-3.5 rounded-xl border border-emerald-500/40 bg-emerald-500/5 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                    <RefreshCw className="h-3.5 w-3.5" /> Buka Kembali Sesi (Pulihkan Submit)
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Pulihkan lembar pengerjaan siswa yang tidak sengaja terkumpul. Timer akan dilanjutkan dan jawaban sebelumnya tetap aman.
                  </p>
                </div>
              </div>

              <div className="space-y-2 pt-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[11px] font-semibold text-muted-foreground">Tambahan Waktu:</span>
                  <div className="flex gap-1">
                    {[0, 5, 10, 15].map((mins) => (
                      <Button
                        key={mins}
                        type="button"
                        size="sm"
                        variant={reopenMinutes === mins ? 'default' : 'outline'}
                        onClick={() => setReopenMinutes(mins)}
                        className={`h-7 px-2.5 rounded-lg text-xs font-bold ${
                          reopenMinutes === mins
                            ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                            : 'border-border/80 hover:bg-emerald-500/10'
                        }`}
                      >
                        +{mins}m
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center space-x-2 pt-1">
                  <Checkbox
                    id="reset-strikes"
                    checked={resetStrikesOnReopen}
                    onCheckedChange={(checked) => setResetStrikesOnReopen(!!checked)}
                  />
                  <label
                    htmlFor="reset-strikes"
                    className="text-xs font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer text-muted-foreground"
                  >
                    Reset peringatan & pelanggaran strike ke 0
                  </label>
                </div>
              </div>

              <Button
                type="button"
                size="sm"
                disabled={loadingAction !== null}
                onClick={handleReopen}
                className="w-full rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm mt-1"
              >
                {loadingAction === 'reopen' ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                ) : (
                  <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                )}
                Buka Kembali Sesi
              </Button>
            </div>
          )}

          {/* Remedial Authorization Action */}
          {isCompleted && (
            <div className="p-3.5 rounded-xl border border-indigo-500/30 bg-indigo-500/5 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-bold text-indigo-700 dark:text-indigo-400 flex items-center gap-1.5">
                    <GraduationCap className="h-3.5 w-3.5" /> Otorisasi Ujian Remedial
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Izinkan siswa mengulang pengerjaan ujian dengan pengacakan soal baru (Attempt #2).
                  </p>
                </div>
              </div>

              {session.is_remedial_allowed ? (
                <div className="flex items-center gap-2 p-2.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-xs text-indigo-700 dark:text-indigo-300 font-medium">
                  <CheckCircle className="h-4 w-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                  <div>
                    <span className="font-bold block">Remedial Diizinkan (Attempt #2)</span>
                    <span className="text-[11px] text-muted-foreground block">
                      Siswa dapat langsung login kembali menggunakan token ujian untuk memulai pengerjaan remedial.
                    </span>
                  </div>
                </div>
              ) : (session.attempt_number ?? 1) === 1 ? (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={loadingAction !== null}
                  onClick={handleAuthorizeRemedial}
                  className="w-full rounded-xl text-xs font-bold border-indigo-500/40 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-600 hover:text-white transition-all"
                >
                  {loadingAction === 'authorize-remedial' ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                  ) : (
                    <UserCheck className="h-3.5 w-3.5 mr-1.5" />
                  )}
                  Izinkan Remedial
                </Button>
              ) : (
                <div className="text-[11px] text-muted-foreground italic p-2 bg-muted/40 rounded-lg border border-border/40">
                  Siswa ini telah menyelesaikan sesi remedial (Attempt #2). Batas remedial adalah 1 kali per mata pelajaran.
                </div>
              )}
            </div>
          )}

          {/* Action: Extra Attempt Grant (Dispensasi Kuota Ujian) */}
          <div className="p-3.5 rounded-xl border border-violet-500/40 bg-violet-500/5 space-y-2">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-bold text-violet-700 dark:text-violet-400 flex items-center gap-1.5">
                  <GraduationCap className="h-3.5 w-3.5" /> Kuota Percobaan Tambahan
                </p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Beri dispensasi 1 kali kesempatan ujian ulang untuk siswa ini dengan kebijakan Nilai Terbaik.
                </p>
              </div>
            </div>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={loadingAction !== null}
              onClick={handleGrantExtraAttempt}
              className="w-full rounded-xl text-xs font-bold border-violet-500/40 text-violet-600 dark:text-violet-400 hover:bg-violet-600 hover:text-white transition-all"
            >
              {loadingAction === 'grant-attempt' ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
              ) : (
                <GraduationCap className="h-3.5 w-3.5 mr-1.5" />
              )}
              +1 Kuota Percobaan
            </Button>
          </div>

          {/* Action 1: Adjust Time Buttons (+ and -) */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-primary" /> Penyesuaian Waktu Ujian
            </label>
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 w-16 shrink-0">
                  + Tambah:
                </span>
                <div className="grid grid-cols-4 gap-1.5 flex-1">
                  {[5, 10, 15, 30].map((mins) => (
                    <Button
                      key={mins}
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={isCompleted || loadingAction !== null}
                      onClick={() => handleExtendTime(mins)}
                      className="rounded-xl text-xs font-bold hover:bg-emerald-500/10 hover:text-emerald-600 hover:border-emerald-500/50 transition-all h-8"
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

              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 w-16 shrink-0">
                  - Kurangi:
                </span>
                <div className="grid grid-cols-4 gap-1.5 flex-1">
                  {[-5, -10, -15, -30].map((mins) => (
                    <Button
                      key={mins}
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={isCompleted || loadingAction !== null}
                      onClick={() => handleExtendTime(mins)}
                      className="rounded-xl text-xs font-bold hover:bg-amber-500/10 hover:text-amber-600 hover:border-amber-500/50 transition-all h-8"
                    >
                      {loadingAction === `extend-${mins}` ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        `${mins}m`
                      )}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Action 2: Strike Controls (+1, -1, Reset 0) */}
          <div className="p-3.5 rounded-xl border border-border/80 bg-background space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <RotateCcw className="h-3.5 w-3.5 text-amber-500" /> Kelola Poin Pelanggaran (Strike)
                </p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Beri toleransi keringanan, sanksi tambahan (+1), atau reset ke 0.
                </p>
              </div>
              <span className={`font-mono font-bold text-xs px-2 py-0.5 rounded-md ${session.warning_count > 0 ? 'bg-rose-500/10 text-rose-600 border border-rose-500/20' : 'bg-muted text-muted-foreground'}`}>
                {session.warning_count} Strike
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={session.warning_count === 0 || loadingAction !== null || isCompleted}
                onClick={() => handleAdjustWarnings(-1)}
                className="rounded-xl text-xs font-bold border-emerald-500/30 text-emerald-600 hover:bg-emerald-500/10 hover:text-emerald-700 transition-all"
              >
                {loadingAction === 'adjust-warnings--1' ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  '-1 Strike'
                )}
              </Button>

              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isCompleted || loadingAction !== null}
                onClick={() => handleAdjustWarnings(1)}
                className="rounded-xl text-xs font-bold border-rose-500/30 text-rose-600 hover:bg-rose-500/10 hover:text-rose-700 transition-all"
              >
                {loadingAction === 'adjust-warnings-1' ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  '+1 Strike'
                )}
              </Button>

              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={session.warning_count === 0 || isCompleted || loadingAction !== null}
                onClick={handleResetWarnings}
                className="rounded-xl text-xs font-bold"
              >
                {loadingAction === 'reset-warnings' ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  'Reset 0'
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
