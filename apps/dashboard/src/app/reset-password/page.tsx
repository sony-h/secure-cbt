'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { KeyRound, CheckCircle2, XCircle, ArrowRight, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { authApi } from '@/lib/api-service';
import { AuthSplitLayout } from '@/components/auth/auth-split-layout';

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || '';

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  if (!token) {
    return (
      <div className="space-y-6 text-center py-4">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-destructive/10 text-destructive border border-destructive/20 shadow-sm">
          <XCircle className="h-8 w-8" />
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">
            Tautan Tidak Valid ⚠️
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
            Tautan atur ulang kata sandi tidak memuat token verifikasi yang valid atau telah kedaluwarsa.
          </p>
        </div>
        <div className="pt-2 flex flex-col gap-2.5">
          <Button
            asChild
            className="w-full h-11 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-[#7C3AED] via-[#2563EB] to-[#06B6D4] hover:opacity-95 shadow-lg shadow-blue-600/20"
          >
            <Link href="/forgot-password">Minta Tautan Reset Baru</Link>
          </Button>
          <Button
            asChild
            variant="outline"
            className="w-full h-11 rounded-xl text-xs font-semibold border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900"
          >
            <Link href="/login">Kembali ke Halaman Masuk</Link>
          </Button>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast.error('Konfirmasi kata sandi tidak cocok');
      return;
    }

    if (password.length < 6) {
      toast.error('Kata sandi minimal 6 karakter');
      return;
    }

    setLoading(true);
    try {
      const res = await authApi.resetPassword({
        token,
        password,
      });

      setSuccess(true);
      toast.success(res.data.message || 'Kata sandi berhasil diperbarui');
      setTimeout(() => {
        router.push('/login');
      }, 2500);
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Gagal mengatur ulang kata sandi. Tautan mungkin telah kedaluwarsa.';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="space-y-6 text-center py-4">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400 shadow-md shadow-emerald-500/10">
          <CheckCircle2 className="h-10 w-10" />
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">
            Kata Sandi Berhasil Diperbarui! 🎉
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
            Kata sandi akun Anda telah diperbarui dengan aman. Anda akan otomatis dialihkan ke halaman masuk...
          </p>
        </div>
        <div className="pt-2">
          <Button
            asChild
            className="w-full h-11 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-[#7C3AED] via-[#2563EB] to-[#06B6D4] hover:opacity-95 shadow-lg shadow-blue-600/20"
          >
            <Link href="/login">
              <span>Masuk dengan Kata Sandi Baru</span>
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="password" className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
          Kata Sandi Baru
        </Label>
        <Input
          id="password"
          type="password"
          placeholder="Minimal 6 karakter"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          autoFocus
          className="h-11 px-4 rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 focus-visible:ring-violet-500 focus-visible:border-violet-500 text-sm"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="confirmPassword" className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
          Konfirmasi Kata Sandi Baru
        </Label>
        <Input
          id="confirmPassword"
          type="password"
          placeholder="Ketik ulang kata sandi baru"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
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
              <KeyRound className="mr-2 h-4 w-4" />
              <span>Simpan Kata Sandi Baru</span>
            </>
          )}
        </Button>
      </div>

      <div className="text-center pt-3 border-t border-slate-200/80 dark:border-slate-800/80 mt-6">
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Batal mengatur ulang?{' '}
          <Link
            href="/login"
            className="font-bold text-violet-600 dark:text-violet-400 hover:text-violet-800 dark:hover:text-violet-300 underline decoration-violet-300 dark:decoration-violet-600 transition-colors"
          >
            Kembali ke Login
          </Link>
        </p>
      </div>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <AuthSplitLayout
      badgeText="Keamanan Kredensial"
      badgeVariant="pink"
      title="Atur Ulang Kata Sandi 🔐"
      subtitle="Buat kata sandi baru yang kuat untuk melindungi akun pendidik Assessia Anda."
      backHref="/login"
      backLabel="Kembali ke Masuk"
    >
      <Suspense
        fallback={
          <div className="flex h-40 items-center justify-center">
            <Spinner className="h-8 w-8 text-violet-600" />
          </div>
        }
      >
        <ResetPasswordForm />
      </Suspense>
    </AuthSplitLayout>
  );
}
