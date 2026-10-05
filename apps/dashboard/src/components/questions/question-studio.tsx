'use client';

import React, { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { questionBankApi, academicApi } from '@/lib/api-service';
import { useRoleGuard } from '@/hooks/use-role-guard';
import { UserRole } from '@secure-cbt/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  ArrowLeft,
  Save,
  Plus,
  Trash2,
  Sigma,
  Bold,
  Italic,
  Eye,
  Edit3,
  X,
  Sparkles,
  HelpCircle,
  Smartphone,
} from 'lucide-react';
import { toast } from 'sonner';
import { EquationBuilderModal } from './equation-builder-modal';
import { ImageDropzone } from './image-dropzone';
import { QuestionPhonePreview } from './question-phone-preview';

export interface QuestionStudioData {
  id?: string;
  question_bank_id: string;
  type: string;
  content: string;
  image_url?: string | null;
  difficulty: string;
  explanation: string;
  options: { content: string; is_correct: boolean; image_url?: string | null }[];
  tags: string[];
}

export const questionTypes = [
  { value: 'MULTIPLE_CHOICE', label: 'Pilihan Ganda (Satu Jawaban Benar)' },
  { value: 'MULTI_SELECT', label: 'Pilihan Ganda Kompleks (Banyak Jawaban Benar)' },
  { value: 'TRUE_FALSE', label: 'Benar / Salah' },
  { value: 'ESSAY', label: 'Esai / Uraian Bebas' },
];

export const difficultyLevels = [
  { value: 'EASY', label: 'Mudah' },
  { value: 'MEDIUM', label: 'Sedang' },
  { value: 'HARD', label: 'Sulit' },
];

export const defaultQuestionStudioData: QuestionStudioData = {
  question_bank_id: '',
  type: 'MULTIPLE_CHOICE',
  content: '',
  image_url: null,
  difficulty: 'MEDIUM',
  explanation: '',
  options: [
    { content: '', is_correct: true, image_url: null },
    { content: '', is_correct: false, image_url: null },
    { content: '', is_correct: false, image_url: null },
    { content: '', is_correct: false, image_url: null },
    { content: '', is_correct: false, image_url: null },
  ],
  tags: [],
};

interface QuestionStudioProps {
  initialData?: QuestionStudioData;
  isEditing?: boolean;
}

export function QuestionStudio({
  initialData = defaultQuestionStudioData,
  isEditing = false,
}: QuestionStudioProps) {
  useRoleGuard([UserRole.ADMIN, UserRole.TEACHER]);
  const router = useRouter();
  const queryClient = useQueryClient();

  const [form, setForm] = useState<QuestionStudioData>(initialData);
  const [activeMobileTab, setActiveMobileTab] = useState<'editor' | 'preview'>('editor');
  const [equationModalOpen, setEquationModalOpen] = useState(false);
  const [equationTarget, setEquationTarget] = useState<'content' | 'explanation' | number>('content');
  const tagInputRef = useRef<HTMLInputElement>(null);
  const contentTextareaRef = useRef<HTMLTextAreaElement>(null);

  const { data: banks = [] } = useQuery({
    queryKey: ['question-banks'],
    queryFn: async () => {
      const { data } = await questionBankApi.getBanks();
      return (data.data || []) as any[];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (payload: any) => {
      if (isEditing && form.id) {
        return questionBankApi.updateQuestion(form.id, payload);
      }
      return questionBankApi.createQuestion(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['questions'] });
      queryClient.invalidateQueries({ queryKey: ['question-banks'] });
      toast.success(isEditing ? 'Soal berhasil diperbarui' : 'Soal berhasil dibuat');
      router.push('/dashboard/questions');
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Gagal menyimpan soal');
    },
  });

  const handleSave = () => {
    if (!form.question_bank_id) {
      toast.error('Pilih bank soal terlebih dahulu');
      return;
    }
    if (!form.content.trim()) {
      toast.error('Konten pertanyaan wajib diisi');
      return;
    }
    if (form.type !== 'ESSAY') {
      if (form.options.length < 2) {
        toast.error('Minimal 2 pilihan jawaban diperlukan');
        return;
      }
      const hasCorrect = form.options.some((o) => o.is_correct);
      if (!hasCorrect) {
        toast.error('Pilih minimal satu kunci jawaban yang benar');
        return;
      }
    }

    const payload = {
      question_bank_id: form.question_bank_id,
      type: form.type,
      content: form.content.trim(),
      image_url: form.image_url || null,
      difficulty: form.difficulty,
      explanation: form.explanation.trim() || null,
      options:
        form.type === 'ESSAY'
          ? []
          : form.options.map((opt) => ({
              content: opt.content.trim(),
              is_correct: opt.is_correct,
              image_url: opt.image_url || null,
            })),
      tags: form.tags,
    };

    saveMutation.mutate(payload);
  };

  const handleOpenEquationBuilder = (target: 'content' | 'explanation' | number) => {
    setEquationTarget(target);
    setEquationModalOpen(true);
  };

  const handleInsertEquation = (formula: string) => {
    if (equationTarget === 'content') {
      setForm((prev) => ({
        ...prev,
        content: prev.content ? `${prev.content} ${formula} ` : `${formula} `,
      }));
    } else if (equationTarget === 'explanation') {
      setForm((prev) => ({
        ...prev,
        explanation: prev.explanation ? `${prev.explanation} ${formula} ` : `${formula} `,
      }));
    } else if (typeof equationTarget === 'number') {
      const idx = equationTarget;
      setForm((prev) => {
        const nextOpts = [...prev.options];
        const current = nextOpts[idx]!;
        nextOpts[idx] = {
          ...current,
          content: current.content ? `${current.content} ${formula} ` : `${formula} `,
        };
        return { ...prev, options: nextOpts };
      });
    }
  };

  const addTag = (tag: string) => {
    const trimmed = tag.trim();
    if (trimmed && !form.tags.includes(trimmed)) {
      setForm({ ...form, tags: [...form.tags, trimmed] });
    }
  };

  const selectedBank = banks.find((b) => b.id === form.question_bank_id);
  const subjectName = selectedBank?.subject?.name || 'Mata Pelajaran';

  return (
    <div className="space-y-6 pb-16">
      {/* Studio Top Navigation Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push('/dashboard/questions')}
            className="rounded-full"
            title="Kembali ke Bank Soal"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
              {isEditing ? 'Edit Soal' : 'Studio Soal Baru'}
              <Badge variant="outline" className="text-xs font-semibold text-primary border-primary/30">
                Visual Math & Media
              </Badge>
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Tulis soal ujian lengkap dengan rumus matematika visual, gambar diagram, dan pilihan jawaban.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            onClick={() => router.push('/dashboard/questions')}
            disabled={saveMutation.isPending}
          >
            Batal
          </Button>
          <Button
            onClick={handleSave}
            disabled={saveMutation.isPending}
            className="gap-2 shadow-sm font-semibold"
          >
            <Save className="h-4 w-4" />
            {saveMutation.isPending ? 'Menyimpan...' : isEditing ? 'Perbarui Soal' : 'Simpan Soal'}
          </Button>
        </div>
      </div>

      {/* Mobile/Tablet Segmented View Switcher (< lg) */}
      <div className="lg:hidden flex justify-center">
        <div className="inline-flex rounded-xl bg-muted p-1 border border-border">
          <button
            type="button"
            onClick={() => setActiveMobileTab('editor')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
              activeMobileTab === 'editor'
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Edit3 className="h-3.5 w-3.5" /> Editor Soal
          </button>
          <button
            type="button"
            onClick={() => setActiveMobileTab('preview')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
              activeMobileTab === 'preview'
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Eye className="h-3.5 w-3.5" /> Pratinjau Siswa
          </button>
        </div>
      </div>

      {/* Main Studio Grid: Left Editor (7 cols) + Right Sticky Phone Preview (5 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* LEFT COLUMN: Editor Form */}
        <div className={`space-y-6 lg:col-span-7 ${activeMobileTab === 'preview' ? 'hidden lg:block' : ''}`}>
          {/* Card 1: Metadata Soal */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">1. Pengaturan & Bank Soal</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Bank Soal */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Bank Soal <span className="text-destructive">*</span></Label>
                  <Select
                    value={form.question_bank_id}
                    onValueChange={(val) => setForm({ ...form, question_bank_id: val })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih Bank Soal" />
                    </SelectTrigger>
                    <SelectContent>
                      {banks.map((b) => (
                        <SelectItem key={b.id} value={b.id}>
                          {b.title} ({b.subject?.name})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Tipe Soal */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Tipe Soal <span className="text-destructive">*</span></Label>
                  <Select
                    value={form.type}
                    onValueChange={(v) => {
                      let nextOpts = form.options;
                      if (v === 'TRUE_FALSE') {
                        nextOpts = [
                          { content: 'Benar', is_correct: true, image_url: null },
                          { content: 'Salah', is_correct: false, image_url: null },
                        ];
                      } else if (form.type === 'TRUE_FALSE' && v !== 'TRUE_FALSE') {
                        nextOpts = defaultQuestionStudioData.options;
                      }
                      setForm({ ...form, type: v, options: nextOpts });
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {questionTypes.map((t) => (
                        <SelectItem key={t.value} value={t.value}>
                          {t.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Tingkat Kesulitan */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Tingkat Kesulitan</Label>
                  <Select
                    value={form.difficulty}
                    onValueChange={(v) => setForm({ ...form, difficulty: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {difficultyLevels.map((d) => (
                        <SelectItem key={d.value} value={d.value}>
                          {d.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Tags */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Label / Topik Materi (Tag)</Label>
                  <div className="flex gap-2">
                    <Input
                      ref={tagInputRef}
                      placeholder="Contoh: Trigonometri, Kinematika"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          addTag((e.target as HTMLInputElement).value);
                          (e.target as HTMLInputElement).value = '';
                        }
                      }}
                      className="text-xs"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        if (tagInputRef.current) {
                          addTag(tagInputRef.current.value);
                          tagInputRef.current.value = '';
                        }
                      }}
                    >
                      Tambah
                    </Button>
                  </div>
                </div>
              </div>

              {/* Tag Chips */}
              {form.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {form.tags.map((tag, i) => (
                    <Badge key={i} variant="secondary" className="gap-1 text-xs py-0.5">
                      {tag}
                      <button
                        type="button"
                        onClick={() => setForm({ ...form, tags: form.tags.filter((_, idx) => idx !== i) })}
                        className="hover:text-destructive ml-0.5"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Card 2: Konten Pertanyaan & Gambar Stimulus */}
          <Card>
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <CardTitle className="text-base font-semibold">2. Teks Pertanyaan & Stimulus</CardTitle>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleOpenEquationBuilder('content')}
                  className="gap-1.5 text-xs text-primary border-primary/30 hover:bg-primary/5"
                >
                  <Sigma className="h-3.5 w-3.5 text-primary" />
                  + Rumus Matematika
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Textarea */}
              <div className="space-y-1.5">
                <textarea
                  ref={contentTextareaRef}
                  value={form.content}
                  onChange={(e) => setForm({ ...form, content: e.target.value })}
                  placeholder="Ketik teks pertanyaan di sini... Gunakan $rumus$ untuk rumus matematika inline atau $$rumus$$ untuk rumus blok."
                  rows={5}
                  className="w-full rounded-xl border border-input bg-background p-3.5 text-sm leading-relaxed outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all resize-y"
                />
              </div>

              {/* Stimulus Image Dropzone */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  Gambar Stimulus / Diagram (Opsional)
                </Label>
                <ImageDropzone
                  imageUrl={form.image_url}
                  onImageUploaded={(url) => setForm({ ...form, image_url: url })}
                  onImageRemoved={() => setForm({ ...form, image_url: null })}
                  label="Unggah Gambar Stimulus Soal (Diagram / Grafik / Bacaan)"
                />
              </div>
            </CardContent>
          </Card>

          {/* Card 3: Pilihan Jawaban */}
          {form.type !== 'ESSAY' && (
            <Card>
              <CardHeader className="pb-3 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-base font-semibold">3. Pilihan Jawaban</CardTitle>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {form.type === 'MULTI_SELECT'
                      ? 'Tandai kotak centang pada setiap opsi yang benar.'
                      : 'Pilih satu tombol radio untuk kunci jawaban yang benar.'}
                  </p>
                </div>
                {form.type !== 'TRUE_FALSE' && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={form.options.length >= 10}
                    onClick={() =>
                      setForm({
                        ...form,
                        options: [
                          ...form.options,
                          { content: '', is_correct: false, image_url: null },
                        ],
                      })
                    }
                    className="gap-1 text-xs"
                  >
                    <Plus className="h-3.5 w-3.5" /> Tambah Opsi
                  </Button>
                )}
              </CardHeader>
              <CardContent className="space-y-4">
                {form.options.map((opt, idx) => {
                  const label = String.fromCharCode(65 + idx);
                  const isCorrect = opt.is_correct;

                  return (
                    <div
                      key={idx}
                      className={`p-3.5 rounded-xl border transition-all space-y-3 ${
                        isCorrect
                          ? 'border-emerald-500/40 bg-emerald-500/5'
                          : 'border-border bg-card'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        {/* Option Alphabet Circle */}
                        <div
                          className={`h-7 w-7 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                            isCorrect
                              ? 'bg-emerald-600 text-white'
                              : 'bg-muted text-muted-foreground'
                          }`}
                        >
                          {label}
                        </div>

                        {/* Content Input */}
                        <Input
                          value={opt.content}
                          onChange={(e) => {
                            const next = [...form.options];
                            next[idx] = { ...next[idx]!, content: e.target.value };
                            setForm({ ...form, options: next });
                          }}
                          placeholder={`Pilihan ${label}`}
                          className="flex-1 text-sm font-medium"
                        />

                        {/* Formula Button for Option */}
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenEquationBuilder(idx)}
                          className="h-8 w-8 text-primary hover:bg-primary/10 shrink-0"
                          title="Sisipkan Rumus ke Opsi Ini"
                        >
                          <Sigma className="h-4 w-4" />
                        </Button>

                        {/* Correct Answer Checkbox/Radio */}
                        <div className="flex items-center gap-1.5 shrink-0 px-2 py-1 rounded-lg bg-background border border-border">
                          <Checkbox
                            id={`opt-correct-${idx}`}
                            checked={isCorrect}
                            onCheckedChange={() => {
                              const next = [...form.options];
                              if (form.type === 'MULTI_SELECT') {
                                next[idx] = { ...next[idx]!, is_correct: !isCorrect };
                              } else {
                                next.forEach((o, i) => {
                                  next[i] = { ...o, is_correct: i === idx };
                                });
                              }
                              setForm({ ...form, options: next });
                            }}
                          />
                          <label
                            htmlFor={`opt-correct-${idx}`}
                            className="text-xs font-semibold cursor-pointer select-none text-foreground"
                          >
                            Benar
                          </label>
                        </div>

                        {/* Delete Option (for multiple choice > 2 options) */}
                        {form.type !== 'TRUE_FALSE' && form.options.length > 2 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              const next = form.options.filter((_, i) => i !== idx);
                              setForm({ ...form, options: next });
                            }}
                            className="h-8 w-8 text-muted-foreground hover:text-destructive shrink-0"
                            title="Hapus opsi"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>

                      {/* Option Image Dropzone (Compact) */}
                      <div className="pl-10">
                        <ImageDropzone
                          imageUrl={opt.image_url}
                          onImageUploaded={(url) => {
                            const next = [...form.options];
                            next[idx] = { ...next[idx]!, image_url: url };
                            setForm({ ...form, options: next });
                          }}
                          onImageRemoved={() => {
                            const next = [...form.options];
                            next[idx] = { ...next[idx]!, image_url: null };
                            setForm({ ...form, options: next });
                          }}
                          label={`Unggah Gambar untuk Pilihan ${label}`}
                          compact
                        />
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          )}

          {/* Card 4: Pembahasan Jawaban (Opsional) */}
          <Card>
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base font-semibold">4. Pembahasan Jawaban (Opsional)</CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Ditampilkan kepada siswa pada riwayat nilai setelah ujian selesai.
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleOpenEquationBuilder('explanation')}
                className="gap-1.5 text-xs text-primary border-primary/30"
              >
                <Sigma className="h-3.5 w-3.5 text-primary" />
                + Rumus
              </Button>
            </CardHeader>
            <CardContent>
              <textarea
                value={form.explanation}
                onChange={(e) => setForm({ ...form, explanation: e.target.value })}
                placeholder="Tuliskan langkah-langkah penyelesaian atau pembahasan jawaban..."
                rows={3}
                className="w-full rounded-xl border border-input bg-background p-3.5 text-sm leading-relaxed outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all resize-y"
              />
            </CardContent>
          </Card>
        </div>

        {/* RIGHT COLUMN: Sticky Live Phone Simulation (5 cols on Desktop) */}
        <div
          className={`lg:col-span-5 sticky top-20 ${
            activeMobileTab === 'editor' ? 'hidden lg:block' : ''
          }`}
        >
          <div className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <Smartphone className="h-4 w-4 text-primary" /> Simulasi Layar Siswa (Live Preview)
              </span>
              <span className="text-[11px] text-muted-foreground">Responsif KaTeX 60fps</span>
            </div>

            <QuestionPhonePreview
              content={form.content}
              type={form.type}
              imageUrl={form.image_url}
              difficulty={form.difficulty}
              explanation={form.explanation}
              options={form.options}
              tags={form.tags}
              subjectName={subjectName}
            />
          </div>
        </div>
      </div>

      {/* Interactive Visual Equation Builder Modal */}
      <EquationBuilderModal
        open={equationModalOpen}
        onClose={() => setEquationModalOpen(false)}
        onInsert={handleInsertEquation}
      />
    </div>
  );
}
