'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Turnstile } from '@marsidev/react-turnstile';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import { CheckCircle2, Mail, ShieldAlert, ArrowLeft, RefreshCw, KeyRound } from 'lucide-react';
import { toast } from 'sonner';
import { APP_INFO } from '@/lib/constants/app-info';
import { authApi } from '@/lib/api-service';

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const inviteToken = searchParams.get('invite') || '';

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [nip, setNip] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [turnstileToken, setTurnstileToken] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [checkingInvite, setCheckingInvite] = useState(!!inviteToken);
  const [inviteValid, setInviteValid] = useState(false);

  // Success state for self-registration pending verification
  const [registeredEmail, setRegisteredEmail] = useState<string | null>(null);
  const [resending, setResending] = useState(false);

  const turnstileSiteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || '';

  useEffect(() => {
    if (!inviteToken) return;
    setCheckingInvite(true);
    authApi
      .getInviteInfo(inviteToken)
      .then((res) => {
        setEmail(res.data.data.email);
        setInviteValid(true);
      })
      .catch((err) => {
        toast.error(err.response?.data?.message || 'Tautan undangan tidak valid atau kedaluwarsa');
        setInviteValid(false);
      })
      .finally(() => {
        setCheckingInvite(false);
      });
  }, [inviteToken]);

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

    if (turnstileSiteKey && !inviteToken && !turnstileToken) {
      toast.error('Silakan selesaikan verifikasi anti-bot terlebih dahulu');
      return;
    }

    setLoading(true);
    try {
      const res = await authApi.registerTeacher({
        full_name: fullName.trim(),
        email: email.trim().toLowerCase(),
        password,
        nip: nip.trim() || null,
        turnstile_token: turnstileToken || undefined,
        invite_token: inviteToken || undefined,
      });

      if (res.data.data.is_verified) {
        toast.success('Pendaftaran dan verifikasi berhasil! Silakan masuk.');
        router.push('/login');
      } else {
        setRegisteredEmail(email.trim().toLowerCase());
        toast.success('Pendaftaran berhasil! Silakan periksa email Anda.');
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Gagal mendaftar. Silakan coba lagi.';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!registeredEmail) return;
    setResending(true);
    try {
      const res = await authApi.resendVerification({ email: registeredEmail });
      toast.success(res.data.message || 'Tautan verifikasi telah dikirim ulang.');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Gagal mengirim ulang email verifikasi');
    } finally {
      setResending(false);
    }
  };

  if (checkingInvite) {
    return (
      <Card className="w-full max-w-md p-8 text-center space-y-4">
        <Spinner className="mx-auto h-8 w-8 text-primary" />
        <p className="text-sm text-muted-foreground">Memvalidasi tautan undangan guru...</p>
      </Card>
    );
  }

  if (registeredEmail) {
    return (
      <Card className="relative overflow-hidden w-full max-w-md border shadow-lg text-center p-6 space-y-6">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Mail className="h-8 w-8" />
        </div>
        <div className="space-y-2">
          <CardTitle className="text-xl font-bold">Periksa Email Anda</CardTitle>
          <CardDescription className="text-sm">
            Kami telah mengirimkan tautan verifikasi ke:
          </CardDescription>
          <div className="font-semibold text-foreground bg-muted py-1.5 px-3 rounded text-sm w-fit mx-auto font-mono">
            {registeredEmail}
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed pt-2">
            Silakan buka email Anda dan klik tautan verifikasi dalam kurun waktu <strong>24 jam</strong> untuk mengaktifkan akun Guru Anda.
          </p>
        </div>

        <div className="space-y-3 pt-2">
          <Button
            type="button"
            variant="outline"
            className="w-full text-xs"
            onClick={handleResend}
            disabled={resending}
          >
            {resending ? <Spinner className="mr-2 h-3.5 w-3.5" /> : <RefreshCw className="mr-2 h-3.5 w-3.5" />}
            Kirim Ulang Email Verifikasi
          </Button>
          <Button asChild className="w-full">
            <Link href="/login">Kembali ke Halaman Masuk</Link>
          </Button>
        </div>
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
          {inviteToken ? 'Aktivasi Akun Guru' : 'Pendaftaran Akun Guru'}
        </CardTitle>
        <CardDescription className="text-xs">
          {inviteToken
            ? 'Lengkapi data Anda untuk menerima undangan resmi institusi'
            : 'Daftarkan akun pengajar untuk mengakses bank soal dan evaluasi'}
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-3.5">
          {inviteToken && inviteValid && (
            <div className="flex items-center gap-2 p-2.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-lg text-emerald-800 dark:text-emerald-300 text-xs">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
              <span>Undangan resmi valid. Akun Anda langsung terverifikasi.</span>
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="fullName" className="text-xs">Nama Lengkap &amp; Gelar</Label>
            <Input
              id="fullName"
              placeholder="Contoh: Budi Santoso, S.Pd."
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              autoFocus
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="email" className="text-xs">Alamat Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="nama@sekolah.sch.id"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={!!inviteToken && inviteValid}
              required
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="nip" className="text-xs">NIP / NIY <span className="text-muted-foreground font-normal">(Opsional)</span></Label>
            </div>
            <Input
              id="nip"
              placeholder="Nomor Identitas Pegawai (jika ada)"
              value={nip}
              onChange={(e) => setNip(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-xs">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Min. 6 karakter"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="confirmPassword" className="text-xs">Konfirmasi</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="Ulangi password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>
          </div>

          {/* Turnstile Anti-bot Widget (Self-registration only) */}
          {!inviteToken && (
            <div className="pt-1 flex flex-col items-center">
              {turnstileSiteKey ? (
                <Turnstile
                  siteKey={turnstileSiteKey}
                  onSuccess={(token) => setTurnstileToken(token)}
                  onError={() => toast.error('Gagal memuat proteksi anti-bot')}
                  onExpire={() => setTurnstileToken('')}
                />
              ) : (
                <div className="text-[11px] text-muted-foreground bg-muted/60 px-3 py-1.5 rounded flex items-center gap-1.5">
                  <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                  <span>Proteksi anti-bot aktif (Dev bypass)</span>
                </div>
              )}
            </div>
          )}
        </CardContent>

        <CardFooter className="flex flex-col gap-3 pt-2">
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? <Spinner className="mr-2" /> : null}
            {inviteToken ? 'Aktifkan Akun' : 'Daftar Sekarang'}
          </Button>

          <div className="text-center text-xs text-muted-foreground">
            Sudah memiliki akun?{' '}
            <Link href="/login" className="font-semibold text-primary hover:underline">
              Masuk di sini
            </Link>
          </div>
        </CardFooter>
      </form>
    </Card>
  );
}

export default function RegisterPage() {
  return (
    <div className="relative flex min-h-screen items-center justify-center bg-background px-4 py-8 overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-100 via-transparent to-transparent dark:from-indigo-950/30" />
      <Suspense fallback={<Spinner className="h-8 w-8 text-primary" />}>
        <RegisterForm />
      </Suspense>
      <footer className="absolute bottom-3 flex flex-col items-center text-center gap-0.5 px-4">
        <span className="text-[10px] text-muted-foreground/60">
          {APP_INFO.brand} • {APP_INFO.builtBy} • {APP_INFO.copyright}
        </span>
      </footer>
    </div>
  );
}
