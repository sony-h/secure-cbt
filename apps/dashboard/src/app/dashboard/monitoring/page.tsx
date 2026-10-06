'use client';

import { useState, useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { io, Socket } from 'socket.io-client';
import { examApi, monitoringApi } from '@/lib/api-service';
import { useRoleGuard } from '@/hooks/use-role-guard';
import { ErrorBoundary } from '@/components/ui/error-boundary';
import { UserRole } from '@secure-cbt/shared';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Spinner } from '@/components/ui/spinner';
import { Button } from '@/components/ui/button';
import {
  Wifi,
  WifiOff,
  AlertTriangle,
  Users,
  CheckCircle,
  Eye,
  ChevronDown,
  ChevronUp,
  LayoutGrid,
  List,
  Clock,
  ShieldAlert,
  Sparkles,
  Activity,
  History,
  X,
} from 'lucide-react';
import { toast } from 'sonner';

interface Exam {
  id: string;
  title: string;
  status: string;
  duration_minutes: number;
  subject?: { name: string };
}

interface StudentSession {
  id: string;
  student: { nis: string; full_name: string; class?: { name: string } };
  status: string;
  started_at: string;
  warning_count: number;
  remaining_time_seconds: number | null;
  progress?: number;
  student_user_id?: string;
  is_connected?: boolean;
}

interface SessionLog {
  id: string;
  event: string;
  description: string | null;
  created_at: string;
}

function MonitoringPageContent() {
  useRoleGuard([UserRole.ADMIN, UserRole.TEACHER]);
  const queryClient = useQueryClient();

  const [selectedExamId, setSelectedExamId] = useState<string | null>(null);
  const [connectedStudents, setConnectedStudents] = useState<Set<string>>(new Set());
  const [sessionData, setSessionData] = useState<StudentSession[]>([]);
  const [selectedSession, setSelectedSession] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'warning' | 'submitted' | 'disconnected'>('all');
  const socketRef = useRef<Socket | null>(null);

  const { data: exams, isLoading: examsLoading } = useQuery({
    queryKey: ['monitoring-exams'],
    queryFn: async () => {
      const { data } = await examApi.getAll({ per_page: 50 });
      return (data.data as Exam[]).filter((e) =>
        ['PUBLISHED', 'ONGOING'].includes(e.status)
      );
    },
    refetchInterval: 10000,
  });

  // Auto-select first exam if available
  useEffect(() => {
    if (!selectedExamId && exams && exams.length > 0) {
      setSelectedExamId(exams[0]!.id);
    }
  }, [exams, selectedExamId]);

  const { data: monitoringData, isLoading: monitoringLoading } = useQuery({
    queryKey: ['monitoring', selectedExamId],
    queryFn: async () => {
      if (!selectedExamId) return null;
      const { data } = await monitoringApi.getExamSessions(selectedExamId);
      const raw = data.data;
      return {
        ...raw,
        sessions: (raw.students || []).map((s: any) => ({
          id: s.session_id,
          student: { nis: s.nis, full_name: s.student_name, class: { name: s.class_name } },
          status: s.status === 'active' ? 'ACTIVE' : s.status === 'finished' ? 'SUBMITTED' : 'DISCONNECTED',
          started_at: s.last_activity_at,
          warning_count: s.warning_count,
          remaining_time_seconds: null,
          progress: s.progress,
          student_user_id: s.student_user_id,
          is_connected: s.is_connected,
        })),
      };
    },
    enabled: !!selectedExamId,
    refetchInterval: 5000,
  });

  const { data: logs } = useQuery({
    queryKey: ['session-logs', selectedSession],
    queryFn: async () => {
      if (!selectedSession) return [];
      const { data } = await monitoringApi.getSessionLogs(selectedSession);
      return data.data as SessionLog[];
    },
    enabled: !!selectedSession,
  });

  const resolveStudentName = (data: { studentName?: string; studentId?: string; sessionId?: string }) => {
    if (data.studentName && data.studentName.trim() !== '') return data.studentName;
    const bySession = sessionData.find((s) => s.id === data.sessionId);
    if (bySession?.student?.full_name) return bySession.student.full_name;
    const byUser = sessionData.find((s) => s.student_user_id === data.studentId);
    if (byUser?.student?.full_name) return byUser.student.full_name;
    return 'Peserta Ujian';
  };

  // Socket.io Real-Time connection
  useEffect(() => {
    if (!selectedExamId) return;

    const socketUrl =
      process.env.NEXT_PUBLIC_SOCKET_URL ||
      process.env.NEXT_PUBLIC_API_URL ||
      'http://localhost:3000';
    const baseUrl = socketUrl.replace(/\/api\/v1\/?$/, '');

    const socket = io(`${baseUrl}/monitoring`, {
      transports: ['websocket', 'polling'],
      autoConnect: true,
      reconnection: true,
      reconnectionDelay: 1000,
    });

    socket.on('connect', () => {
      socket.emit('teacher.connected', { examId: selectedExamId });
    });

    socket.on('connected.students', (data: { studentUserIds: string[] }) => {
      if (data?.studentUserIds) {
        setConnectedStudents((prev) => {
          const next = new Set(prev);
          data.studentUserIds.forEach((id) => next.add(id));
          return next;
        });
      }
    });

    socket.on('student.connected', (data: { studentId: string; sessionId?: string; studentName?: string }) => {
      const name = resolveStudentName(data);
      setConnectedStudents((prev) => {
        const next = new Set(prev);
        if (data.studentId) next.add(data.studentId);
        if (data.sessionId) next.add(data.sessionId);
        return next;
      });
      toast.info(`Siswa terhubung: ${name}`);
    });

    socket.on('student.disconnected', (data: { studentId: string; sessionId?: string; studentName?: string }) => {
      const name = resolveStudentName(data);
      setConnectedStudents((prev) => {
        const next = new Set(prev);
        if (data.studentId) next.delete(data.studentId);
        if (data.sessionId) next.delete(data.sessionId);
        return next;
      });
      toast.warning(`Siswa terputus: ${name}`);
    });

    socket.on('progress.updated', () => {
      queryClient.invalidateQueries({ queryKey: ['monitoring', selectedExamId] });
    });

    socket.on('exam.submitted', (data: { sessionId: string; studentId: string; studentName?: string }) => {
      const name = resolveStudentName(data);
      setSessionData((prev) => prev.map((s) => s.id === data.sessionId ? { ...s, status: 'SUBMITTED' } : s));
      toast.success(`Siswa selesai: ${name}`);
    });

    socket.on('warning.triggered', (data: { sessionId: string; studentId: string; studentName?: string; count: number }) => {
      const name = resolveStudentName(data);
      setSessionData((prev) => prev.map((s) => s.id === data.sessionId ? { ...s, warning_count: data.count } : s));
      toast.error(`Peringatan #${data.count}: ${name}`);
    });

    socketRef.current = socket;
    return () => { socket.disconnect(); };
  }, [selectedExamId]);

  useEffect(() => {
    if (monitoringData?.sessions) {
      setSessionData(monitoringData.sessions);
      setConnectedStudents((prev) => {
        const next = new Set(prev);
        for (const s of monitoringData.sessions) {
          if (s.is_connected) {
            if (s.student_user_id) next.add(s.student_user_id);
            next.add(s.id);
          }
        }
        return next;
      });
    }
  }, [monitoringData]);

  const totalStudents = sessionData.length;
  const activeCount = sessionData.filter((s) => {
    const isCompleted = s.status === 'SUBMITTED' || s.status === 'AUTO_SUBMITTED';
    if (isCompleted) return false;
    return s.is_connected === true || (s.student_user_id ? connectedStudents.has(s.student_user_id) : false) || connectedStudents.has(s.id);
  }).length;
  const submittedCount = sessionData.filter((s) => s.status === 'SUBMITTED' || s.status === 'AUTO_SUBMITTED').length;
  const warnings = sessionData.filter((s) => s.warning_count > 0).length;

  const currentExam = exams?.find((e) => e.id === selectedExamId);

  // Filter session list/grid
  const filteredSessions = sessionData.filter((session) => {
    const isCompleted = session.status === 'SUBMITTED' || session.status === 'AUTO_SUBMITTED';
    const isConnected = !isCompleted && (
      session.is_connected === true ||
      (session.student_user_id ? connectedStudents.has(session.student_user_id) : false) ||
      connectedStudents.has(session.id)
    );

    switch (statusFilter) {
      case 'active':
        return isConnected;
      case 'warning':
        return session.warning_count > 0;
      case 'submitted':
        return isCompleted;
      case 'disconnected':
        return !isCompleted && !isConnected;
      default:
        return true;
    }
  });

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border/60">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
              Pusat Kendali Pengawasan (Mission Control)
            </h1>
            <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-semibold border border-emerald-500/20">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Live Telemetry
            </span>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            Pantau status integritas ujian siswa, denah meja, dan log peristiwa secara langsung.
          </p>
        </div>

        {/* View Mode & Live Filter Controls */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="inline-flex rounded-xl bg-muted p-1 border border-border">
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                viewMode === 'grid'
                  ? 'bg-card text-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <LayoutGrid className="h-3.5 w-3.5" /> Denah Meja (Grid)
            </button>
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                viewMode === 'list'
                  ? 'bg-card text-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <List className="h-3.5 w-3.5" /> Tabel Rinci (List)
            </button>
          </div>
        </div>
      </div>

      {/* 4 Telemetry Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {monitoringLoading && selectedExamId ? (
          <>
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="rounded-2xl border border-border/70 bg-card p-5">
                <Skeleton className="h-4 w-20 mb-2" />
                <Skeleton className="h-8 w-16" />
              </div>
            ))}
          </>
        ) : (
          <>
            <div className="rounded-2xl border border-border/70 bg-card p-5 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Total Peserta</span>
                <div className="h-9 w-9 rounded-xl bg-indigo-500/10 text-indigo-600 flex items-center justify-center">
                  <Users className="h-4.5 w-4.5" />
                </div>
              </div>
              <p className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground mt-2 tabular-nums">{totalStudents}</p>
              <p className="text-xs text-muted-foreground mt-1">Siswa terdaftar di ujian</p>
            </div>

            <div className="rounded-2xl border border-border/70 bg-card p-5 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Aktif Terhubung</span>
                <div className="h-9 w-9 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                  <Wifi className="h-4.5 w-4.5" />
                </div>
              </div>
              <p className="text-2xl sm:text-3xl font-extrabold tracking-tight text-emerald-600 dark:text-emerald-400 mt-2 tabular-nums">{activeCount}</p>
              <p className="text-xs text-muted-foreground mt-1">Sedang mengerjakan soal</p>
            </div>

            <div className="rounded-2xl border border-border/70 bg-card p-5 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Telah Selesai</span>
                <div className="h-9 w-9 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center">
                  <CheckCircle className="h-4.5 w-4.5" />
                </div>
              </div>
              <p className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground mt-2 tabular-nums">{submittedCount}</p>
              <p className="text-xs text-muted-foreground mt-1">Lembar jawaban terkumpul</p>
            </div>

            <div className={`rounded-2xl border p-5 shadow-xs transition-colors ${warnings > 0 ? 'border-rose-500/40 bg-rose-500/5' : 'border-border/70 bg-card'}`}>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Pelanggaran</span>
                <div className={`h-9 w-9 rounded-xl flex items-center justify-center ${warnings > 0 ? 'bg-rose-500/20 text-rose-600' : 'bg-muted text-muted-foreground'}`}>
                  <AlertTriangle className="h-4.5 w-4.5" />
                </div>
              </div>
              <p className={`text-2xl sm:text-3xl font-extrabold tracking-tight mt-2 tabular-nums ${warnings > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-foreground'}`}>
                {warnings}
              </p>
              <p className="text-xs text-muted-foreground mt-1">Siswa dengan poin strike</p>
            </div>
          </>
        )}
      </div>

      {/* Main Mission Control Workstation Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Exam Rooms Selector (4 cols) */}
        <div className="lg:col-span-4 rounded-2xl border border-border/70 bg-card p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-border/50">
            <h3 className="text-sm font-bold text-foreground">Ruang Ujian Tersedia</h3>
            <span className="text-xs text-muted-foreground">{exams?.length || 0} Ujian</span>
          </div>

          <div className="space-y-2 max-h-[560px] overflow-y-auto pr-1">
            {examsLoading ? (
              <div className="py-8 text-center"><Spinner className="mx-auto h-6 w-6 text-primary" /></div>
            ) : exams?.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-6">Tidak ada ujian yang sedang berlangsung.</p>
            ) : (
              exams?.map((exam) => {
                const isSelected = exam.id === selectedExamId;
                return (
                  <button
                    key={exam.id}
                    type="button"
                    onClick={() => {
                      setSelectedExamId(exam.id);
                      setSelectedSession(null);
                    }}
                    className={`w-full text-left p-3.5 rounded-xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'border-primary bg-primary/5 shadow-xs ring-1 ring-primary/30'
                        : 'border-border/80 bg-background hover:bg-muted/50 hover:border-border'
                    }`}
                  >
                    <p className={`text-sm font-bold line-clamp-1 ${isSelected ? 'text-primary' : 'text-foreground'}`}>
                      {exam.title}
                    </p>
                    <div className="flex items-center gap-2 mt-2 text-xs">
                      <span className="font-semibold text-primary/90 bg-primary/10 px-2 py-0.5 rounded">
                        {exam.subject?.name || 'Umum'}
                      </span>
                      <span className="text-muted-foreground">•</span>
                      <span className="text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" /> {exam.duration_minutes}m
                      </span>
                      <span className="ml-auto">
                        <Badge variant={exam.status === 'ONGOING' ? 'success' : 'default'} className="text-[10px] px-1.5 py-0">
                          {exam.status === 'ONGOING' ? 'Aktif' : 'Terbit'}
                        </Badge>
                      </span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Students Telemetry Monitoring (8 cols) */}
        <div className="lg:col-span-8 rounded-2xl border border-border/70 bg-card p-5 shadow-xs space-y-4">
          {/* Header & Filter Pills */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border/50">
            <div>
              <h2 className="text-base font-bold text-foreground">
                {currentExam ? currentExam.title : 'Pilih ruang ujian untuk memantau'}
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                {filteredSessions.length} dari {sessionData.length} siswa ditampilkan
              </p>
            </div>

            {/* Quick Status Filter Tabs */}
            <div className="flex flex-wrap items-center gap-1.5">
              {[
                { id: 'all', label: 'Semua' },
                { id: 'active', label: 'Aktif' },
                { id: 'warning', label: 'Peringatan' },
                { id: 'submitted', label: 'Selesai' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setStatusFilter(tab.id as any)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                    statusFilter === tab.id
                      ? 'bg-primary text-primary-foreground shadow-2xs'
                      : 'bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {!selectedExamId ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <Eye className="h-10 w-10 mb-2 text-muted-foreground/50" />
              <p className="text-sm">Pilih ruang ujian di panel kiri untuk mulai memantau.</p>
            </div>
          ) : monitoringLoading ? (
            <div className="flex h-56 items-center justify-center"><Spinner className="h-8 w-8 text-primary" /></div>
          ) : filteredSessions.length === 0 ? (
            <div className="py-16 text-center">
              <EmptyState title="Belum Ada Peserta" description="Tidak ada peserta yang cocok dengan filter yang dipilih." />
            </div>
          ) : viewMode === 'grid' ? (
            /* ── SEATING GRID VIEW (Bento Workstations) ───────────────── */
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5 max-h-[500px] overflow-y-auto pr-1">
              {filteredSessions.map((session) => {
                const isCompleted = session.status === 'SUBMITTED' || session.status === 'AUTO_SUBMITTED';
                const isConnected = !isCompleted && (
                  session.is_connected === true ||
                  (session.student_user_id ? connectedStudents.has(session.student_user_id) : false) ||
                  connectedStudents.has(session.id)
                );
                const hasWarning = session.warning_count > 0;
                const progressPct = Math.round((session.progress ?? 0) * 100);

                return (
                  <div
                    key={session.id}
                    onClick={() => setSelectedSession(session.id === selectedSession ? null : session.id)}
                    className={`relative p-3.5 rounded-2xl border transition-all cursor-pointer shadow-2xs flex flex-col justify-between gap-3 ${
                      hasWarning
                        ? 'border-rose-500/50 bg-rose-500/5 hover:border-rose-500'
                        : isCompleted
                        ? 'border-blue-500/30 bg-blue-500/5 hover:border-blue-500/60'
                        : isConnected
                        ? 'border-emerald-500/40 bg-card hover:border-emerald-500 hover:shadow-xs'
                        : 'border-border/80 bg-muted/20 hover:border-border'
                    } ${selectedSession === session.id ? 'ring-2 ring-primary' : ''}`}
                  >
                    {/* Top Row: Status badge & Signal */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        {isCompleted ? (
                          <span className="flex items-center gap-1 text-[11px] font-bold text-blue-600 bg-blue-500/10 px-2 py-0.5 rounded-md">
                            <CheckCircle className="h-3 w-3" /> Selesai
                          </span>
                        ) : isConnected ? (
                          <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded-md">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" /> Live
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-[11px] font-semibold text-muted-foreground bg-muted px-2 py-0.5 rounded-md">
                            <WifiOff className="h-3 w-3" /> Offline
                          </span>
                        )}
                      </div>

                      {hasWarning && (
                        <span className="flex items-center gap-1 text-[11px] font-extrabold text-rose-600 bg-rose-500/15 border border-rose-500/30 px-2 py-0.5 rounded-md animate-bounce">
                          <AlertTriangle className="h-3 w-3" /> #{session.warning_count}
                        </span>
                      )}
                    </div>

                    {/* Middle: Student Information */}
                    <div>
                      <p className="text-sm font-bold text-foreground truncate" title={session.student?.full_name}>
                        {session.student?.full_name || 'Tanpa Nama'}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">
                        {session.student?.nis} • {session.student?.class?.name || 'Kelas'}
                      </p>
                    </div>

                    {/* Bottom: Progress Bar */}
                    <div className="space-y-1 pt-1 border-t border-border/40">
                      <div className="flex justify-between text-[11px] font-semibold text-muted-foreground tabular-nums">
                        <span>Pengerjaan</span>
                        <span className="text-foreground">{progressPct}%</span>
                      </div>
                      <Progress value={progressPct} className="h-1.5" />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* ── DETAILED TABLE LIST VIEW ─────────────────────────────── */
            <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-1">
              {filteredSessions.map((session) => {
                const isCompleted = session.status === 'SUBMITTED' || session.status === 'AUTO_SUBMITTED';
                const isConnected = !isCompleted && (
                  session.is_connected === true ||
                  (session.student_user_id ? connectedStudents.has(session.student_user_id) : false) ||
                  connectedStudents.has(session.id)
                );
                const isExpanded = session.id === selectedSession;

                return (
                  <div
                    key={session.id}
                    onClick={() => setSelectedSession(session.id === selectedSession ? null : session.id)}
                    className={`p-3.5 border rounded-xl cursor-pointer transition-all ${
                      isExpanded ? 'border-primary bg-primary/5 shadow-xs' : 'border-border/80 bg-card hover:bg-muted/40'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        {isCompleted ? (
                          <div className="h-8 w-8 rounded-lg bg-blue-500/10 text-blue-600 flex items-center justify-center shrink-0">
                            <CheckCircle className="h-4 w-4" />
                          </div>
                        ) : isConnected ? (
                          <div className="h-8 w-8 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
                            <Wifi className="h-4 w-4" />
                          </div>
                        ) : (
                          <div className="h-8 w-8 rounded-lg bg-muted text-muted-foreground flex items-center justify-center shrink-0">
                            <WifiOff className="h-4 w-4" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-foreground truncate">{session.student?.full_name}</p>
                          <p className="text-xs text-muted-foreground">{session.student?.nis} &middot; {session.student?.class?.name}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {session.warning_count > 0 && (
                          <Badge variant="destructive" className="gap-1 text-xs">
                            <AlertTriangle className="h-3 w-3" /> {session.warning_count}
                          </Badge>
                        )}
                        <Badge variant={isCompleted ? 'default' : isConnected ? 'success' : 'warning'}>
                          {isCompleted ? 'Selesai' : isConnected ? 'Aktif' : 'Terputus'}
                        </Badge>
                        {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                      </div>
                    </div>

                    {session.progress !== undefined && (
                      <div className="mt-2.5 space-y-1">
                        <Progress value={Math.min((session.progress ?? 0) * 100, 100)} className="h-1.5" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Expanded Selected Session Logs Drawer */}
          {selectedSession && (
            <div className="mt-4 p-4 rounded-xl border border-primary/30 bg-primary/5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-primary flex items-center gap-1.5 uppercase tracking-wider">
                  <Activity className="h-4 w-4" /> Log Aktivitas Peserta Realtime
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedSession(null)}
                  className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
                >
                  <X className="h-3.5 w-3.5 mr-1" /> Tutup Log
                </Button>
              </div>

              {logs && logs.length > 0 ? (
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {logs.map((log) => {
                    const isWarning = log.event.includes('WARNING') || log.event.includes('STATUS_BAR') || log.event.includes('SPLIT');
                    return (
                      <div
                        key={log.id}
                        className="flex items-start gap-2.5 p-2 rounded-lg bg-background border border-border/60 text-xs"
                      >
                        <span className={`mt-0.5 h-2 w-2 rounded-full shrink-0 ${isWarning ? 'bg-rose-500' : 'bg-emerald-500'}`} />
                        <div className="flex-1">
                          <p className="font-semibold text-foreground">{log.description || log.event}</p>
                          <p className="text-[10px] text-muted-foreground mt-0.5">
                            {new Intl.DateTimeFormat('id-ID', {
                              hour: '2-digit',
                              minute: '2-digit',
                              second: '2-digit',
                              timeZone: 'Asia/Jakarta',
                            }).format(new Date(log.created_at))} WIB
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground italic py-2">Belum ada catatan pelanggaran atau log aktivitas pada sesi ini.</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function MonitoringPage() {
  return (
    <ErrorBoundary>
      <MonitoringPageContent />
    </ErrorBoundary>
  );
}
