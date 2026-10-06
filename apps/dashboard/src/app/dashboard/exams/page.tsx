'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { academicApi, questionBankApi, examApi } from '@/lib/api-service';
import { ErrorBoundary } from '@/components/ui/error-boundary';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DataTable } from '@/components/ui/data-table';
import type { ColumnDef } from '@tanstack/react-table';
import { formatDate } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader,
  AlertDialogTitle, AlertDialogDescription, AlertDialogFooter,
  AlertDialogAction, AlertDialogCancel,
} from '@/components/ui/alert-dialog';
import { Plus, Pencil, Trash2, Key, Clock, Calendar, Copy, Check, FileCheck, Layers } from 'lucide-react';
import { toast } from 'sonner';
import { CreateExamModal, emptyExamForm, type ExamFormData } from '@/components/exams/create-exam-modal';
import { TokenModal } from '@/components/exams/token-modal';

interface Exam {
  id: string;
  title: string;
  description: string | null;
  subject?: { id: string; name: string; code: string };
  duration_minutes: number;
  status: string;
  start_at: string;
  end_at: string;
  randomize_questions: boolean;
  randomize_answers: boolean;
  warning_limit: number;
  auto_submit_enabled: boolean;
  fullscreen_required: boolean;
  package_count: number;
  created_at: string;
  classes?: { class: { id: string; name: string } }[];
  exam_token?: { token: string; expires_at: string } | null;
  _count?: { exam_sessions: number; exam_questions: number };
}

interface Subject { id: string; name: string; code: string; }
interface Class { id: string; name: string; major?: { name: string }; }
interface Question { id: string; content: string; type: string; difficulty: string; question_bank: { id: string; title: string; subject: { name: string } }; }
interface QuestionBank { id: string; title: string; subject: { name: string }; _count: { questions: number }; }

const statusColors: Record<string, 'default' | 'success' | 'warning' | 'destructive'> = {
  DRAFT: 'warning', PUBLISHED: 'success', ONGOING: 'default', FINISHED: 'default', CANCELLED: 'destructive',
};

const statusLabels: Record<string, string> = {
  DRAFT: 'Draft', PUBLISHED: 'Dipublikasi', ONGOING: 'Berlangsung', FINISHED: 'Selesai', CANCELLED: 'Dibatalkan',
};

function ExamsPageContent() {
  const queryClient = useQueryClient();

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ExamFormData>(emptyExamForm);
  const [bankFilter, setBankFilter] = useState('');
  const [token, setToken] = useState<string | null>(null);

  const { data: subjects } = useQuery({
    queryKey: ['subjects'],
    queryFn: async () => { const { data } = await academicApi.getSubjects(); return data.data as Subject[]; },
  });

  const { data: classes } = useQuery({
    queryKey: ['classes'],
    queryFn: async () => { const { data } = await academicApi.getClasses(); return data.data as Class[]; },
  });

  const { data: banks } = useQuery({
    queryKey: ['question-banks'],
    queryFn: async () => { const { data } = await questionBankApi.getBanks(); return data.data as QuestionBank[]; },
  });

  const { data: questions } = useQuery({
    queryKey: ['all-questions'],
    queryFn: async () => {
      const { data } = await questionBankApi.getQuestions({ per_page: 500 });
      return data.data as Question[];
    },
  });

  const { data: exams, isLoading } = useQuery({
    queryKey: ['exams'],
    queryFn: async () => { const { data } = await examApi.getAll({ per_page: 200 }); return data.data as Exam[]; },
  });

  const saveMutation = useMutation({
    mutationFn: (dto: any) => editingId ? examApi.update(editingId, dto) : examApi.create(dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exams'] });
      toast.success(editingId ? 'Ujian diperbarui' : 'Ujian berhasil dibuat');
      setModalOpen(false); setEditingId(null); setForm(emptyExamForm);
    },
    onError: () => toast.error('Gagal menyimpan ujian'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => examApi.delete(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['exams'] }); toast.success('Ujian dihapus'); },
    onError: () => toast.error('Gagal menghapus ujian'),
  });

  const tokenMutation = useMutation({
    mutationFn: (id: string) => examApi.generateToken(id),
    onSuccess: (res) => { setToken(res.data.data.token); toast.success('Token berhasil dibuat'); },
    onError: () => toast.error('Gagal membuat token'),
  });

  const handleSave = () => {
    if (!form.title.trim()) { toast.error('Judul ujian harus diisi'); return; }
    if (!form.subject_id) { toast.error('Pilih mata pelajaran'); return; }
    if (!form.start_at || !form.end_at) { toast.error('Tentukan waktu mulai dan selesai'); return; }
    if (form.class_ids.length === 0) { toast.error('Pilih minimal satu kelas'); return; }
    if (form.question_ids.length === 0) { toast.error('Pilih minimal satu soal'); return; }

    const wibToUTC = (wib: string) => new Date(wib + '+07:00').toISOString();
    const dto = { ...form, start_at: wibToUTC(form.start_at), end_at: wibToUTC(form.end_at) };
    saveMutation.mutate(dto);
  };

  const handleEdit = async (exam: Exam) => {
    setEditingId(exam.id);
    const toWIB = (iso: string) => {
      if (!iso) return '';
      const d = new Date(iso);
      d.setTime(d.getTime() + 7 * 60 * 60 * 1000);
      return d.toISOString().slice(0, 16);
    };

    try {
      const res = await examApi.getById(exam.id);
      const full = res.data.data;
      setForm({
        title: full.title, description: full.description || '',
        subject_id: full.subject?.id || '', duration_minutes: full.duration_minutes,
        start_at: toWIB(full.start_at), end_at: toWIB(full.end_at),
        class_ids: full.exam_classes?.map((ec: any) => ec.class?.id ?? ec.class_id).filter(Boolean) || [],
        question_ids: full.exam_questions?.map((eq: any) => eq.question_id) || [],
        package_count: full.package_count || 1, randomize_questions: full.randomize_questions,
        randomize_answers: full.randomize_answers, warning_limit: full.warning_limit,
        auto_submit_enabled: full.auto_submit_enabled, fullscreen_required: full.fullscreen_required,
      });
      setModalOpen(true);
    } catch {
      toast.error('Gagal memuat data ujian. Silakan coba lagi.');
      setEditingId(null);
    }
  };

  const examColumns: ColumnDef<Exam>[] = [
    {
      accessorKey: 'title', header: 'Judul', enableSorting: true,
      cell: ({ row }: any) => (
        <div>
          <p className="font-medium">{row.original.title}</p>
          {row.original.description && <p className="text-xs text-muted-foreground line-clamp-1">{row.original.description}</p>}
        </div>
      ),
    },
    { accessorKey: 'subject.name', header: 'Mapel', cell: ({ row }: any) => <span className="text-sm">{row.original.subject?.name || '-'}</span> },
    {
      accessorKey: 'duration_minutes', header: 'Durasi', enableSorting: true,
      cell: ({ row }: any) => (<span className="flex items-center gap-1 text-sm"><Clock className="h-3 w-3" /> {row.original.duration_minutes} menit</span>),
    },
    {
      accessorKey: 'start_at', header: 'Mulai', enableSorting: true,
      cell: ({ row }: any) => (<span className="flex items-center gap-1 text-sm text-muted-foreground"><Calendar className="h-3 w-3" /> {formatDate(row.original.start_at)}</span>),
    },
    {
      accessorKey: 'end_at', header: 'Selesai', enableSorting: true,
      cell: ({ row }: any) => (<span className="flex items-center gap-1 text-sm text-muted-foreground"><Calendar className="h-3 w-3" /> {formatDate(row.original.end_at)}</span>),
    },
    {
      id: 'token',
      header: 'Token Ujian',
      cell: ({ row }: any) => {
        const tokenVal = row.original.exam_token?.token;
        const isEligible = ['PUBLISHED', 'ONGOING'].includes(row.original.status);

        if (tokenVal) {
          return (
            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(tokenVal);
                toast.success(`Token ${tokenVal} berhasil disalin ke clipboard!`);
              }}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 font-mono text-xs font-bold hover:bg-indigo-100 transition cursor-pointer group shadow-2xs"
              title="Klik untuk salin token"
            >
              <span>{tokenVal}</span>
              <Copy className="h-3 w-3 text-indigo-500 group-hover:scale-110 transition-transform" />
            </button>
          );
        }

        if (isEligible) {
          return (
            <Button
              variant="outline"
              size="sm"
              onClick={() => tokenMutation.mutate(row.original.id)}
              className="h-7 text-xs px-2.5 gap-1.5 border-dashed border-primary/50 text-primary hover:bg-primary/5"
            >
              <Key className="h-3 w-3" /> Rilis Token
            </Button>
          );
        }

        return <span className="text-xs text-muted-foreground">—</span>;
      },
    },
    {
      accessorKey: 'status', header: 'Status', enableSorting: true,
      cell: ({ row }: any) => (<Badge variant={statusColors[row.original.status] || 'default'}>{statusLabels[row.original.status] || row.original.status}</Badge>),
    },
    { accessorKey: '_count.exam_questions', header: 'Soal', enableSorting: true, cell: ({ row }: any) => <Badge>{row.original._count?.exam_questions || 0}</Badge> },
    {
      id: 'actions', header: 'Aksi',
      cell: ({ row }: any) => (
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" onClick={() => handleEdit(row.original)} title="Edit Ujian"><Pencil className="h-4 w-4" /></Button>
          {(row.original.status === 'PUBLISHED' || row.original.status === 'ONGOING') && (
            <Button variant="ghost" size="icon" onClick={() => tokenMutation.mutate(row.original.id)} title="Generate / Perbarui Token"><Key className="h-4 w-4" /></Button>
          )}
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="icon" title="Hapus Ujian"><Trash2 className="h-4 w-4 text-destructive" /></Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Hapus Ujian</AlertDialogTitle>
                <AlertDialogDescription>Yakin ingin menghapus ujian ini? Tindakan ini tidak dapat dibatalkan.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Batal</AlertDialogCancel>
                <AlertDialogAction onClick={() => deleteMutation.mutate(row.original.id)}>Hapus</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      ),
    },
  ];

  const totalExams = exams?.length || 0;
  const ongoingCount = exams?.filter(e => e.status === 'ONGOING').length || 0;
  const publishedCount = exams?.filter(e => e.status === 'PUBLISHED').length || 0;
  const finishedCount = exams?.filter(e => e.status === 'FINISHED').length || 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border/60">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">Jadwal &amp; Sesi Ujian</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Buat, kelola paket soal, dan pantau token sesi ujian</p>
        </div>
        <Button onClick={() => { setEditingId(null); setForm(emptyExamForm); setModalOpen(true); }} className="rounded-xl gap-2 font-semibold shadow-xs">
          <Plus className="h-4 w-4" />
          Buat Ujian Baru
        </Button>
      </div>

      {/* Quick Status Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-border/70 bg-card p-4 shadow-xs">
          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Total Jadwal</span>
          <p className="text-2xl font-extrabold tracking-tight text-foreground mt-1 tabular-nums">{totalExams}</p>
        </div>
        <div className="rounded-2xl border border-border/70 bg-card p-4 shadow-xs">
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Sedang Aktif</span>
          <p className="text-2xl font-extrabold tracking-tight text-emerald-600 dark:text-emerald-400 mt-1 tabular-nums">{ongoingCount}</p>
        </div>
        <div className="rounded-2xl border border-border/70 bg-card p-4 shadow-xs">
          <span className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">Terbit / Siap</span>
          <p className="text-2xl font-extrabold tracking-tight text-blue-600 dark:text-blue-400 mt-1 tabular-nums">{publishedCount}</p>
        </div>
        <div className="rounded-2xl border border-border/70 bg-card p-4 shadow-xs">
          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Selesai</span>
          <p className="text-2xl font-extrabold tracking-tight text-foreground mt-1 tabular-nums">{finishedCount}</p>
        </div>
      </div>

      <Card className="rounded-2xl border-border/70 shadow-xs">
        <CardContent className="pt-6">
          <DataTable
            columns={examColumns}
            data={exams || []}
            searchKey="title"
            searchPlaceholder="Cari ujian..."
            filters={[
              {
                column: 'status',
                label: 'Semua Status',
                options: [
                  { value: 'DRAFT', label: 'Draft' },
                  { value: 'PUBLISHED', label: 'Terbit' },
                  { value: 'ONGOING', label: 'Berlangsung' },
                  { value: 'FINISHED', label: 'Selesai' },
                  { value: 'CANCELLED', label: 'Dibatalkan' },
                ],
              },
            ]}
            loading={isLoading}
            emptyMessage="Belum ada ujian"
          />
        </CardContent>
      </Card>

      <CreateExamModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditingId(null); }}
        form={form}
        setForm={setForm}
        subjects={subjects || []}
        classes={classes || []}
        banks={banks || []}
        questions={questions || []}
        bankFilter={bankFilter}
        setBankFilter={setBankFilter}
        onSave={handleSave}
        isEditing={!!editingId}
      />

      <TokenModal token={token} onClose={() => setToken(null)} />
    </div>
  );
}

export default function ExamsPage() {
  return <ErrorBoundary><ExamsPageContent /></ErrorBoundary>;
}
