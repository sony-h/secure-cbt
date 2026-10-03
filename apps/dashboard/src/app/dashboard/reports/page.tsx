'use client';

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { examApi, academicApi, reportApi, settingsApi } from '@/lib/api-service';
import { useRoleGuard } from '@/hooks/use-role-guard';
import { ErrorBoundary } from '@/components/ui/error-boundary';
import { UserRole } from '@secure-cbt/shared';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Badge } from '@/components/ui/badge';
import { DataTable } from '@/components/ui/data-table';
import type { ColumnDef } from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { BarChart3, FileText, Download, Printer, FileSpreadsheet } from 'lucide-react';

interface Exam { id: string; title: string; subject?: { name: string }; status: string; _count?: { exam_sessions: number }; }
interface ClassItem { id: string; name: string; major?: { name: string }; }
interface GradeResult {
  session_id: string;
  student: { nis: string; full_name: string; class_name: string };
  total_score: number; correct_count: number; wrong_count: number;
  essay_score: number | null; total_questions: number; status: string;
}

function ReportsPageContent() {
  useRoleGuard([UserRole.ADMIN, UserRole.TEACHER]);
  const [selectedExam, setSelectedExam] = useState<string>('');
  const [selectedClass, setSelectedClass] = useState<string>('');

  const { data: exams } = useQuery({
    queryKey: ['report-exams'],
    queryFn: async () => { const { data } = await examApi.getAll({ per_page: 50 }); return data.data as Exam[]; },
  });

  const { data: classes } = useQuery({
    queryKey: ['report-classes', selectedExam],
    queryFn: async () => {
      if (!selectedExam) return [];
      const { data } = await examApi.getById(selectedExam);
      const exam = data.data;
      if (!exam?.exam_classes) return [];
      const ids = exam.exam_classes.map((ec: any) => ec.class?.id).filter(Boolean);
      const { data: clsData } = await academicApi.getClasses();
      return (clsData.data as ClassItem[]).filter((c) => ids.includes(c.id));
    },
    enabled: !!selectedExam,
  });

  const { data: results, isLoading } = useQuery({
    queryKey: ['results', selectedExam, selectedClass],
    queryFn: async () => {
      if (!selectedExam) return [];
      const params: any = {};
      if (selectedClass) params.class_id = selectedClass;
      const { data } = await reportApi.getExamReport(selectedExam, params);
      const raw = data.data;
      return ((raw?.students || []) as any[]).map((s: any) => ({
        session_id: s.session_id || s.student_id,
        student: { nis: s.nis, full_name: s.student_name, class_name: s.class_name },
        total_score: s.score, correct_count: s.correct_count,
        wrong_count: s.wrong_count, essay_score: s.essay_score ?? null,
        total_questions: s.total_questions ?? 0, status: s.status,
      })) as GradeResult[];
    },
    enabled: !!selectedExam,
  });

  const { data: settings } = useQuery({
    queryKey: ['settings'],
    queryFn: async () => { const { data } = await settingsApi.get(); return data.data; },
  });

  const sortedResults = useMemo(() => results ?? [], [results]);
  const averageScore = results?.length ? (results.reduce((sum, r) => sum + r.total_score, 0) / results.length).toFixed(1) : '0';
  const passedCount = results?.filter((r) => r.status === 'passed').length || 0;

  const reportColumns: ColumnDef<GradeResult>[] = [
    { accessorKey: 'student.nis', header: 'NIS', cell: ({ row }: any) => <span className="font-medium">{row.original.student?.nis}</span> },
    { accessorKey: 'student.full_name', header: 'Nama', enableSorting: true, cell: ({ row }: any) => row.original.student?.full_name },
    { accessorKey: 'student.class_name', header: 'Kelas', cell: ({ row }: any) => row.original.student?.class_name },
    { accessorKey: 'correct_count', header: 'Benar', enableSorting: true, cell: ({ row }: any) => <span className="text-green-600 font-medium">{row.original.correct_count}</span> },
    { accessorKey: 'wrong_count', header: 'Salah', cell: ({ row }: any) => <span className="text-red-600">{row.original.wrong_count}</span> },
    { accessorKey: 'essay_score', header: 'Esai', cell: ({ row }: any) => row.original.essay_score !== null ? row.original.essay_score.toFixed(1) : '—' },
    {
      id: 'unanswered', header: 'Tidak Dijawab',
      cell: ({ row }: any) => <span className="text-muted-foreground">{Math.max(0, row.original.total_questions - row.original.correct_count - row.original.wrong_count)}</span>,
    },
    { accessorKey: 'total_score', header: 'Nilai', enableSorting: true, cell: ({ row }: any) => <span className="font-bold">{row.original.total_score.toFixed(1)}</span> },
    {
      accessorKey: 'status', header: 'Status',
      cell: ({ row }: any) => (
        <Badge variant={row.original.status === 'passed' ? 'success' : 'destructive'}>
          {row.original.status === 'passed' ? 'Lulus' : 'Remedial'}
        </Badge>
      ),
    },
  ];

  const handleExportCSV = () => {
    if (!sortedResults.length) return;
    const headers = ['NIS', 'Nama Siswa', 'Kelas', 'Jawaban Benar', 'Jawaban Salah', 'Nilai Esai', 'Nilai Total', 'Status'];
    const csvRows = [headers.join(',')];
    for (const r of sortedResults) {
      csvRows.push([
        r.student?.nis || '',
        `"${r.student?.full_name?.replace(/"/g, '""') || ''}"`,
        r.student?.class_name || '',
        r.correct_count, r.wrong_count,
        r.essay_score !== null ? r.essay_score.toFixed(1) : '—',
        r.total_score.toFixed(1),
        r.status === 'passed' ? 'Lulus' : 'Remedial',
      ].join(','));
    }
    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    const examTitle = exams?.find((e) => e.id === selectedExam)?.title || 'Laporan_Ujian';
    const className = classes?.find((c) => c.id === selectedClass)?.name || 'Semua_Kelas';
    link.setAttribute('download', `${examTitle.replace(/\s+/g, '_')}_${className.replace(/\s+/g, '_')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 print:p-0 print:space-y-4">
      <div className="hidden print:block border-b-2 border-primary pb-4 mb-4 text-center">
        <h1 className="text-2xl font-bold text-slate-900">LAPORAN HASIL EVALUASI BELAJAR</h1>
        <p className="text-sm text-slate-500 mt-1">SMA/SMK KARTIKA MANDIRI INDONESIA</p>
        <div className="grid grid-cols-2 gap-2 mt-4 text-left text-xs max-w-md mx-auto">
          <div><strong>Ujian:</strong> {exams?.find((e) => e.id === selectedExam)?.title || '—'}</div>
          <div><strong>Kelas:</strong> {classes?.find((c) => c.id === selectedClass)?.name || 'Semua Kelas'}</div>
          <div><strong>Mata Pelajaran:</strong> {exams?.find((e) => e.id === selectedExam)?.subject?.name || '—'}</div>
          <div><strong>Tanggal Cetak:</strong> {new Date().toLocaleDateString('id-ID', { dateStyle: 'long' })}</div>
        </div>
      </div>

      <div className="flex items-center justify-between print:hidden">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Laporan</h1>
          <p className="text-muted-foreground">Lihat hasil ujian dan nilai siswa</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 print:grid-cols-3 print:gap-2">
        <Card className="print:border print:shadow-none">
          <CardContent className="pt-6"><div className="flex items-center gap-3"><FileText className="h-5 w-5 text-muted-foreground print:hidden" /><div><p className="text-xs text-muted-foreground">Total Peserta</p><p className="text-2xl font-bold">{results?.length || 0}</p></div></div></CardContent>
        </Card>
        <Card className="print:border print:shadow-none">
          <CardContent className="pt-6"><div className="flex items-center gap-3"><BarChart3 className="h-5 w-5 text-primary print:hidden" /><div><p className="text-xs text-muted-foreground">Rata-rata Nilai</p><p className="text-2xl font-bold">{averageScore}</p></div></div></CardContent>
        </Card>
        <Card className="print:border print:shadow-none">
          <CardContent className="pt-6"><div className="flex items-center gap-3"><Download className="h-5 w-5 text-green-600 print:hidden" /><div><p className="text-xs text-muted-foreground">Lulus (Kriteria &ge; {settings?.passing_grade ?? 70})</p><p className="text-2xl font-bold text-green-600 print:text-slate-900">{passedCount}</p></div></div></CardContent>
        </Card>
      </div>

      <Card className="print:border-0 print:shadow-none">
        <CardHeader className="print:hidden"><CardTitle>Hasil Ujian</CardTitle><CardDescription>Pilih ujian dan kelas untuk melihat hasil</CardDescription></CardHeader>
        <CardContent>
          <div className="flex items-end gap-3 mb-6 print:hidden">
            <div className="flex-1 space-y-2">
              <Label>Ujian</Label>
              <Select value={selectedExam} onValueChange={(v) => { setSelectedExam(v); setSelectedClass(''); }}>
                <SelectTrigger><SelectValue placeholder="Pilih Ujian" /></SelectTrigger>
                <SelectContent>
                  {exams?.map((e) => (<SelectItem key={e.id} value={e.id}>{e.title} ({e.subject?.name}) - {e._count?.exam_sessions || 0} peserta</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <div className="w-48 space-y-2">
              <Label>Kelas</Label>
              <Select value={selectedClass} onValueChange={setSelectedClass}>
                <SelectTrigger><SelectValue placeholder="Semua Kelas" /></SelectTrigger>
                <SelectContent>
                  {classes?.map((c) => (<SelectItem key={c.id} value={c.id}>{c.name} {c.major?.name ? `- ${c.major.name}` : ''}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" disabled={!results?.length} onClick={handleExportCSV}><FileSpreadsheet className="mr-2 h-4 w-4" />Export CSV</Button>
              <Button variant="outline" disabled={!results?.length} onClick={() => window.print()}><Printer className="mr-2 h-4 w-4" />Cetak PDF</Button>
            </div>
          </div>

          {!selectedExam ? (
            <EmptyState title="Pilih Ujian" description="Pilih ujian untuk melihat hasil" className="py-8 print:hidden" />
          ) : (
            <DataTable columns={reportColumns} data={sortedResults} loading={isLoading} emptyMessage="Belum ada hasil ujian" />
          )}
        </CardContent>
      </Card>

      <div className="hidden print:flex justify-between items-center pt-12 text-sm text-slate-800">
        <div className="text-center">
          <p>Mengetahui,</p><p className="font-semibold mt-1">Kepala Sekolah</p><div className="h-16"></div>
          <p className="underline font-medium">_____________________</p><p className="text-xs text-slate-500">NIP. 19780512 200501 1 002</p>
        </div>
        <div className="text-center">
          <p>Kudus, {new Date().toLocaleDateString('id-ID', { dateStyle: 'long' })}</p>
          <p className="font-semibold mt-1">Guru Mata Pelajaran</p><div className="h-16"></div>
          <p className="underline font-medium">_____________________</p>
          <p className="text-xs text-slate-500">NIP. —</p>
        </div>
      </div>
    </div>
  );
}

export default function ReportsPage() {
  return <ErrorBoundary><ReportsPageContent /></ErrorBoundary>;
}
