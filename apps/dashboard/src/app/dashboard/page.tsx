'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/auth.store';
import { api } from '@/lib/api';
import { Spinner } from '@/components/ui/table';
import { Users, GraduationCap, BookOpen, FileText } from 'lucide-react';

export default function DashboardHome() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading } = useAuthStore();

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [authLoading, isAuthenticated, router]);

  const { data: studentsData } = useQuery({
    queryKey: ['dashboard-students'],
    queryFn: async () => { const res = await api.get('/students', { params: { per_page: 1 } }); return res.data; },
    enabled: isAuthenticated,
  });

  const { data: teachersData } = useQuery({
    queryKey: ['dashboard-teachers'],
    queryFn: async () => { const res = await api.get('/teachers', { params: { per_page: 1 } }); return res.data; },
    enabled: isAuthenticated,
  });

  const { data: subjectsData } = useQuery({
    queryKey: ['dashboard-subjects'],
    queryFn: async () => { const res = await api.get('/academic/subjects'); return res.data; },
    enabled: isAuthenticated,
  });

  const { data: activeExamsData } = useQuery({
    queryKey: ['dashboard-active-exams'],
    queryFn: async () => {
      const res = await api.get('/exams', { params: { status: 'PUBLISHED', per_page: 1 } });
      return res.data;
    },
    enabled: isAuthenticated,
  });

  if (authLoading) {
    return <div className="flex h-96 items-center justify-center"><Spinner className="h-8 w-8" /></div>;
  }

  const studentCount = studentsData?.meta?.total ?? '—';
  const teacherCount = teachersData?.meta?.total ?? '—';
  const subjectCount = Array.isArray(subjectsData?.data) ? subjectsData.data.length : '—';
  const activeExamCount = activeExamsData?.meta?.total ?? '—';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Selamat datang, {user?.full_name || user?.username}. Berikut ringkasan sistem.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard icon={<Users className="h-5 w-5" />} title="Total Siswa" value={studentCount} subtitle="Terdaftar" />
        <StatsCard icon={<GraduationCap className="h-5 w-5" />} title="Total Guru" value={teacherCount} subtitle="Terdaftar" />
        <StatsCard icon={<BookOpen className="h-5 w-5" />} title="Mata Pelajaran" value={subjectCount} subtitle="Tersedia" />
        <StatsCard icon={<FileText className="h-5 w-5" />} title="Ujian Aktif" value={activeExamCount} subtitle="Dipublikasi" />
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

function StatsCard({ icon, title, value, subtitle }: { icon: React.ReactNode; title: string; value: string | number; subtitle: string }) {
  return (
    <div className="rounded-lg border bg-card p-6">
      <div className="flex items-center gap-3 mb-2">
        <span className="text-muted-foreground">{icon}</span>
        <p className="text-sm font-medium text-muted-foreground">{title}</p>
      </div>
      <p className="text-3xl font-bold">{value}</p>
      <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
    </div>
  );
}
