'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/stores/auth.store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { toast } from 'sonner';
import { AuthSplitLayout } from '@/components/auth/auth-split-layout';
import { ArrowRight } from 'lucide-react';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login, isAuthenticated } = useAuthStore();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const rawRedirect = searchParams.get('redirect');
  const targetRedirect =
    rawRedirect && rawRedirect.startsWith('/') && !rawRedirect.startsWith('//')
      ? rawRedirect
      : '/dashboard';

  // Redirect if already authenticated
  if (isAuthenticated) {
    router.push(targetRedirect);
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(username, password);
      toast.success('Login berhasil! Mengalihkan ke dashboard...');
      router.push(targetRedirect);
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Login gagal. Periksa username dan password.';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="username" className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
          Username atau Email
        </Label>
        <Input
          id="username"
          placeholder="Masukkan username atau email"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
          autoFocus
          className="h-11 px-4 rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 focus-visible:ring-violet-500 focus-visible:border-violet-500 transition-all text-sm"
        />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="password" className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
            Kata Sandi
          </Label>
          <Link
            href="/forgot-password"
            className="text-xs font-semibold text-violet-600 dark:text-violet-400 hover:text-violet-800 dark:hover:text-violet-300 hover:underline transition-colors"
          >
            Lupa kata sandi?
          </Link>
        </div>
        <Input
          id="password"
          type="password"
          placeholder="Masukkan password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="h-11 px-4 rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 focus-visible:ring-violet-500 focus-visible:border-violet-500 transition-all text-sm"
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
              <span>Masuk ke Dashboard</span>
              <ArrowRight className="ml-2 h-4 w-4" />
            </>
          )}
        </Button>
      </div>

      <div className="text-center pt-3 border-t border-slate-200/80 dark:border-slate-800/80 mt-6">
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Belum memiliki akun guru?{' '}
          <Link
            href="/register"
            className="font-bold text-violet-600 dark:text-violet-400 hover:text-violet-800 dark:hover:text-violet-300 underline decoration-violet-300 dark:decoration-violet-600 transition-colors"
          >
            Daftar Akun Baru
          </Link>
        </p>
      </div>
    </form>
  );
}

export default function LoginPage() {
  return (
    <AuthSplitLayout
      badgeText="Portal Pendidik & Admin"
      badgeVariant="purple"
      title="Selamat Datang Kembali 👋"
      subtitle="Masuk ke panel institusi untuk mengelola bank soal, ujian, dan integritas asesmen digital."
    >
      <Suspense
        fallback={
          <div className="flex h-40 items-center justify-center">
            <Spinner className="h-8 w-8 text-violet-600" />
          </div>
        }
      >
        <LoginForm />
      </Suspense>
    </AuthSplitLayout>
  );
}
