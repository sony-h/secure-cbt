'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { questionBankApi, academicApi } from '@/lib/api-service';
import { useRoleGuard } from '@/hooks/use-role-guard';
import { ErrorBoundary } from '@/components/ui/error-boundary';
import { UserRole } from '@secure-cbt/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DataTable } from '@/components/ui/data-table';
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '@/components/ui/select';
import {
  AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader,
  AlertDialogTitle, AlertDialogDescription, AlertDialogFooter,
  AlertDialogAction, AlertDialogCancel,
} from '@/components/ui/alert-dialog';
import type { ColumnDef } from '@tanstack/react-table';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Plus, Pencil, Trash2, Copy, Image as ImageIcon } from 'lucide-react';
import { toast } from 'sonner';
import { formatDate } from '@/lib/utils';
import { MathRenderer } from '@/components/ui/math-renderer';
import { questionTypes, difficultyLevels } from '@/components/questions/question-modal';

interface QuestionBank {
  id: string;
  title: string;
  subject: { id: string; name: string; code: string };
  _count: { questions: number };
  created_at: string;
}

interface Question {
  id: string;
  content: string;
  image_url?: string | null;
  type: string;
  difficulty: string;
  explanation: string | null;
  options: { id: string; content: string; image_url?: string | null; is_correct: boolean; order: number }[];
  tags: { id: string; tag: string }[];
  question_bank: { id: string; title: string; subject: { name: string } };
  created_at: string;
}

interface Subject {
  id: string;
  name: string;
  code: string;
}

function QuestionsPageContent() {
  useRoleGuard([UserRole.ADMIN, UserRole.TEACHER]);
  const router = useRouter();
  const queryClient = useQueryClient();
  const [newBankName, setNewBankName] = useState('');
  const [newBankSubject, setNewBankSubject] = useState('');

  const { data: banks } = useQuery({
    queryKey: ['question-banks'],
    queryFn: async () => { const { data } = await questionBankApi.getBanks(); return data.data as QuestionBank[]; },
  });

  const { data: subjectsData } = useQuery({
    queryKey: ['subjects'],
    queryFn: async () => { const { data } = await academicApi.getSubjects(); return data.data as Subject[]; },
  });

  const { data: questions, isLoading } = useQuery({
    queryKey: ['questions'],
    queryFn: async () => { const { data } = await questionBankApi.getQuestions({ per_page: 500 }); return data.data as Question[]; },
  });

  const createBankMutation = useMutation({
    mutationFn: (dto: { title: string; subject_id: string }) => questionBankApi.createBank(dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['question-banks'] });
      toast.success('Bank soal berhasil dibuat');
      setNewBankName(''); setNewBankSubject('');
    },
    onError: () => toast.error('Gagal membuat bank soal'),
  });

  const deleteBankMutation = useMutation({
    mutationFn: (id: string) => questionBankApi.deleteBank(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['question-banks'] }); toast.success('Bank soal dihapus'); },
    onError: () => toast.error('Gagal menghapus bank soal'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => questionBankApi.deleteQuestion(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['questions'] });
      queryClient.invalidateQueries({ queryKey: ['question-banks'] });
      toast.success('Soal dihapus');
    },
    onError: () => toast.error('Gagal menghapus soal'),
  });

  const duplicateMutation = useMutation({
    mutationFn: (id: string) => questionBankApi.duplicateQuestion(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['questions'] });
      queryClient.invalidateQueries({ queryKey: ['question-banks'] });
      toast.success('Soal berhasil diduplikasi');
    },
    onError: () => toast.error('Gagal menduplikasi soal'),
  });

  const handleEdit = (question: Question) => {
    router.push(`/dashboard/questions/${question.id}/edit`);
  };

  const handleAdd = () => {
    router.push('/dashboard/questions/new');
  };

  const questionColumns: ColumnDef<Question>[] = [
    {
      accessorKey: 'content',
      header: 'Pertanyaan',
      cell: ({ row }: any) => (
        <div className="max-w-md">
          <div className="flex items-start gap-2">
            {row.original.image_url && (
              <span className="shrink-0 mt-0.5 inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-primary/10 text-primary text-[10px] font-semibold" title="Memiliki Gambar Diagram">
                <ImageIcon className="h-3 w-3" /> Foto
              </span>
            )}
            <div className="truncate font-medium text-sm">
              <MathRenderer content={row.original.content} />
            </div>
          </div>
          {row.original.tags?.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1">
              {row.original.tags.map((t: any) => (
                <Badge key={t.id} variant="secondary" className="text-xs">{t.tag}</Badge>
              ))}
            </div>
          )}
        </div>
      ),
    },
    {
      id: 'bankName',
      accessorFn: (row: any) => row.question_bank?.title,
      header: 'Bank',
      filterFn: 'equalsString',
      cell: ({ row }: any) => <span className="text-sm">{row.original.question_bank?.title || '-'}</span>,
    },
    {
      accessorKey: 'type',
      header: 'Tipe',
      cell: ({ row }: any) => (
        <Badge variant="default">{questionTypes.find((t: any) => t.value === row.original.type)?.label || row.original.type}</Badge>
      ),
    },
    {
      accessorKey: 'difficulty',
      header: 'Kesulitan',
      cell: ({ row }: any) => (
        <Badge
          variant={
            row.original.difficulty === 'EASY' ? 'success' : row.original.difficulty === 'HARD' ? 'destructive' : 'warning'
          }
        >
          {difficultyLevels.find((d: any) => d.value === row.original.difficulty)?.label || row.original.difficulty}
        </Badge>
      ),
    },
    {
      id: 'actions',
      header: 'Aksi',
      cell: ({ row }: any) => (
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" onClick={() => handleEdit(row.original)}>
            <Pencil className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => duplicateMutation.mutate(row.original.id)}>
            <Copy className="h-4 w-4" />
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="icon"><Trash2 className="h-4 w-4 text-destructive" /></Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Hapus Soal</AlertDialogTitle>
                <AlertDialogDescription>Yakin ingin menghapus soal ini? Tindakan ini tidak dapat dibatalkan.</AlertDialogDescription>
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Bank Soal</h1>
          <p className="text-muted-foreground">Kelola bank soal dan pertanyaan ujian</p>
        </div>
        <Button onClick={handleAdd}>
          <Plus className="mr-2 h-4 w-4" />
          Tambah Soal
        </Button>
      </div>

      <Tabs defaultValue="questions" className="space-y-4">
        <TabsList>
          <TabsTrigger value="questions">Daftar Soal</TabsTrigger>
          <TabsTrigger value="banks">Bank Soal</TabsTrigger>
        </TabsList>

        <TabsContent value="questions" className="space-y-4">
          <Card>
            <CardContent className="pt-6">
              <DataTable
                columns={questionColumns}
                data={questions || []}
                searchKey="content"
                searchPlaceholder="Cari soal..."
                filters={[
                  {
                    column: 'bankName',
                    label: 'Semua Bank',
                    options: (banks || []).map((b: any) => ({ value: b.title, label: b.title })),
                  },
                  {
                    column: 'type',
                    label: 'Semua Tipe',
                    options: questionTypes.map((t) => ({ value: t.value, label: t.label })),
                  },
                ]}
                loading={isLoading}
                emptyMessage="Belum ada soal. Buat bank soal terlebih dahulu."
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="banks" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Daftar Bank Soal</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-end gap-3 mb-6 p-4 border rounded-lg bg-muted/30">
                <div className="flex-1 space-y-2">
                  <Label>Nama Bank Soal</Label>
                  <Input
                    placeholder="Contoh: UTS Matematika Semester 1"
                    value={newBankName}
                    onChange={(e) => setNewBankName(e.target.value)}
                  />
                </div>
                <div className="w-48 space-y-2">
                  <Label>Mata Pelajaran</Label>
                  <Select value={newBankSubject} onValueChange={(v) => setNewBankSubject(v)}>
                    <SelectTrigger><SelectValue placeholder="Pilih Mapel" /></SelectTrigger>
                    <SelectContent>
                      {subjectsData?.map((s) => (
                        <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  onClick={() => {
                    if (!newBankName.trim()) { toast.error('Nama bank soal harus diisi'); return; }
                    if (!newBankSubject) { toast.error('Pilih mata pelajaran'); return; }
                    createBankMutation.mutate({ title: newBankName, subject_id: newBankSubject });
                  }}
                  disabled={createBankMutation.isPending}
                >
                  Buat Bank
                </Button>
              </div>

              <DataTable
                columns={[
                  { accessorKey: 'title', header: 'Nama Bank', enableSorting: true },
                  { accessorKey: 'subject.name', header: 'Mata Pelajaran', cell: ({ row }: any) => row.original.subject?.name || '-' },
                  { accessorKey: '_count.questions', header: 'Jumlah Soal', enableSorting: true, cell: ({ row }: any) => <Badge>{row.original._count?.questions || 0}</Badge> },
                  { accessorKey: 'created_at', header: 'Dibuat', enableSorting: true, cell: ({ row }: any) => <span className="text-muted-foreground text-sm">{formatDate(row.original.created_at)}</span> },
                  {
                    id: 'actions',
                    header: 'Aksi',
                    cell: ({ row }: any) => (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon"><Trash2 className="h-4 w-4 text-destructive" /></Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Hapus Bank Soal</AlertDialogTitle>
                            <AlertDialogDescription>Yakin ingin menghapus bank "{row.original.title}"? Semua soal di dalamnya akan dihapus.</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Batal</AlertDialogCancel>
                            <AlertDialogAction onClick={() => deleteBankMutation.mutate(row.original.id)}>Hapus</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    ),
                  },
                ]}
                data={banks || []}
                emptyMessage="Belum ada bank soal"
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function QuestionsPage() {
  return <ErrorBoundary><QuestionsPageContent /></ErrorBoundary>;
}
