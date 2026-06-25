'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, Badge, Spinner } from '@/components/ui/table';
import { Plus, Pencil, Trash2, Search, X, Rocket, Key, Clock } from 'lucide-react';
import { toast } from 'sonner';

// ── Types ──────────────────────────────────────────────────────────
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

interface Subject {
  id: string;
  name: string;
  code: string;
}

interface Class {
  id: string;
  name: string;
  major?: { name: string };
}

interface Question {
  id: string;
  content: string;
  type: string;
  difficulty: string;
  question_bank: { id: string; title: string; subject: { name: string } };
}

interface QuestionBank {
  id: string;
  title: string;
  subject: { name: string };
  _count: { questions: number };
}

// ── Form State ────────────────────────────────────────────────────
interface ExamFormData {
  title: string;
  description: string;
  subject_id: string;
  duration_minutes: number;
  start_at: string;
  end_at: string;
  class_ids: string[];
  question_ids: string[];
  package_count: number;
  randomize_questions: boolean;
  randomize_answers: boolean;
  warning_limit: number;
  auto_submit_enabled: boolean;
  fullscreen_required: boolean;
}

const emptyExamForm: ExamFormData = {
  title: '',
  description: '',
  subject_id: '',
  duration_minutes: 60,
  start_at: '',
  end_at: '',
  class_ids: [],
  question_ids: [],
  package_count: 1,
  randomize_questions: false,
  randomize_answers: false,
  warning_limit: 3,
  auto_submit_enabled: true,
  fullscreen_required: true,
};

const statusColors: Record<string, 'default' | 'success' | 'warning' | 'destructive'> = {
  DRAFT: 'warning',
  PUBLISHED: 'success',
  ONGOING: 'default',
  FINISHED: 'default',
  CANCELLED: 'destructive',
};

const statusLabels: Record<string, string> = {
  DRAFT: 'Draft',
  PUBLISHED: 'Dipublikasi',
  ONGOING: 'Berlangsung',
  FINISHED: 'Selesai',
  CANCELLED: 'Dibatalkan',
};

// ── Create Exam Modal ─────────────────────────────────────────────
function CreateExamModal({
  open,
  onClose,
  form,
  setForm,
  subjects,
  classes,
  banks,
  questions,
  bankFilter,
  setBankFilter,
  onSave,
  isEditing,
}: {
  open: boolean;
  onClose: () => void;
  form: ExamFormData;
  setForm: (f: ExamFormData) => void;
  subjects: Subject[];
  classes: Class[];
  banks: QuestionBank[];
  questions: Question[];
  bankFilter: string;
  setBankFilter: (v: string) => void;
  onSave: () => void;
  isEditing: boolean;
}) {
  const [step, setStep] = useState(0);

  if (!open) return null;

  const steps = ['Info Dasar', 'Kelas', 'Soal', 'Pengaturan'];

  const filteredQuestions = bankFilter
    ? questions.filter((q) => q.question_bank?.id === bankFilter)
    : questions;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-3xl max-h-[85vh] overflow-y-auto rounded-lg border bg-background p-6 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">{isEditing ? 'Edit Ujian' : 'Buat Ujian Baru'}</h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-2 mb-6">
          {steps.map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <button
                onClick={() => setStep(i)}
                className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition ${
                  i === step ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                }`}
              >
                {i + 1}
              </button>
              <span className={`text-sm ${i === step ? 'font-medium' : 'text-muted-foreground'}`}>{s}</span>
              {i < steps.length - 1 && <div className="w-6 h-px bg-border" />}
            </div>
          ))}
        </div>

        {/* Step 0: Basic Info */}
        {step === 0 && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Judul Ujian</Label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Contoh: UTS Matematika XII IPA" />
            </div>
            <div className="space-y-2">
              <Label>Deskripsi (opsional)</Label>
              <textarea className="flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Mata Pelajaran</Label>
                <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={form.subject_id} onChange={(e) => setForm({ ...form, subject_id: e.target.value })}>
                  <option value="">Pilih Mapel</option>
                  {subjects.map((s) => (<option key={s.id} value={s.id}>{s.name} ({s.code})</option>))}
                </select>
              </div>
              <div className="space-y-2">
                <Label>Durasi (menit)</Label>
                <Input type="number" value={form.duration_minutes} onChange={(e) => setForm({ ...form, duration_minutes: Number(e.target.value) })} min={1} max={300} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Waktu Mulai</Label>
                <Input type="datetime-local" value={form.start_at} onChange={(e) => setForm({ ...form, start_at: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Waktu Selesai</Label>
                <Input type="datetime-local" value={form.end_at} onChange={(e) => setForm({ ...form, end_at: e.target.value })} />
              </div>
            </div>
          </div>
        )}

        {/* Step 1: Classes */}
        {step === 1 && (
          <div className="space-y-4">
            <Label>Pilih Kelas Peserta</Label>
            <p className="text-sm text-muted-foreground">Pilih kelas yang akan mengikuti ujian ini.</p>
            <div className="grid grid-cols-2 gap-3">
              {classes.map((c) => (
                <label key={c.id} className={`flex items-center gap-2 p-3 rounded-md border cursor-pointer transition hover:bg-muted ${form.class_ids.includes(c.id) ? 'border-primary bg-primary/5' : ''}`}>
                  <input
                    type="checkbox"
                    checked={form.class_ids.includes(c.id)}
                    onChange={() => {
                      const ids = form.class_ids.includes(c.id)
                        ? form.class_ids.filter((i) => i !== c.id)
                        : [...form.class_ids, c.id];
                      setForm({ ...form, class_ids: ids });
                    }}
                  />
                  <span className="text-sm font-medium">{c.name}</span>
                  {c.major && <span className="text-xs text-muted-foreground">({c.major.name})</span>}
                </label>
              ))}
            </div>
          </div>
        )}

        {/* Step 2: Questions */}
        {step === 2 && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Label className="whitespace-nowrap">Filter Bank:</Label>
              <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={bankFilter} onChange={(e) => setBankFilter(e.target.value)}>
                <option value="">Semua Bank</option>
                {banks.map((b) => (<option key={b.id} value={b.id}>{b.title} ({b._count.questions} soal)</option>))}
              </select>
            </div>
            <p className="text-sm text-muted-foreground">{form.question_ids.length} soal dipilih</p>
            <div className="max-h-60 overflow-y-auto space-y-2 border rounded-md p-2">
              {filteredQuestions.map((q) => (
                <label key={q.id} className={`flex items-start gap-2 p-2 rounded cursor-pointer hover:bg-muted ${form.question_ids.includes(q.id) ? 'bg-primary/5 border border-primary/30 rounded' : ''}`}>
                  <input
                    type="checkbox"
                    className="mt-1"
                    checked={form.question_ids.includes(q.id)}
                    onChange={() => {
                      const ids = form.question_ids.includes(q.id)
                        ? form.question_ids.filter((i) => i !== q.id)
                        : [...form.question_ids, q.id];
                      setForm({ ...form, question_ids: ids });
                    }}
                  />
                  <div className="flex-1 text-sm">
                    <p className="font-medium line-clamp-2">{q.content}</p>
                    <div className="flex gap-2 mt-1">
                      <Badge variant="secondary" className="text-xs">{q.type}</Badge>
                      <Badge variant="outline" className="text-xs">{q.difficulty}</Badge>
                    </div>
                  </div>
                </label>
              ))}
              {filteredQuestions.length === 0 && (
                <p className="text-center text-muted-foreground py-4">Tidak ada soal tersedia</p>
              )}
            </div>
          </div>
        )}

        {/* Step 3: Settings */}
        {step === 3 && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Jumlah Paket Soal</Label>
                <Input type="number" value={form.package_count} onChange={(e) => setForm({ ...form, package_count: Number(e.target.value) })} min={1} max={26} />
                <p className="text-xs text-muted-foreground">Paket A, B, C, dst.</p>
              </div>
              <div className="space-y-2">
                <Label>Batas Peringatan</Label>
                <Input type="number" value={form.warning_limit} onChange={(e) => setForm({ ...form, warning_limit: Number(e.target.value) })} min={0} max={10} />
                <p className="text-xs text-muted-foreground">Maksimal kecurangan sebelum force-submit</p>
              </div>
            </div>
            <div className="space-y-3 pt-2">
              {[
                { key: 'randomize_questions', label: 'Acak urutan soal', desc: 'Soal ditampilkan berbeda untuk setiap siswa' },
                { key: 'randomize_answers', label: 'Acak pilihan jawaban', desc: 'Urutan A/B/C/D diacak per siswa' },
                { key: 'auto_submit_enabled', label: 'Auto-submit saat waktu habis', desc: 'Jawaban otomatis dikumpulkan' },
                { key: 'fullscreen_required', label: 'Wajib fullscreen', desc: 'Layar penuh selama ujian berlangsung' },
              ].map((s) => (
                <label key={s.key} className="flex items-center justify-between p-3 rounded-md border cursor-pointer hover:bg-muted">
                  <div>
                    <p className="text-sm font-medium">{s.label}</p>
                    <p className="text-xs text-muted-foreground">{s.desc}</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={(form as any)[s.key]}
                    onChange={() => setForm({ ...form, [s.key]: !(form as any)[s.key] })}
                    className="h-5 w-5"
                  />
                </label>
              ))}
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="flex justify-between mt-6 pt-4 border-t">
          <div>
            {step > 0 && (
              <Button variant="outline" onClick={() => setStep(step - 1)}>Sebelumnya</Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>Batal</Button>
            {step < 3 ? (
              <Button onClick={() => setStep(step + 1)}>Selanjutnya</Button>
            ) : (
              <Button onClick={onSave}>{isEditing ? 'Simpan' : 'Buat Ujian'}</Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Token Display Modal ───────────────────────────────────────────
function TokenModal({ token, onClose }: { token: string | null; onClose: () => void }) {
  if (!token) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-sm rounded-lg border bg-background p-6 shadow-xl text-center">
        <Key className="mx-auto h-10 w-10 text-primary mb-3" />
        <h3 className="text-lg font-semibold mb-2">Token Ujian</h3>
        <div className="text-4xl font-mono font-bold tracking-widest text-primary py-3 bg-muted rounded-md select-all">{token}</div>
        <p className="text-sm text-muted-foreground mt-3">Bagikan token ini ke siswa untuk mengikuti ujian.</p>
        <Button className="mt-4 w-full" onClick={onClose}>Tutup</Button>
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────
export default function ExamsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ExamFormData>(emptyExamForm);
  const [bankFilter, setBankFilter] = useState('');
  const [token, setToken] = useState<string | null>(null);

  const { data: subjects } = useQuery({
    queryKey: ['subjects'],
    queryFn: async () => { 
      const { data } = await api.get('/academic/subjects'); 
      return data.data as Subject[]; 
    },
  });

  const { data: classes } = useQuery({
    queryKey: ['classes'],
    queryFn: async () => { 
      const { data } = await api.get('/academic/classes'); 
      return data.data as Class[]; 
    },
  });

  const { data: banks } = useQuery({
    queryKey: ['question-banks'],
    queryFn: async () => { 
      const { data } = await api.get('/questions/banks'); 
      return data.data as QuestionBank[]; 
    },
  });

  const { data: questions } = useQuery({
    queryKey: ['all-questions'],
    queryFn: async () => {
      const { data } = await api.get('/questions', { params: { per_page: 200 } });
      return data.data as Question[];
    },
  });

  const { data: examsData, isLoading } = useQuery({
    queryKey: ['exams', page, search, statusFilter],
    queryFn: async () => {
      const params: any = { page, per_page: 20 };
      if (search) params.search = search;
      if (statusFilter) params.status = statusFilter;
      const { data } = await api.get('/exams', { params });
      return data;
    },
  });

  const saveMutation = useMutation({
    mutationFn: (dto: any) =>
      editingId ? api.patch(`/exams/${editingId}`, dto) : api.post('/exams', dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exams'] });
      toast.success(editingId ? 'Ujian diperbarui' : 'Ujian berhasil dibuat');
      setModalOpen(false);
      setEditingId(null);
      setForm(emptyExamForm);
    },
    onError: () => toast.error('Gagal menyimpan ujian'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/exams/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['exams'] }); toast.success('Ujian dihapus'); },
    onError: () => toast.error('Gagal menghapus ujian'),
  });

  const publishMutation = useMutation({
    mutationFn: (id: string) => api.post(`/exams/${id}/publish`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exams'] });
      toast.success('Ujian dipublikasi');
    },
    onError: () => toast.error('Gagal mempublikasi ujian'),
  });

  const tokenMutation = useMutation({
    mutationFn: (id: string) => api.post(`/exams/${id}/token`),
    onSuccess: (res) => {
      setToken(res.data.data.token);
      toast.success('Token berhasil dibuat');
    },
    onError: () => toast.error('Gagal membuat token'),
  });

  const handleSave = () => {
    if (!form.title.trim()) return toast.error('Judul ujian harus diisi');
    if (!form.subject_id) return toast.error('Pilih mata pelajaran');
    if (!form.start_at || !form.end_at) return toast.error('Tentukan waktu mulai dan selesai');
    if (form.class_ids.length === 0) return toast.error('Pilih minimal satu kelas');
    if (form.question_ids.length === 0) return toast.error('Pilih minimal satu soal');

    const dto = {
      ...form,
      start_at: new Date(form.start_at).toISOString(),
      end_at: new Date(form.end_at).toISOString(),
    };
    saveMutation.mutate(dto);
  };

  const handleEdit = (exam: Exam) => {
    setEditingId(exam.id);
    // Fetch full exam detail to get existing question_ids
    api.get(`/exams/${exam.id}`).then((res) => {
      const full = res.data.data;
      setForm({
        title: full.title,
        description: full.description || '',
        subject_id: full.subject?.id || '',
        duration_minutes: full.duration_minutes,
        start_at: full.start_at ? full.start_at.slice(0, 16) : '',
        end_at: full.end_at ? full.end_at.slice(0, 16) : '',
        class_ids: full.exam_classes?.map((ec: any) => ec.class.id) || [],
        question_ids: full.exam_questions?.map((eq: any) => eq.question_id) || [],
        package_count: full.package_count || 1,
        randomize_questions: full.randomize_questions,
        randomize_answers: full.randomize_answers,
        warning_limit: full.warning_limit,
        auto_submit_enabled: full.auto_submit_enabled,
        fullscreen_required: full.fullscreen_required,
      });
      setModalOpen(true);
    }).catch(() => {
      // Fallback: open with empty question_ids
      setForm({
        title: exam.title,
        description: exam.description || '',
        subject_id: exam.subject?.id || '',
        duration_minutes: exam.duration_minutes,
        start_at: exam.start_at ? exam.start_at.slice(0, 16) : '',
        end_at: exam.end_at ? exam.end_at.slice(0, 16) : '',
        class_ids: exam.classes?.map((c) => c.class.id) || [],
        question_ids: [],
        package_count: exam.package_count || 1,
        randomize_questions: exam.randomize_questions,
        randomize_answers: exam.randomize_answers,
        warning_limit: exam.warning_limit,
        auto_submit_enabled: exam.auto_submit_enabled,
        fullscreen_required: exam.fullscreen_required,
      });
      setModalOpen(true);
    });
  };

  const exams = examsData?.data ?? [];
  const meta = examsData?.meta;

  console.log(examsData)

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
        <CardHeader>
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Cari ujian..." className="pl-9" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
            </div>
            <select className="h-10 rounded-md border border-input bg-background px-3 text-sm" value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}>
              <option value="">Semua Status</option>
              {Object.entries(statusLabels).map(([k, v]) => (<option key={k} value={k}>{v}</option>))}
            </select>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex h-48 items-center justify-center"><Spinner className="h-8 w-8" /></div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Judul</TableHead>
                    <TableHead>Mapel</TableHead>
                    <TableHead>Durasi</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Soal</TableHead>
                    <TableHead className="w-[160px]">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {exams.map((exam: Exam) => (
                    <TableRow key={exam.id}>
                      <TableCell>
                        <p className="font-medium">{exam.title}</p>
                        {exam.description && <p className="text-xs text-muted-foreground line-clamp-1">{exam.description}</p>}
                      </TableCell>
                      <TableCell className="text-sm">{exam.subject?.name || '-'}</TableCell>
                      <TableCell>
                        <span className="flex items-center gap-1 text-sm">
                          <Clock className="h-3 w-3" /> {exam.duration_minutes} menit
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusColors[exam.status] || 'default'}>
                          {statusLabels[exam.status] || exam.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">{exam._count?.exam_questions || 0}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" onClick={() => handleEdit(exam)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          {exam.status === 'DRAFT' && (
                            <Button variant="ghost" size="icon" onClick={() => publishMutation.mutate(exam.id)} title="Publish">
                              <Rocket className="h-4 w-4 text-green-600" />
                            </Button>
                          )}
                          {(exam.status === 'PUBLISHED' || exam.status === 'ONGOING') && (
                            <Button variant="ghost" size="icon" onClick={() => tokenMutation.mutate(exam.id)} title="Generate Token">
                              <Key className="h-4 w-4" />
                            </Button>
                          )}
                          <Button variant="ghost" size="icon" onClick={() => { if (confirm('Hapus ujian ini?')) deleteMutation.mutate(exam.id); }}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {exams.length === 0 && (
                    <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">Belum ada ujian</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>

              {meta && (
                <div className="mt-4 flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">Menampilkan {((page - 1) * 20) + 1}-{Math.min(page * 20, meta.total)} dari {meta.total}</p>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>Sebelumnya</Button>
                    <Button variant="outline" size="sm" disabled={page >= meta.total_pages} onClick={() => setPage(page + 1)}>Selanjutnya</Button>
                  </div>
                </div>
              )}
            </>
          )}
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
