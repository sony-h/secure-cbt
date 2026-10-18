'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import { KeyRound, CheckCircle2, XCircle, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import { APP_INFO } from '@/lib/constants/app-info';
import { authApi } from '@/lib/api-service';

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
      <Card className="relative overflow-hidden w-full max-w-md border shadow-lg text-center p-6 space-y-6">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10 text-destructive">
          <XCircle className="h-8 w-8" />
        </div>
        <div className="space-y-1.5">
          <CardTitle className="text-xl font-bold">Tautan Tidak Valid</CardTitle>
          <CardDescription className="text-sm">
            Tautan atur ulang kata sandi tidak memuat token yang valid atau telah rusak.
          </CardDescription>
        </div>
        <div className="pt-2 flex flex-col gap-2">
          <Button asChild className="w-full">
            <Link href="/forgot-password">Minta Tautan Reset Baru</Link>
          </Button>
          <Button asChild variant="outline" className="w-full">
            <Link href="/login">Kembali ke Halaman Masuk</Link>
          </Button>
        </div>
      </Card>
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
      <Card className="relative overflow-hidden w-full max-w-md border shadow-lg text-center p-6 space-y-6">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400">
          <CheckCircle2 className="h-10 w-10" />
        </div>
        <div className="space-y-1.5">
          <CardTitle className="text-xl font-bold">Kata Sandi Diperbarui</CardTitle>
          <CardDescription className="text-sm">
            Kata sandi akun Anda telah berhasil diatur ulang. Anda akan dialihkan ke halaman login...
          </CardDescription>
        </div>
        <Button asChild className="w-full mt-4">
          <Link href="/login">
            Masuk dengan Kata Sandi Baru <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </Card>
    );
  }

  return (
    <Card className="relative overflow-hidden w-full max-w-md transition-all duration-300 hover:shadow-lg">
      <CardHeader className="text-center">
        <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl p-1 bg-white dark:bg-slate-900 shadow-md ring-1 ring-border">
          <img src="/logo-only-light.png" alt="Assessia" className="h-10 w-10 object-contain" />
        </div>
        <CardTitle className="text-xl font-extrabold tracking-tight">
          Atur Ulang Kata Sandi
        </CardTitle>
        <CardDescription className="text-xs">
          Masukkan kata sandi baru untuk akun Secure CBT Anda
        </CardDescription>
      </CardHeader>

      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="password" className="text-xs">Kata Sandi Baru</Label>
            <Input
              id="password"
              type="password"
              placeholder="Minimal 6 karakter"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoFocus
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="confirmPassword" className="text-xs">Konfirmasi Kata Sandi Baru</Label>
            <Input
              id="confirmPassword"
              type="password"
              placeholder="Ulangi kata sandi baru"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
          </div>
        </CardContent>

        <CardFooter className="flex flex-col gap-3 pt-2">
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? <Spinner className="mr-2" /> : <KeyRound className="mr-2 h-4 w-4" />}
            Simpan Kata Sandi Baru
          </Button>

          <div className="text-center text-xs text-muted-foreground">
            Batal mengatur ulang?{' '}
            <Link href="/login" className="font-semibold text-primary hover:underline">
              Kembali ke Login
            </Link>
          </div>
        </CardFooter>
      </form>
    </Card>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="relative flex min-h-screen items-center justify-center bg-background px-4 py-8 overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-100 via-transparent to-transparent dark:from-indigo-950/30" />
      <Suspense fallback={<Spinner className="h-8 w-8 text-primary" />}>
        <ResetPasswordForm />
      </Suspense>
      <footer className="absolute bottom-3 flex flex-col items-center text-center gap-0.5 px-4">
        <span className="text-[10px] text-muted-foreground/60">
          {APP_INFO.brand} • {APP_INFO.builtBy} • {APP_INFO.copyright}
        </span>
      </footer>
    </div>
  );
}
