'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/auth.store';
import { studentApi, teacherApi, academicApi, examApi } from '@/lib/api-service';
import { ErrorBoundary } from '@/components/ui/error-boundary';
import { Spinner } from '@/components/ui/spinner';
import { Badge } from '@/components/ui/badge';
import { Users, GraduationCap, BookOpen, FileText, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

interface ExamItem {
  id: string; title: string; subject?: { name: string }; status: string;
  duration_minutes: number; start_at: string; end_at: string;
  _count?: { exam_sessions: number; exam_questions: number };
}

const statusColors: Record<string, string> = {
  DRAFT: '#F59E0B', PUBLISHED: '#3B82F6', ONGOING: '#10B981', FINISHED: '#6366F1', CANCELLED: '#EF4444',
};

const statusLabels: Record<string, string> = {
  DRAFT: 'Draft', PUBLISHED: 'Terbit', ONGOING: 'Aktif', FINISHED: 'Selesai', CANCELLED: 'Batal',
};

const badgeVariants: Record<string, 'default' | 'success' | 'warning' | 'destructive'> = {
  DRAFT: 'warning', PUBLISHED: 'default', ONGOING: 'success', FINISHED: 'default', CANCELLED: 'destructive',
};

const steps = [
  { title: 'Setup Akademik', desc: 'Atur tahun ajaran, jurusan, kelas & mata pelajaran.' },
  { title: 'Bank Soal & Ujian', desc: 'Buat soal (PG/esai) lalu susun paket ujian dan jadwalkan.' },
  { title: 'Ujian & Monitoring', desc: 'Terbitkan ujian, bagikan token, pantau siswa secara realtime.' },
];

function StatCard({ icon, title, value, subtitle, gradient }: {
  icon: React.ReactNode; title: string; value: string | number; subtitle: string; gradient: string;
}) {
  return (
    <div className={`relative overflow-hidden rounded-xl bg-gradient-to-br ${gradient} p-5 text-white shadow-sm`}>
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-semibold text-white/80">{title}</p>
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/20 text-white">{icon}</span>
      </div>
      <p className="text-3xl font-extrabold">{value}</p>
      <p className="text-xs text-white/70 mt-1">{subtitle}</p>
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
    queryFn: async () => { const res = await studentApi.getAll({ per_page: 1 }); return res.data; },
    enabled: isAuthenticated,
  });

  const { data: teachersData } = useQuery({
    queryKey: ['dashboard-teachers'],
    queryFn: async () => { const res = await teacherApi.getAll({ per_page: 1 }); return res.data; },
    enabled: isAuthenticated,
  });

  const { data: subjectsData } = useQuery({
    queryKey: ['dashboard-subjects'],
    queryFn: async () => { const res = await academicApi.getSubjects(); return res.data; },
    enabled: isAuthenticated,
  });

  const { data: allExamsData } = useQuery({
    queryKey: ['dashboard-all-exams'],
    queryFn: async () => { const res = await examApi.getAll({ per_page: 100 }); return res.data; },
    enabled: isAuthenticated,
  });

  if (authLoading) {
    return <div className="flex h-96 items-center justify-center"><Spinner className="h-8 w-8" /></div>;
  }

  const studentCount = studentsData?.meta?.total ?? '—';
  const teacherCount = teachersData?.meta?.total ?? '—';
  const subjectCount = Array.isArray(subjectsData?.data) ? subjectsData.data.length : '—';
  const allExams: ExamItem[] = allExamsData?.data || [];
  const activeCount = allExams.filter(e => ['PUBLISHED', 'ONGOING'].includes(e.status)).length;
  const totalExams = allExams.length;

  const statusCounts = allExams.reduce<Record<string, number>>((acc, e) => {
    acc[e.status] = (acc[e.status] || 0) + 1;
    return acc;
  }, {});
  const pieData = Object.entries(statusCounts).map(([name, value]) => ({
    name: statusLabels[name] || name, value, color: statusColors[name] || '#94A3B8',
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">Selamat datang kembali, {user?.full_name || user?.username}. Berikut ikhtisar sistem hari ini.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={<Users className="h-5 w-5" />} title="Total Siswa" value={studentCount} subtitle="Terdaftar aktif" gradient="from-indigo-500 to-indigo-600" />
        <StatCard icon={<GraduationCap className="h-5 w-5" />} title="Total Guru" value={teacherCount} subtitle="Pengajar terdaftar" gradient="from-emerald-500 to-emerald-600" />
        <StatCard icon={<BookOpen className="h-5 w-5" />} title="Mata Pelajaran" value={subjectCount} subtitle="Tersedia di kurikulum" gradient="from-violet-500 to-violet-600" />
        <StatCard icon={<FileText className="h-5 w-5" />} title="Ujian Aktif" value={activeCount} subtitle="Sedang berlangsung" gradient="from-amber-500 to-amber-600" />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-xl border bg-card p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-bold text-slate-900">Status Ujian</h3>
            <span className="text-xs text-muted-foreground">Total: {totalExams} ujian</span>
          </div>
          {pieData.length > 0 ? (
            <div className="flex items-center gap-4">
              <ResponsiveContainer width="60%" height={200}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value">
                    {pieData.map((entry, idx) => (<Cell key={idx} fill={entry.color} />))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2 text-sm">
                {pieData.map((entry) => (
                  <div key={entry.name} className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full" style={{ backgroundColor: entry.color }} />
                    <span className="text-slate-600">{entry.name}</span>
                    <span className="font-semibold text-slate-900 ml-auto">{entry.value}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground py-8 text-center">Belum ada data ujian.</p>
          )}
        </div>

        <div className="lg:col-span-2 rounded-xl border bg-card p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-bold text-slate-900">Daftar Ujian</h3>
            {(user?.role === 'ADMIN' || user?.role === 'TEACHER') && (
              <Link href="/dashboard/exams" className="text-xs font-semibold text-indigo-600 hover:underline flex items-center gap-1">
                Kelola Ujian <ArrowRight className="h-3 w-3" />
              </Link>
            )}
          </div>
          <div className="space-y-2 max-h-[360px] overflow-y-auto">
            {allExams.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">Belum ada ujian.</p>
            ) : (
              allExams.slice(0, 8).map((exam) => (
                <div key={exam.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-slate-50/50 transition">
                  <div className="space-y-0.5 min-w-0">
                    <p className="font-semibold text-slate-900 text-sm truncate">{exam.title}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="font-medium text-indigo-600">{exam.subject?.name}</span>
                      <span>&middot;</span>
                      <span>{exam.duration_minutes} menit</span>
                      <span>&middot;</span>
                      <span>{exam._count?.exam_questions || 0} soal</span>
                    </div>
                  </div>
                  <Badge variant={badgeVariants[exam.status] || 'default'}>{statusLabels[exam.status] || exam.status}</Badge>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="rounded-xl border bg-card p-6 shadow-sm">
        <div className="grid gap-6 md:grid-cols-3">
          {steps.map((step, i) => (
            <div key={i} className="flex gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-sm font-bold text-indigo-600">{i + 1}</div>
              <div>
                <p className="font-semibold text-slate-900 text-sm">{step.title}</p>
                <p className="text-xs text-muted-foreground mt-1">{step.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function DashboardHome() {
  return <ErrorBoundary><DashboardHomeContent /></ErrorBoundary>;
}
