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
  Plus,
  MonitorPlay,
  FileQuestion,
  Calendar,
  Clock,
  Sparkles,
  ShieldCheck,
  ChevronRight,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { APP_INFO } from '@/lib/constants/app-info';
import { UserRole } from '@secure-cbt/shared';

const DonutChart = dynamic(() => import('@/components/charts/donut-chart'), { ssr: false });

interface ExamItem {
  id: string;
  title: string;
  subject_id?: string;
  subject?: { id?: string; name: string; code?: string };
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
  FINISHED: '#7C3AED',
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
  onClick,
}: {
  icon: React.ElementType;
  title: string;
  value: string | number;
  subtitle: string;
  accentColor: string;
  trendBadge?: string;
  onClick?: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className={`relative overflow-hidden rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-card p-5 shadow-xs hover:shadow-xl hover:-translate-y-0.5 hover:border-violet-400/40 dark:hover:border-violet-500/40 transition-all duration-300 group select-none ${
        onClick ? 'cursor-pointer' : ''
      }`}
    >
      {/* Ambient Radial Glow on hover */}
      <div
        className="pointer-events-none absolute -right-6 -bottom-6 h-28 w-28 rounded-full blur-2xl opacity-15 transition-opacity duration-300 group-hover:opacity-35"
        style={{ backgroundColor: accentColor }}
      />

      <div className="flex items-center justify-between relative z-10">
        <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground group-hover:text-foreground transition-colors">
          {title}
        </span>
        <div
          className="flex h-10 w-10 items-center justify-center rounded-xl transition-all duration-300 group-hover:scale-110 shadow-sm"
          style={{ backgroundColor: `${accentColor}18`, color: accentColor }}
        >
          <Icon className="h-5 w-5" />
        </div>
      </div>

      <div className="mt-3.5 flex items-baseline gap-2 relative z-10">
        <p className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground tabular-nums">
          {value}
        </p>
        {trendBadge && (
          <span className="text-[10.5px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full shadow-2xs">
            {trendBadge}
          </span>
        )}
      </div>

      <p className="mt-1 text-xs text-muted-foreground relative z-10 leading-relaxed font-medium">
        {subtitle}
      </p>
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
        <Skeleton className="h-52 w-full rounded-3xl" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-2xl" />
          ))}
        </div>
        <div className="grid gap-6 lg:grid-cols-12">
          <Skeleton className="h-80 rounded-2xl lg:col-span-5" />
          <Skeleton className="h-80 rounded-2xl lg:col-span-7" />
        </div>
      </div>
    );
  }

  const isTeacher = user?.role === UserRole.TEACHER;
  const isProctor = !!user?.teacher?.can_monitor_all_subjects;
  const teacherSubjects = user?.teacher?.teacher_subjects || [];
  const teacherSubjectIds = useMemo(() => {
    return new Set(teacherSubjects.map((ts) => ts.subject_id || ts.subject?.id).filter(Boolean));
  }, [teacherSubjects]);

  const studentCount = studentsData?.meta?.total ?? '—';
  const teacherCount = teachersData?.meta?.total ?? '—';
  const totalCurriculumSubjects = Array.isArray(subjectsData?.data) ? subjectsData.data.length : '—';
  const subjectCount = isTeacher ? teacherSubjects.length : totalCurriculumSubjects;

  const rawExams: ExamItem[] = allExamsData?.data || [];
  const allExams: ExamItem[] = useMemo(() => {
    if (!isTeacher) return rawExams;
    return rawExams.filter((e) =>
      teacherSubjectIds.has(e.subject?.id || e.subject_id || ''),
    );
  }, [rawExams, isTeacher, teacherSubjectIds]);

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
      
      {/* ── 1. Grand Aurora Executive Launchpad Hero ──────────────────── */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#090d1c] via-[#0d1636] to-[#070b18] text-white p-6 sm:p-8 lg:p-10 shadow-2xl border border-violet-900/30">
        
        {/* Subtle Constellation Texture Overlay */}
        <div
          className="absolute inset-0 pointer-events-none opacity-20"
          style={{
            backgroundImage: 'radial-gradient(rgba(255, 255, 255, 0.15) 1px, transparent 1px)',
            backgroundSize: '24px 24px',
          }}
        />

        {/* Ambient Floating Aurora Glow Blobs */}
        <div className="pointer-events-none absolute -right-16 -top-16 h-80 w-80 rounded-full bg-purple-600/25 blur-3xl animate-pulse" />
        <div className="pointer-events-none absolute -bottom-16 right-24 h-72 w-72 rounded-full bg-blue-600/20 blur-3xl animate-pulse delay-700" />
        <div className="pointer-events-none absolute left-1/4 top-1/2 -translate-y-1/2 h-56 w-56 rounded-full bg-cyan-500/15 blur-2xl animate-pulse delay-1000" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            
            {/* Top Pill Badges */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-cyan-300 text-xs font-bold border border-cyan-400/30 backdrop-blur-md shadow-xs">
                <Calendar className="h-3.5 w-3.5 text-cyan-300" />
                {todayDateFormatted} &bull; WIB
              </span>

              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-violet-500/20 text-violet-200 text-[11px] font-bold border border-violet-500/30">
                <Sparkles className="h-3 w-3 text-violet-300" />
                Assessia v{APP_INFO.version}
              </span>

              {isTeacher && isProctor && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-200 text-[11px] font-bold border border-emerald-500/30">
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-300" />
                  Pengawas Aktif (Semua Mapel)
                </span>
              )}
            </div>

            {/* Greeting & Subtitle */}
            <div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-white leading-tight">
                Selamat Datang, {user?.full_name || user?.username || 'Pendidik'} 👋
              </h1>
              <p className="text-xs sm:text-sm text-cyan-300/80 font-semibold tracking-wide italic mt-1">
                &ldquo;{APP_INFO.tagline}&rdquo;
              </p>
            </div>

            <p className="text-xs sm:text-sm text-slate-300/90 leading-relaxed font-light">
              {isTeacher
                ? `Pusat kendali pengajar institusi. Anda mengampu ${teacherSubjects.length} mata pelajaran. Susun bank soal ANBK & formula LaTeX, atur jadwal ujian, dan pantau kejujuran siswa secara real-time.`
                : 'Pusat kendali eksekutif Assessia by Orivastra siap beroperasi. Kelola kurikulum akademik, atur bank soal berstandar tinggi, dan pantau integritas ujian siswa dari satu dasbor terpadu.'}
            </p>
          </div>

          {/* Quick Action Dock */}
          <div className="flex flex-wrap sm:flex-nowrap items-center gap-2.5 shrink-0">
            {(user?.role === 'ADMIN' || user?.role === 'TEACHER') && (
              <>
                <Button
                  onClick={() => router.push('/dashboard/exams')}
                  className="bg-violet-600 hover:bg-violet-500 text-white shadow-md shadow-violet-600/25 font-bold text-xs h-11 px-5 rounded-xl gap-2 active:scale-95 transition-all"
                >
                  <Plus className="h-4 w-4" />
                  <span>Jadwal Ujian</span>
                </Button>
                <Button
                  onClick={() => router.push('/dashboard/questions/new')}
                  variant="outline"
                  className="bg-white/10 hover:bg-white/20 text-white border-white/20 text-xs h-11 px-4 rounded-xl gap-2 backdrop-blur-md active:scale-95 transition-all"
                >
                  <FileQuestion className="h-4 w-4 text-cyan-300" />
                  <span>Studio Soal</span>
                </Button>
              </>
            )}
            <Button
              onClick={() => router.push('/dashboard/monitoring')}
              className="bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/30 font-bold text-xs h-11 px-5 rounded-xl gap-2 active:scale-95 transition-all"
            >
              <MonitorPlay className="h-4 w-4" />
              <span>Monitoring Live</span>
            </Button>
          </div>

        </div>
      </div>

      {/* ── 2. Quartet Executive Metric Cards (Aurora Cosmos) ──────── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <ExecutiveMetricCard
          icon={Users}
          title="Total Siswa"
          value={studentCount}
          subtitle="Peserta didik aktif terdaftar"
          accentColor="#2563EB"
          trendBadge="Aktif"
          onClick={() => router.push('/dashboard/students')}
        />
        <ExecutiveMetricCard
          icon={isTeacher ? BookOpen : GraduationCap}
          title={isTeacher ? 'Mapel Diampu Anda' : 'Tenaga Pengajar'}
          value={isTeacher ? teacherSubjects.length : teacherCount}
          subtitle={isTeacher ? 'Ditugaskan ke profil Anda' : 'Guru & pengampu aktif'}
          accentColor="#06B6D4"
          trendBadge={isTeacher ? (isProctor ? 'Pengawas Aktif' : 'Pengampu') : `${totalCurriculumSubjects} Mapel`}
          onClick={() => router.push(isTeacher ? '/dashboard/academic' : '/dashboard/teachers')}
        />
        <ExecutiveMetricCard
          icon={isTeacher ? GraduationCap : BookOpen}
          title={isTeacher ? 'Total Kurikulum' : 'Mata Pelajaran'}
          value={totalCurriculumSubjects}
          subtitle="Tersedia di kurikulum institusi"
          accentColor="#7C3AED"
          onClick={() => router.push('/dashboard/academic')}
        />
        <ExecutiveMetricCard
          icon={FileText}
          title={isTeacher ? 'Ujian Mapel Anda' : 'Ujian Terjadwal'}
          value={totalExams}
          subtitle={`${activeCount} ujian aktif saat ini`}
          accentColor="#EC4899"
          trendBadge={activeCount > 0 ? `${activeCount} Live` : undefined}
          onClick={() => router.push('/dashboard/exams')}
        />
      </div>

      {/* ── 3. Middle Bento Grid: Charts & Boarding-Pass Exams List ─── */}
      <div className="grid gap-6 lg:grid-cols-12 items-start">
        
        {/* Left: Exam Status Donut Chart (5 cols) */}
        <div className="lg:col-span-5 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-card p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-border/50">
            <div>
              <h2 className="text-base font-bold text-foreground">Distribusi Status Ujian</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Proporsi seluruh jadwal ujian saat ini</p>
            </div>
            <span className="text-xs font-bold px-3 py-1 rounded-full bg-violet-50 dark:bg-violet-950/40 text-violet-700 dark:text-violet-300 border border-violet-200 dark:border-violet-800 tabular-nums">
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
                  <div
                    key={entry.name}
                    className="flex items-center justify-between p-2 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800/60"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="h-2.5 w-2.5 rounded-full shrink-0 shadow-xs" style={{ backgroundColor: entry.color }} />
                      <span className="text-muted-foreground font-medium truncate">{entry.name}</span>
                    </div>
                    <span className="font-bold text-foreground tabular-nums ml-2">{entry.value}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="py-16 text-center text-sm text-muted-foreground">
              Belum ada data ujian yang tercatat di sistem.
            </div>
          )}
        </div>

        {/* Right: Boarding-Pass Exams Schedule (7 cols) */}
        <div className="lg:col-span-7 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-card p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-border/50">
            <div>
              <h2 className="text-base font-bold text-foreground">Jadwal &amp; Sesi Ujian</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Ujian yang siap atau sedang berlangsung</p>
            </div>
            <Link
              href="/dashboard/exams"
              className="text-xs font-bold text-violet-600 dark:text-violet-400 hover:underline flex items-center gap-1 p-1 transition-colors"
            >
              <span>Lihat Semua</span>
              <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
            {allExams.length === 0 ? (
              <EmptyState
                title="Belum Ada Ujian Terjadwal"
                description="Buat jadwal ujian baru untuk memulai asesmen digital bersama siswa."
                className="py-10"
              />
            ) : (
              allExams.slice(0, 6).map((exam) => (
                <div
                  key={exam.id}
                  onClick={() => router.push('/dashboard/exams')}
                  className="group relative flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800/80 bg-background hover:bg-slate-50 dark:hover:bg-slate-900/60 hover:border-violet-400/50 dark:hover:border-violet-600/50 transition-all cursor-pointer shadow-2xs hover:shadow-md"
                >
                  <div className="space-y-1.5 min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-foreground truncate group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors">
                        {exam.title}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <span className="font-bold text-violet-700 dark:text-violet-300 bg-violet-50 dark:bg-violet-950/60 border border-violet-200/80 dark:border-violet-800/60 px-2 py-0.5 rounded-md text-[11px]">
                        {exam.subject?.name || 'Umum'}
                      </span>
                      <span>&bull;</span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" /> {exam.duration_minutes} menit
                      </span>
                      <span>&bull;</span>
                      <span>{exam._count?.exam_questions || 0} butir soal</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5 shrink-0 self-end sm:self-center">
                    <Badge variant={badgeVariants[exam.status] || 'default'} className="font-semibold text-[11px]">
                      {statusLabels[exam.status] || exam.status}
                    </Badge>
                    <ArrowRight className="h-4 w-4 text-slate-400 group-hover:text-violet-600 group-hover:translate-x-0.5 transition-all" />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

      {/* ── 4. Bottom Assessment Protocol Workflow ──────────────────── */}
      <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-card p-6 shadow-xs">
        <div className="mb-4">
          <h2 className="text-base font-bold text-foreground">Protokol Penyelenggaraan Asesmen Assessia</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Tiga tahapan standar operasional pelaksanaan asesmen digital berintegritas tinggi</p>
        </div>
        
        <div className="grid gap-4 md:grid-cols-3">
          
          {/* Step 1 */}
          <div className="flex gap-3.5 p-4 rounded-xl border border-slate-200/70 dark:border-slate-800/70 bg-slate-50/50 dark:bg-slate-900/30 hover:border-violet-400/40 transition-colors">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-600/10 text-sm font-extrabold text-violet-600 dark:text-violet-400 border border-violet-500/20 shadow-2xs">
              01
            </div>
            <div>
              <p className="font-bold text-foreground text-sm">Persiapan Akademik</p>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                Konfigurasi tahun ajaran, rombel kelas, dan kredensial peserta didik agar distribusi hak akses token ujian akurat.
              </p>
            </div>
          </div>

          {/* Step 2 */}
          <div className="flex gap-3.5 p-4 rounded-xl border border-slate-200/70 dark:border-slate-800/70 bg-slate-50/50 dark:bg-slate-900/30 hover:border-blue-400/40 transition-colors">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-600/10 text-sm font-extrabold text-blue-600 dark:text-blue-400 border border-blue-500/20 shadow-2xs">
              02
            </div>
            <div>
              <p className="font-bold text-foreground text-sm">Bank Soal &amp; ANBK</p>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                Susun butir soal di Studio Soal dengan formula LaTeX, diagram WebP, stimulus audio, serta format Isian &amp; Menjodohkan.
              </p>
            </div>
          </div>

          {/* Step 3 */}
          <div className="flex gap-3.5 p-4 rounded-xl border border-slate-200/70 dark:border-slate-800/70 bg-slate-50/50 dark:bg-slate-900/30 hover:border-cyan-400/40 transition-colors">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-cyan-600/10 text-sm font-extrabold text-cyan-600 dark:text-cyan-400 border border-cyan-500/20 shadow-2xs">
              03
            </div>
            <div>
              <p className="font-bold text-foreground text-sm">Monitoring &amp; Anti-Cheat</p>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                Kawal ujian dengan deteksi freeze, keluar tab, audio violation deterrence, dan kalkulasi skor otomatis real-time.
              </p>
            </div>
          </div>

        </div>
      </div>

    </div>
  );
}

export default function DashboardPage() {
  return (
    <ErrorBoundary>
      <DashboardHomeContent />
    </ErrorBoundary>
  );
}
