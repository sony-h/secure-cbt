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
import { Wifi, WifiOff, AlertTriangle, Users, CheckCircle, Eye, ChevronDown, ChevronUp } from 'lucide-react';
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
          remaining_time_seconds: s.remaining_time_seconds,
          progress: s.progress?.total > 0 ? s.progress.answered / s.progress.total : 0,
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
    refetchInterval: 3000,
  });

  function resolveStudentName(data: { studentName?: string; studentId?: string; sessionId?: string }): string {
    if (data.studentName) return data.studentName;
    if (data.sessionId) {
      const sess = sessionData.find((s) => s.id === data.sessionId);
      if (sess) return sess.student.full_name;
    }
    if (data.studentId) {
      const sess = sessionData.find((s) => s.student_user_id === data.studentId || s.id === data.studentId);
      if (sess) return sess.student.full_name;
    }
    return data.studentId || 'Unknown';
  }

  useEffect(() => {
    if (!selectedExamId) return;

    const token = localStorage.getItem('access_token');
    const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000').replace('/api/v1', '');
    const socket = io(`${SOCKET_URL}/monitoring`, {
      auth: { token },
      query: { role: 'teacher', examId: selectedExamId },
      transports: ['websocket'],
    });

    socket.on('connected.students', (data: { examId: string; studentIds: string[] }) => {
      if (data.studentIds && Array.isArray(data.studentIds)) {
        setConnectedStudents((prev) => {
          const next = new Set(prev);
          data.studentIds.forEach((id) => next.add(id));
          return next;
        });
      }
    });

    socket.on('student.connected', (data: { studentId: string; studentName?: string; sessionId?: string }) => {
      const name = resolveStudentName(data);
      setConnectedStudents((prev) => {
        const next = new Set(prev);
        if (data.studentId) next.add(data.studentId);
        if (data.sessionId) next.add(data.sessionId);
        return next;
      });
      toast.info(`Siswa terhubung: ${name}`);
    });

    socket.on('student.disconnected', (data: { studentId: string; sessionId?: string }) => {
      const name = resolveStudentName({ studentId: data.studentId });
      setConnectedStudents((prev) => {
        const next = new Set(prev);
        if (data.studentId) next.delete(data.studentId);
        if (data.sessionId) next.delete(data.sessionId);
        return next;
      });
      toast.warning(`Siswa terputus: ${name}`);
    });

    socket.on('progress.updated', (data: { sessionId: string; questionId?: string }) => {
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Monitoring</h1>
          <p className="text-muted-foreground">Pantau ujian yang sedang berlangsung secara real-time</p>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {monitoringLoading && selectedExamId ? (
          <>
            {Array.from({ length: 4 }).map((_, i) => (
              <Card key={i}><CardContent className="pt-6"><Skeleton className="h-5 w-24 mb-2" /><Skeleton className="h-8 w-12" /></CardContent></Card>
            ))}
          </>
        ) : (
          <>
            <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><Users className="h-5 w-5 text-muted-foreground" /><div><p className="text-xs text-muted-foreground">Total Peserta</p><p className="text-2xl font-bold">{totalStudents}</p></div></div></CardContent></Card>
            <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><Wifi className="h-5 w-5 text-green-600" /><div><p className="text-xs text-muted-foreground">Aktif Terhubung</p><p className="text-2xl font-bold">{activeCount}</p></div></div></CardContent></Card>
            <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><CheckCircle className="h-5 w-5 text-primary" /><div><p className="text-xs text-muted-foreground">Selesai</p><p className="text-2xl font-bold">{submittedCount}</p></div></div></CardContent></Card>
            <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><AlertTriangle className="h-5 w-5 text-destructive" /><div><p className="text-xs text-muted-foreground">Peringatan</p><p className="text-2xl font-bold">{warnings}</p></div></div></CardContent></Card>
          </>
        )}
      </div>

      <div className="flex gap-4">
        <Card className="w-72 shrink-0">
          <CardHeader><CardTitle className="text-base">Ujian Aktif</CardTitle></CardHeader>
          <CardContent className="space-y-2 max-h-[500px] overflow-y-auto">
            {examsLoading ? (
              <Spinner className="mx-auto h-6 w-6" />
            ) : exams?.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Tidak ada ujian aktif</p>
            ) : (
              exams?.map((exam) => (
                <button
                  key={exam.id}
                  onClick={() => setSelectedExamId(exam.id === selectedExamId ? null : exam.id)}
                  className={`w-full text-left p-3 rounded-md border transition hover:bg-muted ${exam.id === selectedExamId ? 'border-primary bg-primary/5' : ''}`}
                >
                  <p className="text-sm font-medium line-clamp-1">{exam.title}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant={exam.status === 'ONGOING' ? 'success' : 'default'} className="text-xs">
                      {exam.status === 'ONGOING' ? 'Berlangsung' : 'Terbit'}
                    </Badge>
                    <span className="text-xs text-muted-foreground">{exam.subject?.name}</span>
                  </div>
                </button>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="flex-1">
          <CardHeader>
            <CardTitle>
              {selectedExamId ? `Peserta: ${exams?.find((e) => e.id === selectedExamId)?.title || '...'}` : 'Pilih ujian untuk memantau'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!selectedExamId ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Eye className="h-12 w-12 mb-3" />
                <p>Pilih ujian di panel sebelah kiri untuk mulai memantau</p>
              </div>
            ) : monitoringLoading ? (
              <div className="flex h-48 items-center justify-center"><Spinner className="h-8 w-8" /></div>
            ) : (
              <div className="space-y-3 max-h-[400px] overflow-y-auto">
                {sessionData.map((session) => {
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
                      className={`p-3 border rounded-md cursor-pointer transition hover:bg-muted ${isExpanded ? 'border-primary bg-primary/5' : ''}`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {isCompleted ? (
                            <CheckCircle className="h-4 w-4 text-primary shrink-0" />
                          ) : isConnected ? (
                            <Wifi className="h-4 w-4 text-green-600 shrink-0" />
                          ) : (
                            <WifiOff className="h-4 w-4 text-amber-500 shrink-0" />
                          )}
                          <div>
                            <p className="text-sm font-medium">{session.student?.full_name || 'Unknown'}</p>
                            <p className="text-xs text-muted-foreground">{session.student?.nis} &middot; {session.student?.class?.name}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-2 mr-1">
                            {session.status === 'ACTIVE' ? (
                              <Badge variant={isConnected ? 'success' : 'warning'}>
                                {isConnected ? 'Aktif' : 'Terputus'}
                              </Badge>
                            ) : session.status === 'SUBMITTED' ? (
                              <Badge variant="default">Selesai</Badge>
                            ) : (
                              <Badge variant="warning">{session.status}</Badge>
                            )}
                            {session.warning_count > 0 && (
                              <Badge variant="destructive" className="gap-1"><AlertTriangle className="h-3 w-3" />{session.warning_count}</Badge>
                            )}
                          </div>
                          {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" /> : <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />}
                        </div>
                      </div>
                      {session.progress !== undefined && (
                        <Progress value={Math.min((session.progress ?? 0) * 100, 100)} className="mt-2 h-1.5" />
                      )}
                      {isExpanded && (
                        <div className="mt-3 pt-3 border-t">
                          <p className="text-xs font-medium mb-2">Log Aktivitas</p>
                          {logs && logs.length > 0 ? (
                            <div className="space-y-0 max-h-32 overflow-y-auto">
                              {logs.map((log, i) => {
                                const dotColor = log.event === 'WARNING'
                                  ? 'bg-red-500'
                                  : log.event === 'SUBMITTED' || log.event === 'CONNECTED'
                                    ? 'bg-green-500'
                                    : 'bg-blue-500';
                                return (
                                  <div key={log.id} className="flex gap-3">
                                    <div className="flex flex-col items-center">
                                      <div className={`h-2 w-2 rounded-full ${dotColor}`} />
                                      {i < logs.length - 1 && <div className="flex-1 w-px bg-border" />}
                                    </div>
                                    <div className="pb-3">
                                      <p className="text-sm">{log.description || log.event}</p>
                                      <p className="text-xs text-muted-foreground">
                                        {new Intl.DateTimeFormat('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' }).format(new Date(log.created_at))}
                                      </p>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <p className="text-xs text-muted-foreground">Belum ada aktivitas</p>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
                {sessionData.length === 0 && <EmptyState title="Belum ada peserta" description="Belum ada peserta yang memulai ujian" className="py-8" />}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function MonitoringPage() {
  return <ErrorBoundary><MonitoringPageContent /></ErrorBoundary>;
}
