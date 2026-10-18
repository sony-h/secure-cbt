'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Turnstile } from '@marsidev/react-turnstile';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { CheckCircle2, Mail, RefreshCw, ArrowRight, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { authApi } from '@/lib/api-service';
import { AuthSplitLayout } from '@/components/auth/auth-split-layout';

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
      <div className="py-12 text-center space-y-4">
        <Spinner className="mx-auto h-8 w-8 text-cyan-600" />
        <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
          Memvalidasi tautan undangan guru...
        </p>
      </div>
    );
  }

  if (registeredEmail) {
    return (
      <div className="space-y-6 text-center py-4">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-violet-50 dark:bg-violet-950/40 border border-violet-200/80 dark:border-violet-800 text-violet-600 dark:text-violet-400 shadow-md shadow-violet-500/10">
          <Mail className="h-8 w-8" />
        </div>

        <div className="space-y-2">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">
            Periksa Email Anda 📬
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Kami telah mengirimkan tautan verifikasi aktivasi akun ke:
          </p>
          <div className="font-semibold text-violet-700 dark:text-violet-300 bg-violet-50 dark:bg-violet-950/60 border border-violet-200 dark:border-violet-800/60 py-1.5 px-3 rounded-lg text-xs font-mono w-fit mx-auto">
            {registeredEmail}
          </div>
          <p className="text-xs text-slate-400 dark:text-slate-500 leading-relaxed pt-2">
            Buka email Anda dan klik tautan aktivasi dalam kurun waktu <strong>24 jam</strong> untuk mengaktifkan akun Guru Anda.
          </p>
        </div>

        <div className="space-y-3 pt-2">
          <Button
            type="button"
            variant="outline"
            className="w-full h-11 rounded-xl text-xs font-semibold border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900"
            onClick={handleResend}
            disabled={resending}
          >
            {resending ? (
              <Spinner className="mr-2 h-3.5 w-3.5" />
            ) : (
              <RefreshCw className="mr-2 h-3.5 w-3.5" />
            )}
            Kirim Ulang Email Verifikasi
          </Button>
          <Button
            asChild
            className="w-full h-11 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-[#7C3AED] via-[#2563EB] to-[#06B6D4] hover:opacity-95 shadow-lg shadow-blue-600/20"
          >
            <Link href="/login">Kembali ke Halaman Masuk</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3.5">
      {inviteToken && inviteValid && (
        <div className="flex items-center gap-2 p-3 bg-cyan-50 dark:bg-cyan-950/40 border border-cyan-200 dark:border-cyan-800 rounded-xl text-cyan-800 dark:text-cyan-300 text-xs font-medium">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-cyan-600 dark:text-cyan-400" />
          <span>Tautan undangan valid. Akun Anda langsung aktif setelah mendaftar.</span>
        </div>
      )}

      <div className="space-y-1.5">
        <Label htmlFor="fullName" className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
          Nama Lengkap &amp; Gelar
        </Label>
        <Input
          id="fullName"
          placeholder="Contoh: Dr. Budi Santoso, M.Pd."
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          required
          autoFocus
          className="h-10 px-3.5 rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 focus-visible:ring-violet-500 focus-visible:border-violet-500 text-sm"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="email" className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
          Alamat Email Sekolah / Aktif
        </Label>
        <Input
          id="email"
          type="email"
          placeholder="nama@sekolah.sch.id"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={!!inviteToken && inviteValid}
          required
          className="h-10 px-3.5 rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 focus-visible:ring-violet-500 focus-visible:border-violet-500 text-sm disabled:opacity-75 disabled:bg-slate-100 dark:disabled:bg-slate-800"
        />
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label htmlFor="nip" className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
            NIP / NIY <span className="text-slate-400 font-normal lowercase">(opsional)</span>
          </Label>
        </div>
        <Input
          id="nip"
          placeholder="Nomor Identitas Pegawai"
          value={nip}
          onChange={(e) => setNip(e.target.value)}
          className="h-10 px-3.5 rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 focus-visible:ring-violet-500 focus-visible:border-violet-500 text-sm"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="password" className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
            Kata Sandi
          </Label>
          <Input
            id="password"
            type="password"
            placeholder="Min. 6 karakter"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="h-10 px-3.5 rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 focus-visible:ring-violet-500 focus-visible:border-violet-500 text-sm"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="confirmPassword" className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
            Konfirmasi Sandi
          </Label>
          <Input
            id="confirmPassword"
            type="password"
            placeholder="Ulangi sandi"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            className="h-10 px-3.5 rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 focus-visible:ring-violet-500 focus-visible:border-violet-500 text-sm"
          />
        </div>
      </div>

      {/* Cloudflare Turnstile Anti-bot (Self-registration) */}
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
            <div className="w-full text-[11px] text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 px-3.5 py-2 rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                <span>Cloudflare Turnstile Anti-Bot</span>
              </div>
              <span className="font-semibold text-emerald-600 dark:text-emerald-400">Verified</span>
            </div>
          )}
        </div>
      )}

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
              <span>{inviteToken ? 'Aktifkan Akun Guru' : 'Daftar Akun Guru'}</span>
              <ArrowRight className="ml-2 h-4 w-4" />
            </>
          )}
        </Button>
      </div>

      <div className="text-center pt-3 border-t border-slate-200/80 dark:border-slate-800/80 mt-4">
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Sudah memiliki akun?{' '}
          <Link
            href="/login"
            className="font-bold text-violet-600 dark:text-violet-400 hover:text-violet-800 dark:hover:text-violet-300 underline decoration-violet-300 dark:decoration-violet-600 transition-colors"
          >
            Masuk di sini
          </Link>
        </p>
      </div>
    </form>
  );
}

export default function RegisterPage() {
  return (
    <AuthSplitLayout
      badgeText="Registrasi Guru & Kurikulum"
      badgeVariant="cyan"
      title="Mulai Mengajar di Assessia ✨"
      subtitle="Daftarkan akun pendidik untuk mengakses bank soal, membuat ujian, dan analitik penilaian digital."
      backHref="/login"
      backLabel="Kembali ke Masuk"
    >
      <Suspense
        fallback={
          <div className="flex h-40 items-center justify-center">
            <Spinner className="h-8 w-8 text-cyan-600" />
          </div>
        }
      >
        <RegisterForm />
      </Suspense>
    </AuthSplitLayout>
  );
}
