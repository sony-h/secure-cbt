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
import { monitoringApi } from '@/lib/api-service';
import { toast } from 'sonner';
import {
  Megaphone,
  Radio,
  AlertTriangle,
  Info,
  Sparkles,
  Send,
  Loader2,
  CheckCircle2,
} from 'lucide-react';

interface ProctorBroadcastModalProps {
  examId: string | null;
  examTitle?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

const PRESET_MESSAGES = [
  'Sisa waktu pengerjaan ujian 15 menit lagi. Mohon periksa kembali jawaban Anda.',
  'Harap menjaga ketenangan dan ketertiban selama ujian berlangsung.',
  'Dilarang membuka tab lain, screenshot, atau berpindah aplikasi.',
  'Waktu ujian tinggal 5 menit. Segera submit lembar jawaban Anda.',
];

export function ProctorBroadcastModal({
  examId,
  examTitle,
  open,
  onOpenChange,
  onSuccess,
}: ProctorBroadcastModalProps) {
  const [message, setMessage] = useState('');
  const [urgency, setUrgency] = useState<'low' | 'high'>('low');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!examId) {
      toast.error('Pilih ruang ujian terlebih dahulu');
      return;
    }
    if (!message.trim()) {
      toast.error('Tuliskan pesan pengumuman');
      return;
    }

    try {
      setIsSubmitting(true);
      await monitoringApi.broadcastAnnouncement(examId, {
        message: message.trim(),
        urgency,
      });

      toast.success('Pengumuman berhasil disiarkan ke semua peserta!');
      setMessage('');
      setUrgency('low');
      onOpenChange(false);
      onSuccess?.();
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Gagal mengirim pengumuman';
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto p-0 gap-0 sm:rounded-2xl border-border/80 shadow-2xl">
        <DialogHeader className="p-6 pb-4 border-b border-border/60 bg-gradient-to-r from-background via-muted/20 to-background">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 border border-primary/20">
              <Megaphone className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold flex items-center gap-2 text-foreground">
                Siarkan Pengumuman ke Ruang Ujian
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold border border-emerald-500/20">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Live Broadcast
                </span>
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                Pengumuman langsung muncul di bagian atas layar aplikasi siswa secara instan ({examTitle || 'Semua Peserta'}).
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Urgency Selector Tabs */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
              <span>Tingkat Kepentingan (Urgency)</span>
              <span className="text-[11px] font-normal text-muted-foreground">Pilih gaya visual notifikasi siswa</span>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setUrgency('low')}
                className={`flex items-start gap-3 p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                  urgency === 'low'
                    ? 'border-sky-500 bg-sky-500/10 text-sky-950 dark:text-sky-100 ring-2 ring-sky-500/30'
                    : 'border-border/70 bg-card hover:bg-muted/40 text-muted-foreground'
                }`}
              >
                <div
                  className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${
                    urgency === 'low'
                      ? 'bg-sky-500 text-white shadow-xs'
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  <Info className="h-4 w-4" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-foreground">Informasi / Santai</span>
                    {urgency === 'low' && <CheckCircle2 className="h-3.5 w-3.5 text-sky-500" />}
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Banner biru lembut, tidak mengganggu fokus visual siswa.
                  </p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setUrgency('high')}
                className={`flex items-start gap-3 p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                  urgency === 'high'
                    ? 'border-rose-500 bg-rose-500/10 text-rose-950 dark:text-rose-100 ring-2 ring-rose-500/30'
                    : 'border-border/70 bg-card hover:bg-muted/40 text-muted-foreground'
                }`}
              >
                <div
                  className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${
                    urgency === 'high'
                      ? 'bg-rose-500 text-white shadow-xs'
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  <AlertTriangle className="h-4 w-4" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-rose-600 dark:text-rose-400">Peringatan Penting</span>
                    {urgency === 'high' && <CheckCircle2 className="h-3.5 w-3.5 text-rose-500" />}
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Banner merah amber dengan animasi berkedip untuk perhatian darurat.
                  </p>
                </div>
              </button>
            </div>
          </div>

          {/* Preset Buttons */}
          <div className="space-y-1.5">
            <span className="text-xs font-semibold text-muted-foreground">Pilihan Cepat Pesan:</span>
            <div className="flex flex-wrap gap-1.5">
              {PRESET_MESSAGES.map((msg, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setMessage(msg)}
                  className="text-[11px] px-2.5 py-1 rounded-lg border border-border/70 bg-background hover:bg-muted/60 text-muted-foreground hover:text-foreground transition-all cursor-pointer text-left line-clamp-1"
                >
                  {msg}
                </button>
              ))}
            </div>
          </div>

          {/* Message Input */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label htmlFor="broadcast-msg" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Isi Pengumuman
              </label>
              <span className={`text-[11px] font-mono ${message.length > 200 ? 'text-rose-500 font-bold' : 'text-muted-foreground'}`}>
                {message.length} / 250 karakter
              </span>
            </div>
            <textarea
              id="broadcast-msg"
              rows={3}
              maxLength={250}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Contoh: Siswa dipersilakan memulai mengerjakan soal esai nomor 11-15 terlebih dahulu..."
              className="w-full rounded-xl border border-border bg-background p-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all placeholder:text-muted-foreground/60 resize-none"
            />
          </div>

          {/* Student Live Preview */}
          <div className="rounded-xl border border-border/80 bg-muted/30 p-3.5 space-y-2">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span className="font-bold flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-primary" /> Pratinjau Tampilan di Layar Siswa
              </span>
              <span className="text-[10px] uppercase font-semibold tracking-wider">Mobile Preview</span>
            </div>

            <div
              className={`rounded-xl p-3 border transition-all shadow-sm ${
                urgency === 'high'
                  ? 'border-rose-500/50 bg-gradient-to-r from-rose-500/20 via-rose-500/10 to-amber-500/15 text-rose-950 dark:text-rose-100 ring-1 ring-rose-500/30'
                  : 'border-sky-500/40 bg-gradient-to-r from-sky-500/15 via-blue-500/10 to-sky-500/15 text-sky-950 dark:text-sky-100 ring-1 ring-sky-500/20'
              }`}
            >
              <div className="flex items-start gap-2.5">
                <div
                  className={`mt-0.5 h-6 w-6 rounded-full flex items-center justify-center shrink-0 ${
                    urgency === 'high'
                      ? 'bg-rose-500 text-white animate-pulse'
                      : 'bg-sky-500 text-white'
                  }`}
                >
                  {urgency === 'high' ? (
                    <AlertTriangle className="h-3.5 w-3.5" />
                  ) : (
                    <Info className="h-3.5 w-3.5" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className={`text-xs font-extrabold uppercase tracking-wider ${urgency === 'high' ? 'text-rose-700 dark:text-rose-300' : 'text-sky-700 dark:text-sky-300'}`}>
                      {urgency === 'high' ? 'Peringatan Pengawas' : 'Pengumuman Pengawas'}
                    </p>
                    <span className="text-[10px] text-muted-foreground ml-auto">Baru saja</span>
                  </div>
                  <p className="text-xs mt-0.5 font-medium leading-relaxed break-words text-foreground">
                    {message.trim() || 'Pesan pengumuman yang diketikkan akan tampil di banner ini...'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="pt-2 gap-2 border-t border-border/50">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
              className="rounded-xl"
            >
              Batal
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || !message.trim()}
              className="rounded-xl gap-2 font-bold bg-primary text-primary-foreground shadow-sm hover:shadow"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Menyiarkan...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  Kirim Pengumuman Sekarang
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
