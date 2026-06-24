'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth.store';
import { Spinner } from '@/components/ui/table';

export default function DashboardHome() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading } = useAuthStore();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isLoading, isAuthenticated, router]);

  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Selamat datang, {user?.full_name || user?.username}. Berikut ringkasan sistem.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard title="Total Siswa" value="30" subtitle="Aktif" />
        <StatsCard title="Total Guru" value="1" subtitle="Terdaftar" />
        <StatsCard title="Mata Pelajaran" value="12" subtitle="Tersedia" />
        <StatsCard title="Ujian Aktif" value="0" subtitle="Sedang berlangsung" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-lg border bg-card p-6">
          <h3 className="mb-4 text-lg font-semibold">Aktivitas Terbaru</h3>
          <p className="text-sm text-muted-foreground">
            Belum ada aktivitas terbaru. Mulai dengan membuat data akademik, siswa, dan guru.
          </p>
        </div>
        <div className="rounded-lg border bg-card p-6">
          <h3 className="mb-4 text-lg font-semibold">Panduan Cepat</h3>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>1. Tambahkan Tahun Ajaran dan Jurusan</li>
            <li>2. Buat kelas dan mata pelajaran</li>
            <li>3. Daftarkan siswa dan guru</li>
            <li>4. Buat bank soal dan ujian</li>
            <li>5. Pantau ujian secara real-time</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

function StatsCard({ title, value, subtitle }: { title: string; value: string; subtitle: string }) {
  return (
    <div className="rounded-lg border bg-card p-6">
      <p className="text-sm font-medium text-muted-foreground">{title}</p>
      <p className="text-3xl font-bold">{value}</p>
      <p className="text-xs text-muted-foreground">{subtitle}</p>
    </div>
  );
}
