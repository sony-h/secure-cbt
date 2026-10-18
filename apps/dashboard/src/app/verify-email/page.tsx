'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { CheckCircle2, XCircle, ArrowRight } from 'lucide-react';
import { authApi } from '@/lib/api-service';
import { useAuthStore } from '@/stores/auth.store';
import { toast } from 'sonner';
import { AuthSplitLayout } from '@/components/auth/auth-split-layout';

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
        toast.success('Email berhasil diverifikasi! Selamat datang di Assessia.');
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

  if (loading) {
    return (
      <div className="py-12 space-y-4 text-center">
        <Spinner className="mx-auto h-10 w-10 text-violet-600 dark:text-violet-400" />
        <h2 className="text-base font-bold text-slate-800 dark:text-slate-200">
          Memverifikasi alamat email Anda...
        </h2>
        <p className="text-xs text-slate-400 dark:text-slate-500">
          Sistem sedang memvalidasi token otentikasi. Mohon tunggu sebentar.
        </p>
      </div>
    );
  }

  if (success) {
    return (
      <div className="space-y-6 text-center py-4">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400 shadow-md shadow-emerald-500/10">
          <CheckCircle2 className="h-10 w-10" />
        </div>

        <div className="space-y-2">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">
            Email Berhasil Diverifikasi! 🎉
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-sm mx-auto leading-relaxed">
            Akun Guru Anda kini telah aktif sepenuhnya. Anda akan dialihkan ke dashboard institusi secara otomatis...
          </p>
        </div>

        <div className="pt-2">
          <Button
            asChild
            className="w-full h-11 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-[#7C3AED] via-[#2563EB] to-[#06B6D4] hover:opacity-95 shadow-lg shadow-blue-600/20"
          >
            <Link href="/dashboard">
              <span>Buka Dashboard Sekarang</span>
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 text-center py-4">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-destructive/10 text-destructive border border-destructive/20 shadow-sm">
        <XCircle className="h-8 w-8" />
      </div>

      <div className="space-y-2">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">
          Verifikasi Gagal ⚠️
        </h2>
        <p className="text-xs sm:text-sm text-destructive font-medium max-w-sm mx-auto">
          {errorMsg}
        </p>
      </div>

      <div className="pt-2 flex flex-col gap-2.5">
        <Button
          asChild
          className="w-full h-11 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-[#7C3AED] via-[#2563EB] to-[#06B6D4] hover:opacity-95 shadow-lg shadow-blue-600/20"
        >
          <Link href="/register">Daftar Ulang atau Kirim Tautan Baru</Link>
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

export default function VerifyEmailPage() {
  return (
    <AuthSplitLayout
      badgeText="Verifikasi Akun Pendidik"
      badgeVariant="emerald"
      title="Aktivasi Akun Assessia ✨"
      subtitle="Memastikan keamanan data dan kredensial pengajar pada platform Assessia."
      backHref="/login"
      backLabel="Kembali ke Masuk"
    >
      <Suspense
        fallback={
          <div className="flex h-40 items-center justify-center">
            <Spinner className="h-8 w-8 text-emerald-600" />
          </div>
        }
      >
        <VerifyEmailContent />
      </Suspense>
    </AuthSplitLayout>
  );
}
