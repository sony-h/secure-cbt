'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, Badge, Spinner } from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Plus, Pencil, Trash2, Copy, Search, X } from 'lucide-react';
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
  subjects,
  onSave,
  isEditing,
}: {
  open: boolean;
  onClose: () => void;
  form: QuestionFormData;
  setForm: (f: QuestionFormData) => void;
  banks: QuestionBank[];
  subjects: Subject[];
  onSave: () => void;
  isEditing: boolean;
}) {
  if (!open) return null;

  const filteredBanks = form.question_bank_id
    ? banks
    : banks;

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
              {filteredBanks.map((b) => (
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
                  const input = document.querySelector<HTMLInputElement>('input[placeholder="Tambahkan tag..."]');
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
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [bankFilter, setBankFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
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
  const { data, isLoading } = useQuery({
    queryKey: ['questions', page, search, bankFilter, typeFilter],
    queryFn: async () => {
      const params: any = { page, per_page: 20 };
      if (search) params.search = search;
      if (bankFilter) params.bank_id = bankFilter;
      if (typeFilter) params.type = typeFilter;
      const { data } = await api.get('/questions', { params });
      return data;
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

  const questions = data?.data ?? [];
  const meta = data?.meta;

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
            <CardHeader>
              <div className="flex flex-wrap items-center gap-3">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Cari soal..."
                    className="pl-9"
                    value={search}
                    onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                  />
                </div>
                <select
                  className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                  value={bankFilter}
                  onChange={(e) => { setBankFilter(e.target.value); setPage(1); }}
                >
                  <option value="">Semua Bank</option>
                  {banks?.map((b) => (
                    <option key={b.id} value={b.id}>{b.title}</option>
                  ))}
                </select>
                <select
                  className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                  value={typeFilter}
                  onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
                >
                  <option value="">Semua Tipe</option>
                  {questionTypes.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex h-48 items-center justify-center">
                  <Spinner className="h-8 w-8" />
                </div>
              ) : (
                <>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[40%]">Pertanyaan</TableHead>
                        <TableHead>Bank</TableHead>
                        <TableHead>Tipe</TableHead>
                        <TableHead>Kesulitan</TableHead>
                        <TableHead className="w-[120px]">Aksi</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {questions.map((q: Question) => (
                        <TableRow key={q.id}>
                          <TableCell>
                            <div className="max-w-md truncate font-medium">{q.content}</div>
                            {q.tags.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-1">
                                {q.tags.map((t) => (
                                  <Badge key={t.id} variant="secondary" className="text-xs">{t.tag}</Badge>
                                ))}
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="text-sm">{q.question_bank?.title || '-'}</TableCell>
                          <TableCell>
                            <Badge variant="default">{questionTypes.find((t) => t.value === q.type)?.label || q.type}</Badge>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                q.difficulty === 'EASY' ? 'success' : q.difficulty === 'HARD' ? 'destructive' : 'warning'
                              }
                            >
                              {difficultyLevels.find((d) => d.value === q.difficulty)?.label || q.difficulty}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button variant="ghost" size="icon" onClick={() => handleEdit(q)}>
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => duplicateMutation.mutate(q.id)}
                              >
                                <Copy className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  if (confirm('Yakin ingin menghapus soal ini?')) {
                                    deleteMutation.mutate(q.id);
                                  }
                                }}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                      {questions.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center text-muted-foreground">
                            Belum ada soal. Buat bank soal terlebih dahulu.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>

                  {meta && (
                    <div className="mt-4 flex items-center justify-between">
                      <p className="text-sm text-muted-foreground">
                        Menampilkan {((page - 1) * 20) + 1}-{Math.min(page * 20, meta.total)} dari {meta.total}
                      </p>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                          Sebelumnya
                        </Button>
                        <Button variant="outline" size="sm" disabled={page >= meta.total_pages} onClick={() => setPage(page + 1)}>
                          Selanjutnya
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
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
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nama Bank</TableHead>
                    <TableHead>Mata Pelajaran</TableHead>
                    <TableHead>Jumlah Soal</TableHead>
                    <TableHead>Dibuat</TableHead>
                    <TableHead className="w-[80px]">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {banks?.map((bank) => (
                    <TableRow key={bank.id}>
                      <TableCell className="font-medium">{bank.title}</TableCell>
                      <TableCell>{bank.subject?.name || '-'}</TableCell>
                      <TableCell>
                        <Badge>{bank._count?.questions || 0}</Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {formatDate(bank.created_at)}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            if (confirm(`Yakin ingin menghapus bank "${bank.title}"? Semua soal di dalamnya akan dihapus.`)) {
                              deleteBankMutation.mutate(bank.id);
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {(!banks || banks.length === 0) && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground">
                        Belum ada bank soal
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
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
        subjects={subjectsData || []}
        onSave={handleSave}
        isEditing={!!editingId}
      />
    </div>
  );
}
