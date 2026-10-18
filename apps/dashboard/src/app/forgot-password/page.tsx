'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import { Mail, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { APP_INFO } from '@/lib/constants/app-info';
import { authApi } from '@/lib/api-service';

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
    <div className="relative flex min-h-screen items-center justify-center bg-background px-4 py-8 overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-100 via-transparent to-transparent dark:from-indigo-950/30" />

      {submittedEmail ? (
        <Card className="relative overflow-hidden w-full max-w-md border shadow-lg text-center p-6 space-y-6">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Mail className="h-8 w-8" />
          </div>
          <div className="space-y-2">
            <CardTitle className="text-xl font-bold">Periksa Email Anda</CardTitle>
            <CardDescription className="text-sm">
              Jika alamat email terdaftar, kami telah mengirimkan instruksi reset ke:
            </CardDescription>
            <div className="font-semibold text-foreground bg-muted py-1.5 px-3 rounded text-sm w-fit mx-auto font-mono">
              {submittedEmail}
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed pt-2">
              Silakan periksa inbox atau folder spam Anda. Tautan atur ulang kata sandi berlaku selama <strong>1 jam</strong>.
            </p>
          </div>

          <div className="space-y-3 pt-2">
            <Button
              type="button"
              variant="outline"
              className="w-full text-xs"
              onClick={() => setSubmittedEmail(null)}
            >
              Kirim Ulang atau Gunakan Email Lain
            </Button>
            <Button asChild className="w-full">
              <Link href="/login">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Kembali ke Halaman Masuk
              </Link>
            </Button>
          </div>
        </Card>
      ) : (
        <Card className="relative overflow-hidden w-full max-w-md transition-all duration-300 hover:shadow-lg">
          <CardHeader className="text-center">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl p-1 bg-white dark:bg-slate-900 shadow-md ring-1 ring-border">
              <img src="/logo-only-light.png" alt="Assessia" className="h-10 w-10 object-contain" />
            </div>
            <CardTitle className="text-xl font-extrabold tracking-tight">
              Lupa Kata Sandi?
            </CardTitle>
            <CardDescription className="text-xs">
              Masukkan alamat email akun Anda. Kami akan mengirimkan tautan untuk mengatur ulang kata sandi.
            </CardDescription>
          </CardHeader>

          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-xs">Alamat Email Terdaftar</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="nama@sekolah.sch.id"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoFocus
                />
              </div>
            </CardContent>

            <CardFooter className="flex flex-col gap-3 pt-2">
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? <Spinner className="mr-2" /> : <Mail className="mr-2 h-4 w-4" />}
                Kirim Tautan Reset
              </Button>

              <div className="text-center text-xs text-muted-foreground">
                Ingat kata sandi Anda?{' '}
                <Link href="/login" className="font-semibold text-primary hover:underline">
                  Masuk di sini
                </Link>
              </div>
            </CardFooter>
          </form>
        </Card>
      )}

      <footer className="absolute bottom-3 flex flex-col items-center text-center gap-0.5 px-4">
        <span className="text-[10px] text-muted-foreground/60">
          {APP_INFO.brand} • {APP_INFO.builtBy} • {APP_INFO.copyright}
        </span>
      </footer>
    </div>
  );
}
