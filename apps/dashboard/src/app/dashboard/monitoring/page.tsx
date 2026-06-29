'use client';

import { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { io, Socket } from 'socket.io-client';
import { examApi, monitoringApi } from '@/lib/api-service';
import { useRoleGuard } from '@/hooks/use-role-guard';
import { ErrorBoundary } from '@/components/ui/error-boundary';
import { UserRole } from '@secure-cbt/shared';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
}

interface SessionLog {
  id: string;
  event: string;
  description: string | null;
  created_at: string;
}

function MonitoringPageContent() {
  useRoleGuard([UserRole.ADMIN, UserRole.TEACHER]);

  const [selectedExamId, setSelectedExamId] = useState<string | null>(null);
  const [connectedStudents, setConnectedStudents] = useState<Set<string>>(new Set());
  const [sessionData, setSessionData] = useState<StudentSession[]>([]);
  const [selectedSession, setSelectedSession] = useState<string | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const studentNameMap = useRef<Map<string, { name: string; sessionId: string }>>(new Map());

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
        })),
      };
    },
    enabled: !!selectedExamId,
    refetchInterval: 5000,
  });

  useEffect(() => {
    const map = new Map<string, { name: string; sessionId: string }>();
    for (const s of sessionData) {
      const userId = (s as any).student_user_id;
      if (userId) map.set(userId, { name: s.student.full_name, sessionId: s.id });
      map.set(s.id, { name: s.student.full_name, sessionId: s.id });
    }
    studentNameMap.current = map;
  }, [sessionData]);

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

  function resolveName(data: any): string {
    if (data.studentName) return data.studentName;
    const entry = studentNameMap.current.get(data.studentId);
    if (entry) return entry.name;
    if (data.sessionId) {
      const sess = sessionData.find((s) => s.id === data.sessionId);
      if (sess) return sess.student.full_name;
    }
    return data.studentId || 'Unknown';
  }

  useEffect(() => {
    if (!selectedExamId) return;

    const token = localStorage.getItem('access_token');
    const SOCKET_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000').replace('/api/v1', '');
    const socket = io(`${SOCKET_URL}/monitoring`, {
      auth: { token },
      query: { role: 'teacher', examId: selectedExamId },
      transports: ['websocket'],
    });

    socket.on('student.connected', (data: { studentId: string; studentName?: string; sessionId?: string }) => {
      const name = resolveName(data);
      setConnectedStudents((prev) => new Set(prev).add(data.studentId));
      toast.info(`Siswa terhubung: ${name}`);
    });

    socket.on('student.disconnected', (data: { studentId: string }) => {
      const name = resolveName(data);
      setConnectedStudents((prev) => {
        const next = new Set(prev); next.delete(data.studentId); return next;
      });
      toast.warning(`Siswa terputus: ${name}`);
    });

    socket.on('exam.submitted', (data: { sessionId: string; studentId: string; studentName?: string }) => {
      const name = resolveName(data);
      setSessionData((prev) => prev.map((s) => s.id === data.sessionId ? { ...s, status: 'SUBMITTED' } : s));
      toast.success(`Siswa selesai: ${name}`);
    });

    socket.on('warning.triggered', (data: { sessionId: string; studentId: string; studentName?: string; count: number }) => {
      const name = resolveName(data);
      setSessionData((prev) => prev.map((s) => s.id === data.sessionId ? { ...s, warning_count: data.count } : s));
      toast.error(`Peringatan #${data.count}: ${name}`);
    });

    socketRef.current = socket;
    return () => { socket.disconnect(); };
  }, [selectedExamId]);

  useEffect(() => {
    if (monitoringData?.sessions) setSessionData(monitoringData.sessions);
  }, [monitoringData]);

  const totalStudents = sessionData.length;
  const activeCount = sessionData.filter((s) => s.status === 'ACTIVE').length;
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
        <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><Users className="h-5 w-5 text-muted-foreground" /><div><p className="text-xs text-muted-foreground">Total Peserta</p><p className="text-2xl font-bold">{totalStudents}</p></div></div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><Wifi className="h-5 w-5 text-green-600" /><div><p className="text-xs text-muted-foreground">Aktif</p><p className="text-2xl font-bold">{activeCount}</p></div></div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><CheckCircle className="h-5 w-5 text-primary" /><div><p className="text-xs text-muted-foreground">Selesai</p><p className="text-2xl font-bold">{submittedCount}</p></div></div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><AlertTriangle className="h-5 w-5 text-destructive" /><div><p className="text-xs text-muted-foreground">Peringatan</p><p className="text-2xl font-bold">{warnings}</p></div></div></CardContent></Card>
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
                  const isConnected = connectedStudents.has(session.id);
                  const isExpanded = session.id === selectedSession;
                  return (
                    <div
                      key={session.id}
                      onClick={() => setSelectedSession(session.id === selectedSession ? null : session.id)}
                      className={`p-3 border rounded-md cursor-pointer transition hover:bg-muted ${isExpanded ? 'border-primary bg-primary/5' : ''}`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {isConnected ? <Wifi className="h-4 w-4 text-green-600" /> : <WifiOff className="h-4 w-4 text-destructive" />}
                          <div>
                            <p className="text-sm font-medium">{session.student?.full_name || 'Unknown'}</p>
                            <p className="text-xs text-muted-foreground">{session.student?.nis} &middot; {session.student?.class?.name}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-2 mr-1">
                            {session.status === 'ACTIVE' ? <Badge variant="success">Aktif</Badge> : session.status === 'SUBMITTED' ? <Badge variant="default">Selesai</Badge> : <Badge variant="warning">{session.status}</Badge>}
                            {session.warning_count > 0 && (
                              <Badge variant="destructive" className="gap-1"><AlertTriangle className="h-3 w-3" />{session.warning_count}</Badge>
                            )}
                          </div>
                          {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" /> : <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />}
                        </div>
                      </div>
                      {session.progress !== undefined && (
                        <div className="mt-2 h-1.5 bg-muted rounded-full overflow-hidden">
                          <div className="h-full bg-primary transition-all" style={{ width: `${Math.min((session.progress ?? 0) * 100, 100)}%` }} />
                        </div>
                      )}
                      {isExpanded && (
                        <div className="mt-3 pt-3 border-t">
                          <p className="text-xs font-medium mb-2">Log Aktivitas</p>
                          {logs && logs.length > 0 ? (
                            <div className="space-y-1 max-h-32 overflow-y-auto">
                              {logs.map((log) => (
                                <div key={log.id} className="flex items-center gap-2 text-xs">
                                  <span className="text-muted-foreground w-20 shrink-0">
                                    {new Intl.DateTimeFormat('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' }).format(new Date(log.created_at))}
                                  </span>
                                  <span>{log.description || log.event}</span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-xs text-muted-foreground">Belum ada aktivitas</p>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
                {sessionData.length === 0 && <p className="text-center text-muted-foreground py-8">Belum ada peserta yang memulai ujian</p>}
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
