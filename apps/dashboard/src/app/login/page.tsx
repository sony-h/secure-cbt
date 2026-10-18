'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/stores/auth.store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import { GraduationCap } from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';
import { APP_INFO } from '@/lib/constants/app-info';

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
      toast.success('Login berhasil');
      router.push(targetRedirect);
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Login gagal. Periksa username dan password.';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="relative overflow-hidden w-full max-w-md transition-all duration-300 hover:shadow-lg hover:shadow-indigo-500/10">
      <CardHeader className="text-center">
        <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-2xl p-1 bg-white dark:bg-slate-900 shadow-md ring-1 ring-border">
          <img
            src="/logo-only-light.png"
            alt="Assessia"
            className="h-12 w-12 object-contain"
          />
        </div>
        <CardTitle className="text-2xl font-extrabold tracking-tight text-foreground">Assessia</CardTitle>
        <p className="text-xs font-semibold text-primary/90 mt-0.5 tracking-wide">
          "{APP_INFO.tagline}"
        </p>
        <CardDescription className="text-xs mt-1">
          Masuk ke panel institusi untuk mengelola asesmen &amp; ujian
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="username">Username atau Email</Label>
            <Input
              id="username"
              placeholder="Masukkan username atau email"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Password</Label>
              <Link
                href="/forgot-password"
                className="text-xs text-muted-foreground hover:text-primary hover:underline"
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
            />
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-3">
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? <Spinner className="mr-2" /> : null}
            Masuk
          </Button>
          <div className="text-center text-xs text-muted-foreground">
            Belum memiliki akun?{' '}
            <Link href="/register" className="font-semibold text-primary hover:underline">
              Daftar Akun Guru
            </Link>
          </div>
        </CardFooter>
      </form>
    </Card>
  );
}

export default function LoginPage() {
  return (
    <div className="relative flex min-h-screen items-center justify-center bg-background px-4 overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-100 via-transparent to-transparent dark:from-indigo-950/30" />
      <Suspense
        fallback={
          <div className="flex h-32 items-center justify-center">
            <Spinner className="h-8 w-8" />
          </div>
        }
      >
        <LoginForm />
      </Suspense>
      <footer className="absolute bottom-4 flex flex-col items-center text-center gap-0.5 px-4">
        <span className="text-xs font-bold tracking-widest text-foreground/80 uppercase">
          {APP_INFO.brand}
        </span>
        <span className="text-[11px] text-muted-foreground italic">
          "{APP_INFO.parentTagline}"
        </span>
        <span className="text-[10px] text-muted-foreground/60 mt-0.5">
          {APP_INFO.builtBy} • {APP_INFO.copyright} • v{APP_INFO.version}
        </span>
      </footer>
    </div>
  );
}
