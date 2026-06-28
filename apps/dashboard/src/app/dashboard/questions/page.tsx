'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth.store';
import { UserRole } from '@secure-cbt/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/table';
import { DataTable } from '@/components/ui/data-table';
import type { ColumnDef } from '@tanstack/react-table';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Plus, Pencil, Trash2, Copy, X } from 'lucide-react';
import { toast } from 'sonner';
import { formatDate } from '@/lib/utils';

// ── Types ──────────────────────────────────────────────────────────
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
  type: string;
  difficulty: string;
  explanation: string | null;
  options: { id: string; content: string; is_correct: boolean; order: number }[];
  tags: { id: string; tag: string }[];
  question_bank: { id: string; title: string; subject: { name: string } };
  created_at: string;
}

interface Subject {
  id: string;
  name: string;
  code: string;
}

// ── Form State ────────────────────────────────────────────────────
interface QuestionFormData {
  question_bank_id: string;
  type: string;
  content: string;
  difficulty: string;
  explanation: string;
  options: { content: string; is_correct: boolean }[];
  tags: string[];
}

const DEFAULT_OPTION_COUNT = 5;

function makeEmptyOptions(count: number = DEFAULT_OPTION_COUNT) {
  return Array.from({ length: count }, () => ({ content: '', is_correct: false }));
}

const emptyForm: QuestionFormData = {
  question_bank_id: '',
  type: 'MULTIPLE_CHOICE',
  content: '',
  difficulty: 'MEDIUM',
  explanation: '',
  options: makeEmptyOptions(),
  tags: [],
};

// ── Question Type Options ──────────────────────────────────────────
const questionTypes = [
  { value: 'MULTIPLE_CHOICE', label: 'Pilihan Ganda' },
  { value: 'MULTI_SELECT', label: 'Multi Pilih' },
  { value: 'TRUE_FALSE', label: 'Benar/Salah' },
  { value: 'ESSAY', label: 'Esai' },
];
const difficultyLevels = [
  { value: 'EASY', label: 'Mudah' },
  { value: 'MEDIUM', label: 'Sedang' },
  { value: 'HARD', label: 'Sulit' },
];

// ── Modal Component ────────────────────────────────────────────────
function QuestionModal({
  open,
  onClose,
  form,
  setForm,
  banks,
  onSave,
  isEditing,
}: {
  open: boolean;
  onClose: () => void;
  form: QuestionFormData;
  setForm: (f: QuestionFormData) => void;
  banks: QuestionBank[];
  onSave: () => void;
  isEditing: boolean;
}) {
  const tagInputRef = useRef<HTMLInputElement>(null);
  if (!open) return null;

  const addTag = (tag: string) => {
    if (tag && !form.tags.includes(tag)) {
      setForm({ ...form, tags: [...form.tags, tag] });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-lg border bg-background p-6 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">{isEditing ? 'Edit Soal' : 'Tambah Soal'}</h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="space-y-4">
          {/* Bank */}
          <div className="space-y-2">
            <Label>Bank Soal</Label>
            <select
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={form.question_bank_id}
              onChange={(e) => setForm({ ...form, question_bank_id: e.target.value })}
            >
              <option value="">Pilih Bank Soal</option>
              {banks.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.title} ({b.subject.name})
                </option>
              ))}
            </select>
          </div>

          {/* Type & Difficulty */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Tipe Soal</Label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value })}
              >
                {questionTypes.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label>Tingkat Kesulitan</Label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={form.difficulty}
                onChange={(e) => setForm({ ...form, difficulty: e.target.value })}
              >
                {difficultyLevels.map((d) => (
                  <option key={d.value} value={d.value}>{d.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Content */}
          <div className="space-y-2">
            <Label>Pertanyaan</Label>
            <textarea
              className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={form.content}
              onChange={(e) => setForm({ ...form, content: e.target.value })}
              placeholder="Tulis pertanyaan di sini..."
            />
          </div>

          {/* Options (for objective types) */}
          {form.type !== 'ESSAY' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Pilihan Jawaban</Label>
                <span className="text-xs text-muted-foreground">{form.options.length} opsi</span>
              </div>
              {form.options.map((opt, idx) => (
                <div key={idx} className="flex items-center gap-3">
                  <span className="w-8 text-sm font-medium text-muted-foreground shrink-0">
                    {String.fromCharCode(65 + (idx % 26))}{idx >= 26 ? String.fromCharCode(65 + Math.floor(idx / 26) - 1) : ''}.
                  </span>
                  <Input
                    value={opt.content}
                    onChange={(e) => {
                      const newOpts = [...form.options];
                      newOpts[idx] = { ...newOpts[idx], content: e.target.value };
                      setForm({ ...form, options: newOpts });
                    }}
                    placeholder={`Pilihan ${String.fromCharCode(65 + (idx % 26))}${idx >= 26 ? String.fromCharCode(65 + Math.floor(idx / 26) - 1) : ''}`}
                  />
                  <label className="flex items-center gap-1 text-sm cursor-pointer shrink-0">
                    <input
                      type={form.type === 'MULTI_SELECT' ? 'checkbox' : 'radio'}
                      name="correct"
                      checked={opt.is_correct}
                      onChange={() => {
                        const newOpts = [...form.options];
                        if (form.type === 'MULTI_SELECT') {
                          newOpts[idx] = { ...newOpts[idx], is_correct: !opt.is_correct };
                        } else {
                          newOpts.forEach((_, i) => {
                            newOpts[i] = { ...newOpts[i], is_correct: i === idx };
                          });
                        }
                        setForm({ ...form, options: newOpts });
                      }}
                    />
                    Benar
                  </label>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="shrink-0"
                    disabled={form.options.length <= 2}
                    onClick={() => {
                      if (form.options.length <= 2) return;
                      const newOpts = form.options.filter((_, i) => i !== idx);
                      // If we removed the correct option, uncheck all
                      const hadCorrect = form.options.some((o, i) => i !== idx && o.is_correct);
                      if (!hadCorrect && opt.is_correct) {
                        newOpts[0] = { ...newOpts[0], is_correct: true };
                      }
                      setForm({ ...form, options: newOpts });
                    }}
                    title="Hapus opsi"
                  >
                    <X className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                  </Button>
                </div>
              ))}
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                disabled={form.options.length >= 26}
                onClick={() => {
                  setForm({ ...form, options: [...form.options, { content: '', is_correct: false }] });
                }}
              >
                <Plus className="mr-1 h-3 w-3" />
                Tambah Opsi ({form.options.length}/26)
              </Button>
            </div>
          )}

          {/* Explanation */}
          <div className="space-y-2">
            <Label>Pembahasan (opsional)</Label>
            <textarea
              className="flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={form.explanation}
              onChange={(e) => setForm({ ...form, explanation: e.target.value })}
              placeholder="Tulis pembahasan jawaban..."
            />
          </div>

          {/* Tags */}
          <div className="space-y-2">
            <Label>Tag</Label>
            <div className="flex items-center gap-2">
              <Input
                ref={tagInputRef}
                placeholder="Tambahkan tag..."
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    addTag((e.target as HTMLInputElement).value);
                    (e.target as HTMLInputElement).value = '';
                  }
                }}
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const input = tagInputRef.current;
                  if (input) {
                    addTag(input.value);
                    input.value = '';
                  }
                }}
              >
                Tambah
              </Button>
            </div>
            {form.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {form.tags.map((tag, i) => (
                  <Badge key={i} variant="secondary" className="gap-1">
                    {tag}
                    <button
                      onClick={() => setForm({ ...form, tags: form.tags.filter((_, j) => j !== i) })}
                      className="ml-1 hover:text-destructive"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
          <Button variant="outline" onClick={onClose}>Batal</Button>
          <Button onClick={onSave}>{isEditing ? 'Simpan' : 'Buat Soal'}</Button>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────
export default function QuestionsPage() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const { user } = useAuthStore();

  useEffect(() => {
    if (user && ![UserRole.ADMIN, UserRole.TEACHER].includes(user.role)) {
      router.replace('/dashboard');
    }
  }, [user, router]);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<QuestionFormData>(emptyForm);
  const [newBankName, setNewBankName] = useState('');
  const [newBankSubject, setNewBankSubject] = useState('');

  // ── Fetch banks ────────────────────────────────────────────────
  const { data: banks } = useQuery({
    queryKey: ['question-banks'],
    queryFn: async () => {
      const { data } = await api.get('/questions/banks');
      return data.data as QuestionBank[];
    },
  });

  // ── Fetch subjects ─────────────────────────────────────────────
  const { data: subjectsData } = useQuery({
    queryKey: ['subjects'],
    queryFn: async () => {
      const { data } = await api.get('/academic/subjects');
      return data.data as Subject[];
    },
  });

  // ── Fetch questions ────────────────────────────────────────────
  const { data: questions, isLoading } = useQuery({
    queryKey: ['questions'],
    queryFn: async () => {
      const { data } = await api.get('/questions');
      return data.data as Question[];
    },
  });

  // ── Mutations ──────────────────────────────────────────────────
  const createBankMutation = useMutation({
    mutationFn: (dto: { title: string; subject_id: string }) => api.post('/questions/banks', dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['question-banks'] });
      toast.success('Bank soal berhasil dibuat');
      setNewBankName('');
      setNewBankSubject('');
    },
    onError: () => toast.error('Gagal membuat bank soal'),
  });

  const deleteBankMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/questions/banks/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['question-banks'] });
      toast.success('Bank soal dihapus');
    },
    onError: () => toast.error('Gagal menghapus bank soal'),
  });

  const saveMutation = useMutation({
    mutationFn: (dto: any) =>
      editingId ? api.patch(`/questions/${editingId}`, dto) : api.post('/questions', dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['questions'] });
      queryClient.invalidateQueries({ queryKey: ['question-banks'] });
      toast.success(editingId ? 'Soal diperbarui' : 'Soal berhasil dibuat');
      setModalOpen(false);
      setEditingId(null);
      setForm(emptyForm);
    },
    onError: () => toast.error('Gagal menyimpan soal'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/questions/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['questions'] });
      queryClient.invalidateQueries({ queryKey: ['question-banks'] });
      toast.success('Soal dihapus');
    },
    onError: () => toast.error('Gagal menghapus soal'),
  });

  const duplicateMutation = useMutation({
    mutationFn: (id: string) => api.post(`/questions/${id}/duplicate`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['questions'] });
      queryClient.invalidateQueries({ queryKey: ['question-banks'] });
      toast.success('Soal berhasil diduplikasi');
    },
    onError: () => toast.error('Gagal menduplikasi soal'),
  });

  // ── Handlers ───────────────────────────────────────────────────
  const handleSave = () => {
    if (!form.question_bank_id) return toast.error('Pilih bank soal terlebih dahulu');
    if (!form.content.trim()) return toast.error('Pertanyaan tidak boleh kosong');
    if (form.type !== 'ESSAY') {
      if (form.options.some((o) => !o.content.trim())) return toast.error('Semua pilihan harus diisi');
      if (!form.options.some((o) => o.is_correct)) return toast.error('Pilih jawaban yang benar');
    }

    const dto: any = {
      question_bank_id: form.question_bank_id,
      type: form.type,
      content: form.content,
      difficulty: form.difficulty,
      explanation: form.explanation || undefined,
      options: form.type !== 'ESSAY' ? form.options : undefined,
      tags: form.tags.length > 0 ? form.tags : undefined,
    };
    saveMutation.mutate(dto);
  };

  const handleEdit = (question: Question) => {
    setEditingId(question.id);
    setForm({
      question_bank_id: question.question_bank.id,
      type: question.type,
      content: question.content,
      difficulty: question.difficulty,
      explanation: question.explanation || '',
      options: question.options.map((o) => ({ content: o.content, is_correct: o.is_correct })),
      tags: question.tags.map((t) => t.tag),
    });
    setModalOpen(true);
  };

  const handleAdd = () => {
    setEditingId(null);
    setForm(emptyForm);
    setModalOpen(true);
  };

  const questionColumns: ColumnDef<Question>[] = [
    {
      accessorKey: 'content',
      header: 'Pertanyaan',
      cell: ({ row }: any) => (
        <div>
          <div className="max-w-md truncate font-medium">{row.original.content}</div>
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
          <Button variant="ghost" size="icon" onClick={() => { if (confirm('Yakin ingin menghapus soal ini?')) deleteMutation.mutate(row.original.id); }}>
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
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

        {/* ── Questions Tab ─────────────────────────────────────────── */}
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

        {/* ── Banks Tab ──────────────────────────────────────────────── */}
        <TabsContent value="banks" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Daftar Bank Soal</CardTitle>
            </CardHeader>
            <CardContent>
              {/* Create bank form */}
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
                  <select
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={newBankSubject}
                    onChange={(e) => setNewBankSubject(e.target.value)}
                  >
                    <option value="">Pilih Mapel</option>
                    {subjectsData?.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
                <Button
                  onClick={() => {
                    if (!newBankName.trim()) return toast.error('Nama bank soal harus diisi');
                    if (!newBankSubject) return toast.error('Pilih mata pelajaran');
                    createBankMutation.mutate({ title: newBankName, subject_id: newBankSubject });
                  }}
                  disabled={createBankMutation.isPending}
                >
                  Buat Bank
                </Button>
              </div>

              {/* Banks list */}
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
                      <Button variant="ghost" size="icon" onClick={() => {
                        const bank = row.original;
                        if (confirm(`Yakin ingin menghapus bank "${bank.title}"? Semua soal di dalamnya akan dihapus.`)) {
                          deleteBankMutation.mutate(bank.id);
                        }
                      }}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
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

      {/* ── Question Create/Edit Modal ──────────────────────────────────── */}
      <QuestionModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditingId(null); }}
        form={form}
        setForm={setForm}
        banks={banks || []}
        onSave={handleSave}
        isEditing={!!editingId}
      />
    </div>
  );
}
