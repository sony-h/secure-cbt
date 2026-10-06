'use client';

import { useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/auth.store';
import { studentApi, teacherApi, academicApi, examApi } from '@/lib/api-service';
import { ErrorBoundary } from '@/components/ui/error-boundary';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Users,
  GraduationCap,
  BookOpen,
  FileText,
  ArrowRight,
  Plus,
  MonitorPlay,
  FileQuestion,
  Calendar,
  Clock,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  ChevronRight,
} from 'lucide-react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { formatDate } from '@/lib/utils';
import { APP_INFO } from '@/lib/constants/app-info';

const DonutChart = dynamic(() => import('@/components/charts/donut-chart'), { ssr: false });

interface ExamItem {
  id: string;
  title: string;
  subject?: { name: string; code?: string };
  status: string;
  duration_minutes: number;
  start_at: string;
  end_at: string;
  _count?: { exam_sessions: number; exam_questions: number };
}

const statusColors: Record<string, string> = {
  DRAFT: '#F59E0B',
  PUBLISHED: '#3B82F6',
  ONGOING: '#10B981',
  FINISHED: '#6366F1',
  CANCELLED: '#EF4444',
};

const statusLabels: Record<string, string> = {
  DRAFT: 'Draft',
  PUBLISHED: 'Terbit',
  ONGOING: 'Sedang Berlangsung',
  FINISHED: 'Selesai',
  CANCELLED: 'Dibatalkan',
};

const badgeVariants: Record<string, 'default' | 'success' | 'warning' | 'destructive'> = {
  DRAFT: 'warning',
  PUBLISHED: 'default',
  ONGOING: 'success',
  FINISHED: 'default',
  CANCELLED: 'destructive',
};

function ExecutiveMetricCard({
  icon: Icon,
  title,
  value,
  subtitle,
  accentColor,
  trendBadge,
}: {
  icon: React.ElementType;
  title: string;
  value: string | number;
  subtitle: string;
  accentColor: string;
  trendBadge?: string;
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-border/70 bg-card p-5 shadow-xs hover:shadow-md transition-all duration-200 group">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          {title}
        </span>
        <div
          className="flex h-10 w-10 items-center justify-center rounded-xl transition-transform duration-200 group-hover:scale-105"
          style={{ backgroundColor: `${accentColor}15`, color: accentColor }}
        >
          <Icon className="h-5 w-5" />
        </div>
      </div>

      <div className="mt-3 flex items-baseline gap-2">
        <p className="text-3xl font-extrabold tracking-tight text-foreground tabular-nums">
          {value}
        </p>
        {trendBadge && (
          <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md">
            {trendBadge}
          </span>
        )}
      </div>

      <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>
    </div>
  );
}

function DashboardHomeContent() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading } = useAuthStore();

  useEffect(() => {
    if (!authLoading && !isAuthenticated) router.push('/login');
  }, [authLoading, isAuthenticated, router]);

  const { data: studentsData } = useQuery({
    queryKey: ['dashboard-students'],
    queryFn: async () => {
      const res = await studentApi.getAll({ per_page: 1 });
      return res.data;
    },
    enabled: isAuthenticated,
  });

  const { data: teachersData } = useQuery({
    queryKey: ['dashboard-teachers'],
    queryFn: async () => {
      const res = await teacherApi.getAll({ per_page: 1 });
      return res.data;
    },
    enabled: isAuthenticated,
  });

  const { data: subjectsData } = useQuery({
    queryKey: ['dashboard-subjects'],
    queryFn: async () => {
      const res = await academicApi.getSubjects();
      return res.data;
    },
    enabled: isAuthenticated,
  });

  const { data: allExamsData } = useQuery({
    queryKey: ['dashboard-all-exams'],
    queryFn: async () => {
      const res = await examApi.getAll({ per_page: 100 });
      return res.data;
    },
    enabled: isAuthenticated,
  });

  if (authLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-44 w-full rounded-2xl" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-2xl" />
          ))}
        </div>
        <div className="grid gap-6 lg:grid-cols-3">
          <Skeleton className="h-72 rounded-2xl" />
          <Skeleton className="h-72 rounded-2xl lg:col-span-2" />
        </div>
      </div>
    );
  }

  const studentCount = studentsData?.meta?.total ?? '—';
  const teacherCount = teachersData?.meta?.total ?? '—';
  const subjectCount = Array.isArray(subjectsData?.data) ? subjectsData.data.length : '—';
  const allExams: ExamItem[] = allExamsData?.data || [];
  const activeExams = allExams.filter((e) => ['PUBLISHED', 'ONGOING'].includes(e.status));
  const activeCount = activeExams.length;
  const totalExams = allExams.length;

  const statusCounts = allExams.reduce<Record<string, number>>((acc, e) => {
    acc[e.status] = (acc[e.status] || 0) + 1;
    return acc;
  }, {});

  const pieData = Object.entries(statusCounts).map(([name, value]) => ({
    name: statusLabels[name] || name,
    value,
    color: statusColors[name] || '#94A3B8',
  }));

  const todayDateFormatted = new Intl.DateTimeFormat('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'Asia/Jakarta',
  }).format(new Date());

  return (
    <div className="space-y-6">
      {/* ── 1. Top Hero Executive Bento Launchpad ──────────────────── */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 text-white p-6 sm:p-8 shadow-xl border border-indigo-900/30">
        {/* Decorative Watermark Circles */}
        <div className="pointer-events-none absolute -right-12 -top-12 h-64 w-64 rounded-full border border-indigo-500/10" />
        <div className="pointer-events-none absolute -bottom-16 right-32 h-56 w-56 rounded-full border border-indigo-400/10" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-semibold border border-indigo-500/30">
                <Sparkles className="h-3 w-3 text-indigo-400" />
                {todayDateFormatted} • WIB
              </span>
              <span className="hidden sm:inline-flex px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[11px] font-bold border border-emerald-500/30">
                v{APP_INFO.version} Enterprise
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              Selamat Datang, {user?.full_name || user?.username || 'Administrator'} 👋
            </h1>
            <p className="text-sm text-indigo-200/80 leading-relaxed">
              Pusat kendali ujian berbasis komputer Secure CBT by Orivastra siap beroperasi. Pantau integritas ujian siswa, kelola bank soal ANBK, dan jadwal secara real-time.
            </p>
          </div>

          {/* Quick Action Dock */}
          <div className="flex flex-wrap sm:flex-nowrap items-center gap-2.5 shrink-0">
            {(user?.role === 'ADMIN' || user?.role === 'TEACHER') && (
              <>
                <Button
                  onClick={() => router.push('/dashboard/exams')}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white shadow-md font-semibold text-xs h-10 px-4 rounded-xl gap-1.5"
                >
                  <Plus className="h-4 w-4" />
                  Jadwal Ujian
                </Button>
                <Button
                  onClick={() => router.push('/dashboard/questions/new')}
                  variant="outline"
                  className="bg-white/10 hover:bg-white/20 text-white border-white/20 text-xs h-10 px-4 rounded-xl gap-1.5 backdrop-blur-sm"
                >
                  <FileQuestion className="h-4 w-4" />
                  Studio Soal
                </Button>
              </>
            )}
            <Button
              onClick={() => router.push('/dashboard/monitoring')}
              className="bg-emerald-600 hover:bg-emerald-500 text-white shadow-md font-semibold text-xs h-10 px-4 rounded-xl gap-1.5"
            >
              <MonitorPlay className="h-4 w-4" />
              Monitoring
            </Button>
          </div>
        </div>
      </div>

      {/* ── 2. Quartet Executive Metric Cards ──────────────────────── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <ExecutiveMetricCard
          icon={Users}
          title="Total Siswa"
          value={studentCount}
          subtitle="Peserta didik terdaftar"
          accentColor="#4F46E5"
          trendBadge="Aktif"
        />
        <ExecutiveMetricCard
          icon={GraduationCap}
          title="Tenaga Pengajar"
          value={teacherCount}
          subtitle="Guru pengampu ujian"
          accentColor="#059669"
          trendBadge={`${subjectCount} Mapel`}
        />
        <ExecutiveMetricCard
          icon={BookOpen}
          title="Mata Pelajaran"
          value={subjectCount}
          subtitle="Tersedia di kurikulum"
          accentColor="#7C3AED"
        />
        <ExecutiveMetricCard
          icon={FileText}
          title="Ujian Terjadwal"
          value={totalExams}
          subtitle={`${activeCount} ujian aktif saat ini`}
          accentColor="#EA580C"
          trendBadge={activeCount > 0 ? `${activeCount} Live` : undefined}
        />
      </div>

      {/* ── 3. Middle Bento Grid: Charts & Boarding-Pass Exams List ─── */}
      <div className="grid gap-6 lg:grid-cols-12 items-start">
        {/* Left: Exam Status Donut Chart (5 cols) */}
        <div className="lg:col-span-5 rounded-2xl border border-border/70 bg-card p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-border/50">
            <div>
              <h3 className="text-base font-bold text-foreground">Distribusi Status Ujian</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Proporsi seluruh jadwal ujian</p>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-muted text-foreground tabular-nums">
              {totalExams} Total
            </span>
          </div>

          {pieData.length > 0 ? (
            <div className="space-y-4 pt-1">
              <div className="h-48 w-full flex items-center justify-center">
                <DonutChart data={pieData} />
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-border/50">
                {pieData.map((entry) => (
                  <div key={entry.name} className="flex items-center justify-between p-2 rounded-lg bg-muted/40">
                    <div className="flex items-center gap-2">
                      <div className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: entry.color }} />
                      <span className="text-muted-foreground font-medium truncate">{entry.name}</span>
                    </div>
                    <span className="font-bold text-foreground tabular-nums ml-2">{entry.value}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="py-16 text-center text-sm text-muted-foreground">
              Belum ada data ujian yang tercatat.
            </div>
          )}
        </div>

        {/* Right: Boarding-Pass Exams Schedule (7 cols) */}
        <div className="lg:col-span-7 rounded-2xl border border-border/70 bg-card p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-border/50">
            <div>
              <h3 className="text-base font-bold text-foreground">Jadwal & Sesi Ujian</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Ujian yang siap atau sedang diikuti siswa</p>
            </div>
            <Link
              href="/dashboard/exams"
              className="text-xs font-semibold text-primary hover:underline flex items-center gap-1 p-1"
            >
              Lihat Semua <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
            {allExams.length === 0 ? (
              <EmptyState title="Belum Ada Ujian" description="Buat jadwal ujian baru untuk memulai asesmen." className="py-10" />
            ) : (
              allExams.slice(0, 6).map((exam) => (
                <div
                  key={exam.id}
                  onClick={() => router.push('/dashboard/exams')}
                  className="group flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl border border-border/80 bg-background hover:bg-muted/40 hover:border-primary/40 transition-all cursor-pointer shadow-2xs"
                >
                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-foreground truncate group-hover:text-primary transition-colors">
                        {exam.title}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <span className="font-semibold text-primary/90 bg-primary/10 px-2 py-0.5 rounded">
                        {exam.subject?.name || 'Umum'}
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" /> {exam.duration_minutes} menit
                      </span>
                      <span>•</span>
                      <span>{exam._count?.exam_questions || 0} soal</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5 shrink-0 self-end sm:self-center">
                    <Badge variant={badgeVariants[exam.status] || 'default'}>
                      {statusLabels[exam.status] || exam.status}
                    </Badge>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* ── 4. Bottom Executive Workflow Protocol ──────────────────── */}
      <div className="rounded-2xl border border-border/70 bg-card p-6 shadow-xs">
        <div className="mb-4">
          <h3 className="text-base font-bold text-foreground">Protokol Penyelenggaraan Ujian (Workflow CBT)</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Tiga tahapan standar pelaksanaan ujian sekolah berbasis komputer</p>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <div className="flex gap-3.5 p-4 rounded-xl border border-border/60 bg-muted/20">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-500/10 text-sm font-bold text-indigo-600 dark:text-indigo-400">
              01
            </div>
            <div>
              <p className="font-bold text-foreground text-sm">Persiapan Akademik</p>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                Konfigurasi tahun ajaran, kelas, dan data peserta didik agar hak akses token ujian tepat sasaran.
              </p>
            </div>
          </div>

          <div className="flex gap-3.5 p-4 rounded-xl border border-border/60 bg-muted/20">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-500/10 text-sm font-bold text-violet-600 dark:text-violet-400">
              02
            </div>
            <div>
              <p className="font-bold text-foreground text-sm">Bank Soal &amp; ANBK</p>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                Tulis soal di Studio Soal dengan rumus KaTeX, diagram WebP, serta format Isian Singkat &amp; Menjodohkan.
              </p>
            </div>
          </div>

          <div className="flex gap-3.5 p-4 rounded-xl border border-border/60 bg-muted/20">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-sm font-bold text-emerald-600 dark:text-emerald-400">
              03
            </div>
            <div>
              <p className="font-bold text-foreground text-sm">Monitoring &amp; Anti-Cheat</p>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                Pantau ruang ujian secara live. Sistem otomatis mengunci layar siswa jika terdeteksi split-screen atau status bar drag.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function DashboardHome() {
  return (
    <ErrorBoundary>
      <DashboardHomeContent />
    </ErrorBoundary>
  );
}
