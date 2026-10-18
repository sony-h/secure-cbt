'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { CheckCircle2, XCircle, ArrowRight } from 'lucide-react';
import { authApi } from '@/lib/api-service';
import { useAuthStore } from '@/stores/auth.store';
import { toast } from 'sonner';

function VerifyEmailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const setSession = useAuthStore((s) => s.setSession);

  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      setErrorMsg('Token verifikasi tidak ditemukan pada tautan.');
      return;
    }

    authApi
      .verifyEmail({ token })
      .then((res) => {
        const data = res.data.data;
        setSession({
          access_token: data.access_token,
          refresh_token: data.refresh_token,
          user: data.user,
        });
        setSuccess(true);
        toast.success('Email berhasil diverifikasi! Selamat datang.');
        setTimeout(() => {
          router.push('/dashboard');
        }, 2000);
      })
      .catch((err) => {
        const msg = err.response?.data?.message || 'Tautan verifikasi tidak valid atau telah kedaluwarsa.';
        setErrorMsg(msg);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [token, router, setSession]);

  return (
    <Card className="relative overflow-hidden w-full max-w-md border shadow-lg text-center p-6 space-y-6">
      {loading ? (
        <div className="py-8 space-y-4">
          <Spinner className="mx-auto h-10 w-10 text-primary" />
          <p className="text-sm font-medium text-foreground">Memverifikasi alamat email Anda...</p>
          <p className="text-xs text-muted-foreground">Mohon tunggu sebentar.</p>
        </div>
      ) : success ? (
        <div className="space-y-4 py-4">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="h-10 w-10" />
          </div>
          <div className="space-y-1.5">
            <CardTitle className="text-xl font-bold text-foreground">Email Terverifikasi!</CardTitle>
            <CardDescription className="text-sm">
              Akun Guru Anda telah aktif. Anda dialihkan ke dashboard secara otomatis...
            </CardDescription>
          </div>
          <Button asChild className="w-full mt-4">
            <Link href="/dashboard">
              Buka Dashboard Sekarang <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      ) : (
        <div className="space-y-4 py-4">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10 text-destructive">
            <XCircle className="h-10 w-10" />
          </div>
          <div className="space-y-1.5">
            <CardTitle className="text-xl font-bold text-foreground">Verifikasi Gagal</CardTitle>
            <CardDescription className="text-sm text-destructive font-medium">
              {errorMsg}
            </CardDescription>
          </div>
          <div className="pt-4 flex flex-col gap-2">
            <Button asChild variant="default" className="w-full">
              <Link href="/register">Daftar Ulang atau Kirim Tautan Baru</Link>
            </Button>
            <Button asChild variant="outline" className="w-full">
              <Link href="/login">Kembali ke Halaman Masuk</Link>
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}

export default function VerifyEmailPage() {
  return (
    <div className="relative flex min-h-screen items-center justify-center bg-background px-4 py-8 overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-100 via-transparent to-transparent dark:from-indigo-950/30" />
      <Suspense fallback={<Spinner className="h-8 w-8 text-primary" />}>
        <VerifyEmailContent />
      </Suspense>
    </div>
  );
}
