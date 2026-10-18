'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { Mail, ArrowLeft, ArrowRight, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { authApi } from '@/lib/api-service';
import { AuthSplitLayout } from '@/components/auth/auth-split-layout';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !email.includes('@')) {
      toast.error('Masukkan alamat email yang valid');
      return;
    }

    setLoading(true);
    try {
      const res = await authApi.forgotPassword({ email: email.trim().toLowerCase() });
      setSubmittedEmail(email.trim().toLowerCase());
      toast.success(res.data.message || 'Tautan atur ulang kata sandi telah dikirim');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Gagal mengirim permintaan atur ulang kata sandi');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthSplitLayout
      badgeText={submittedEmail ? 'Email Terkirim' : 'Keamanan & Akses Akun'}
      badgeVariant={submittedEmail ? 'emerald' : 'pink'}
      title={submittedEmail ? 'Periksa Email Anda 📬' : 'Lupa Kata Sandi? 🔐'}
      subtitle={
        submittedEmail
          ? 'Instruksi reset kata sandi telah kami kirimkan ke kotak masuk email Anda.'
          : 'Masukkan alamat email yang terdaftar. Kami akan mengirimkan tautan aman untuk mengatur ulang kata sandi akun pendidik Anda.'
      }
      backHref="/login"
      backLabel="Kembali ke Masuk"
    >
      {submittedEmail ? (
        <div className="space-y-6 text-center py-4">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400 shadow-md shadow-emerald-500/10">
            <Mail className="h-8 w-8" />
          </div>

          <div className="space-y-2">
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              Jika alamat email terdaftar, instruksi telah dikirimkan ke:
            </p>
            <div className="font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/60 py-1.5 px-3 rounded-lg text-xs font-mono w-fit mx-auto">
              {submittedEmail}
            </div>
            <p className="text-xs text-slate-400 dark:text-slate-500 leading-relaxed pt-2">
              Periksa kotak masuk atau folder spam Anda. Tautan pemulihan kata sandi berlaku selama <strong>60 menit</strong>.
            </p>
          </div>

          <div className="space-y-3 pt-2">
            <Button
              type="button"
              variant="outline"
              className="w-full h-11 rounded-xl text-xs font-semibold border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900"
              onClick={() => setSubmittedEmail(null)}
            >
              <RefreshCw className="mr-2 h-3.5 w-3.5" />
              Kirim Ulang atau Gunakan Email Lain
            </Button>
            <Button
              asChild
              className="w-full h-11 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-[#7C3AED] via-[#2563EB] to-[#06B6D4] hover:opacity-95 shadow-lg shadow-blue-600/20"
            >
              <Link href="/login">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Kembali ke Halaman Masuk
              </Link>
            </Button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              Alamat Email Terdaftar
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="nama@sekolah.sch.id"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
              className="h-11 px-4 rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 focus-visible:ring-violet-500 focus-visible:border-violet-500 text-sm"
            />
          </div>

          <div className="pt-2">
            <Button
              type="submit"
              className="w-full h-11 rounded-xl text-sm font-bold text-white shadow-lg shadow-blue-600/20 bg-gradient-to-r from-[#7C3AED] via-[#2563EB] to-[#06B6D4] hover:opacity-95 hover:shadow-blue-600/30 transition-all"
              disabled={loading}
            >
              {loading ? (
                <Spinner className="mr-2 h-4 w-4 text-white" />
              ) : (
                <>
                  <Mail className="mr-2 h-4 w-4" />
                  <span>Kirim Tautan Atur Ulang</span>
                </>
              )}
            </Button>
          </div>

          <div className="text-center pt-3 border-t border-slate-200/80 dark:border-slate-800/80 mt-6">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Ingat kata sandi akun Anda?{' '}
              <Link
                href="/login"
                className="font-bold text-violet-600 dark:text-violet-400 hover:text-violet-800 dark:hover:text-violet-300 underline decoration-violet-300 dark:decoration-violet-600 transition-colors"
              >
                Masuk di sini
              </Link>
            </p>
          </div>
        </form>
      )}
    </AuthSplitLayout>
  );
}
