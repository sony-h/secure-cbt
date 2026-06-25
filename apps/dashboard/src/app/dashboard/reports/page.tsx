'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth.store';
import { UserRole } from '@secure-cbt/shared';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, Badge, Spinner } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { BarChart3, Download, FileText } from 'lucide-react';

interface Exam {
  id: string;
  title: string;
  subject?: { name: string };
  status: string;
  _count?: { exam_sessions: number };
}

interface GradeResult {
  session_id: string;
  student: { nis: string; full_name: string; class_name: string };
  total_score: number;
  correct_count: number;
  wrong_count: number;
  status: string;
}

export default function ReportsPage() {
  const router = useRouter();
  const { user } = useAuthStore();

  useEffect(() => {
    if (user && ![UserRole.ADMIN, UserRole.TEACHER].includes(user.role)) {
      router.replace('/dashboard');
    }
  }, [user, router]);

  const [selectedExam, setSelectedExam] = useState<string>('');

  const { data: exams } = useQuery({
    queryKey: ['report-exams'],
    queryFn: async () => {
      const { data } = await api.get('/exams', { params: { per_page: 50 } });
      return data.data as Exam[];
    },
  });

  const { data: results, isLoading } = useQuery({
    queryKey: ['results', selectedExam],
    queryFn: async () => {
      if (!selectedExam) return [];
      const { data } = await api.get(`/reports/exam/${selectedExam}`);
      const raw = data.data;
      return ((raw?.students || []) as any[]).map((s: any) => ({
        session_id: s.student_id,
        student: { nis: s.nis, full_name: s.student_name, class_name: s.class_name },
        total_score: s.score,
        correct_count: s.correct_count,
        wrong_count: s.wrong_count,
        status: s.status,
      })) as GradeResult[];
    },
    enabled: !!selectedExam,
  });

  const averageScore = results?.length
    ? (results.reduce((sum, r) => sum + r.total_score, 0) / results.length).toFixed(1)
    : '0';

  const passedCount = results?.filter((r) => r.total_score >= 60).length || 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Laporan</h1>
          <p className="text-muted-foreground">Lihat hasil ujian dan nilai siswa</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <FileText className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Total Peserta</p>
                <p className="text-2xl font-bold">{results?.length || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <BarChart3 className="h-5 w-5 text-primary" />
              <div>
                <p className="text-xs text-muted-foreground">Rata-rata Nilai</p>
                <p className="text-2xl font-bold">{averageScore}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Download className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-xs text-muted-foreground">Lulus (≥60)</p>
                <p className="text-2xl font-bold">{passedCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Hasil Ujian</CardTitle>
          <CardDescription>Pilih ujian untuk melihat hasil</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-3 mb-6">
            <div className="flex-1 space-y-2">
              <Label>Ujian</Label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={selectedExam}
                onChange={(e) => setSelectedExam(e.target.value)}
              >
                <option value="">Pilih Ujian</option>
                {exams?.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.title} ({e.subject?.name}) - {e._count?.exam_sessions || 0} peserta
                  </option>
                ))}
              </select>
            </div>
            <Button variant="outline" disabled={!results?.length}>
              <Download className="mr-2 h-4 w-4" />
              Export CSV
            </Button>
          </div>

          {isLoading ? (
            <div className="flex h-48 items-center justify-center"><Spinner className="h-8 w-8" /></div>
          ) : !selectedExam ? (
            <p className="text-center text-muted-foreground py-8">Pilih ujian untuk melihat hasil</p>
          ) : results?.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">Belum ada hasil ujian</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>NIS</TableHead>
                  <TableHead>Nama</TableHead>
                  <TableHead>Benar</TableHead>
                  <TableHead>Salah</TableHead>
                  <TableHead>Nilai</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {results?.map((r) => (
                  <TableRow key={r.session_id}>
                    <TableCell className="font-medium">{r.student?.nis}</TableCell>
                    <TableCell>{r.student?.full_name}</TableCell>
                    <TableCell className="text-green-600 font-medium">{r.correct_count}</TableCell>
                    <TableCell className="text-red-600">{r.wrong_count}</TableCell>
                    <TableCell className="font-bold">{r.total_score.toFixed(1)}</TableCell>
                    <TableCell>
                      <Badge variant={r.total_score >= 60 ? 'success' : 'destructive'}>
                        {r.total_score >= 60 ? 'Lulus' : 'Remedial'}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
