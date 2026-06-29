'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { academicApi, questionBankApi, examApi } from '@/lib/api-service';
import { ErrorBoundary } from '@/components/ui/error-boundary';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/table';
import { DataTable } from '@/components/ui/data-table';
import type { ColumnDef } from '@tanstack/react-table';
import { formatDate } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Plus, Pencil, Trash2, Key, Clock, Calendar } from 'lucide-react';
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
      const { data } = await questionBankApi.getQuestions({ per_page: 200 });
      return data.data as Question[];
    },
  });

  const { data: exams, isLoading } = useQuery({
    queryKey: ['exams'],
    queryFn: async () => { const { data } = await examApi.getAll(); return data.data as Exam[]; },
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

  const handleEdit = (exam: Exam) => {
    setEditingId(exam.id);
    const toWIB = (iso: string) => {
      if (!iso) return '';
      const d = new Date(iso);
      d.setTime(d.getTime() + 7 * 60 * 60 * 1000);
      return d.toISOString().slice(0, 16);
    };

    examApi.getById(exam.id).then((res) => {
      const full = res.data.data;
      setForm({
        title: full.title, description: full.description || '',
        subject_id: full.subject?.id || '', duration_minutes: full.duration_minutes,
        start_at: toWIB(full.start_at), end_at: toWIB(full.end_at),
        class_ids: full.exam_classes?.map((ec: any) => ec.class.id) || [],
        question_ids: full.exam_questions?.map((eq: any) => eq.question_id) || [],
        package_count: full.package_count || 1, randomize_questions: full.randomize_questions,
        randomize_answers: full.randomize_answers, warning_limit: full.warning_limit,
        auto_submit_enabled: full.auto_submit_enabled, fullscreen_required: full.fullscreen_required,
      });
      setModalOpen(true);
    }).catch(() => {
      setForm({
        title: exam.title, description: exam.description || '',
        subject_id: exam.subject?.id || '', duration_minutes: exam.duration_minutes,
        start_at: toWIB(exam.start_at), end_at: toWIB(exam.end_at),
        class_ids: exam.classes?.map((c) => c.class.id) || [], question_ids: [],
        package_count: exam.package_count || 1, randomize_questions: exam.randomize_questions,
        randomize_answers: exam.randomize_answers, warning_limit: exam.warning_limit,
        auto_submit_enabled: exam.auto_submit_enabled, fullscreen_required: exam.fullscreen_required,
      });
      setModalOpen(true);
    });
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
      accessorKey: 'status', header: 'Status', enableSorting: true,
      cell: ({ row }: any) => (<Badge variant={statusColors[row.original.status] || 'default'}>{statusLabels[row.original.status] || row.original.status}</Badge>),
    },
    { accessorKey: '_count.exam_questions', header: 'Soal', enableSorting: true, cell: ({ row }: any) => <Badge>{row.original._count?.exam_questions || 0}</Badge> },
    {
      id: 'actions', header: 'Aksi',
      cell: ({ row }: any) => (
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" onClick={() => handleEdit(row.original)}><Pencil className="h-4 w-4" /></Button>
          {(row.original.status === 'PUBLISHED' || row.original.status === 'ONGOING') && (
            <Button variant="ghost" size="icon" onClick={() => tokenMutation.mutate(row.original.id)} title="Generate Token"><Key className="h-4 w-4" /></Button>
          )}
          <Button variant="ghost" size="icon" onClick={() => { if (confirm('Hapus ujian ini?')) deleteMutation.mutate(row.original.id); }}><Trash2 className="h-4 w-4 text-destructive" /></Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Ujian</h1>
          <p className="text-muted-foreground">Buat dan kelola ujian</p>
        </div>
        <Button onClick={() => { setEditingId(null); setForm(emptyExamForm); setModalOpen(true); }}>
          <Plus className="mr-2 h-4 w-4" />
          Buat Ujian
        </Button>
      </div>

      <Card>
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
