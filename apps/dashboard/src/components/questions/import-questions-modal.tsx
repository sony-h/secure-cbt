'use client';

import { useState, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { questionBankApi } from '@/lib/api-service';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { MathRenderer } from '@/components/ui/math-renderer';
import { toast } from 'sonner';
import {
  FileText,
  FileSpreadsheet,
  UploadCloud,
  CheckCircle2,
  AlertCircle,
  Download,
  ArrowRight,
  ArrowLeft,
  Check,
  X,
  FileUp,
} from 'lucide-react';
import { PreviewImportQuestionsResponse, ImportQuestionItemInput, QuestionType } from '@secure-cbt/shared';

interface QuestionBankOption {
  id: string;
  title: string;
}

interface ImportQuestionsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  banks: QuestionBankOption[];
  defaultBankId?: string;
  onSuccess?: () => void;
}

export function ImportQuestionsModal({
  open,
  onOpenChange,
  banks,
  defaultBankId,
  onSuccess,
}: ImportQuestionsModalProps) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedBankId, setSelectedBankId] = useState<string>(
    defaultBankId || (banks.length > 0 ? banks[0]?.id || '' : ''),
  );
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState<boolean>(false);
  const [step, setStep] = useState<'upload' | 'preview'>('upload');
  const [previewData, setPreviewData] = useState<PreviewImportQuestionsResponse | null>(null);
  const [downloadingFormat, setDownloadingFormat] = useState<'word' | 'excel' | null>(null);

  const resetState = () => {
    setSelectedFile(null);
    setPreviewData(null);
    setStep('upload');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleClose = () => {
    resetState();
    onOpenChange(false);
  };

  // 1. Download Master Template Handlers
  const handleDownloadTemplate = async (format: 'word' | 'excel') => {
    try {
      setDownloadingFormat(format);
      const res =
        format === 'word'
          ? await questionBankApi.downloadTemplateWord()
          : await questionBankApi.downloadTemplateExcel();

      const blob = new Blob([res.data], {
        type:
          format === 'word'
            ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
            : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download =
        format === 'word'
          ? 'Template_Soal_Assessia.docx'
          : 'Template_Soal_Assessia.xlsx';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast.success(`Template ${format === 'word' ? 'Word' : 'Excel'} berhasil diunduh`);
    } catch {
      toast.error('Gagal mengunduh file template');
    } finally {
      setDownloadingFormat(null);
    }
  };

  // 2. Preview Mutation
  const previewMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      if (selectedBankId) {
        formData.append('bank_id', selectedBankId);
      }
      const res = await questionBankApi.previewImport(formData);
      return res.data.data as PreviewImportQuestionsResponse;
    },
    onSuccess: (data) => {
      setPreviewData(data);
      setStep('preview');
      toast.success(`Berhasil menganalisis ${data.total_questions} butir soal`);
    },
    onError: (err: any) => {
      const msg = err.response?.data?.message || 'Gagal menganalisis file dokumen';
      toast.error(msg);
    },
  });

  // 3. Confirm Mutation
  const confirmMutation = useMutation({
    mutationFn: async () => {
      if (!selectedBankId || !previewData) return;
      const validQuestions = previewData.questions
        .filter((q) => q.valid)
        .map((q) => ({
          content: q.content,
          image_url: q.image_url,
          type: q.type,
          difficulty: q.difficulty,
          explanation: q.explanation,
          options: q.options,
        }));

      return questionBankApi.confirmImport({
        bank_id: selectedBankId,
        questions: validQuestions,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['questions'] });
      queryClient.invalidateQueries({ queryKey: ['question-banks'] });
      toast.success('Soal berhasil disimpan ke bank soal!');
      handleClose();
      onSuccess?.();
    },
    onError: (err: any) => {
      const msg = err.response?.data?.message || 'Gagal menyimpan soal ke bank';
      toast.error(msg);
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      const name = file.name.toLowerCase();
      if (
        name.endsWith('.docx') ||
        name.endsWith('.xlsx') ||
        name.endsWith('.xls')
      ) {
        setSelectedFile(file);
      } else {
        toast.error('Harap unggah file Word (.docx) atau Excel (.xlsx)');
      }
    }
  };

  const handleStartAnalysis = () => {
    if (!selectedFile) {
      toast.error('Pilih file terlebih dahulu');
      return;
    }
    if (!selectedBankId) {
      toast.error('Pilih Bank Soal tujuan terlebih dahulu');
      return;
    }
    previewMutation.mutate(selectedFile);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-3xl lg:max-w-4xl max-h-[90vh] flex flex-col p-0 overflow-hidden">
        {/* Header */}
        <DialogHeader className="p-6 pb-4 border-b">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold">
              <FileUp className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-xl">Import Soal Massal</DialogTitle>
              <DialogDescription className="text-xs">
                Unggah dokumen Microsoft Word (.docx) atau Excel (.xlsx) untuk menambahkan butir soal sekaligus.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {step === 'upload' ? (
            <div className="space-y-6">
              {/* Destination Bank Selector */}
              <div className="space-y-2">
                <Label className="text-sm font-semibold">Bank Soal Tujuan</Label>
                <select
                  value={selectedBankId}
                  onChange={(e) => setSelectedBankId(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  <option value="" disabled>
                    -- Pilih Bank Soal --
                  </option>
                  {banks.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.title}
                    </option>
                  ))}
                </select>
              </div>

              {/* Download Official Templates Banner */}
              <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 space-y-3 dark:border-slate-800 dark:bg-slate-900/50">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                      Template Resmi Sekolah
                    </h4>
                    <p className="text-xs text-muted-foreground">
                      Gunakan format baku agar sistem mengenali butir pertanyaan, opsi, dan kunci jawaban tanpa error.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => handleDownloadTemplate('word')}
                    disabled={downloadingFormat !== null}
                    className="h-11 justify-start gap-3 bg-white hover:bg-slate-50 border-slate-200 text-slate-800 shadow-sm dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200"
                  >
                    {downloadingFormat === 'word' ? (
                      <Spinner className="h-4 w-4" />
                    ) : (
                      <div className="h-7 w-7 rounded bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                        <FileText className="h-4 w-4" />
                      </div>
                    )}
                    <div className="text-left">
                      <div className="text-xs font-semibold">Unduh Template Word (.docx)</div>
                      <div className="text-[10px] text-muted-foreground">Format tabel kisi-kisi standar</div>
                    </div>
                    <Download className="h-3.5 w-3.5 ml-auto text-muted-foreground" />
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => handleDownloadTemplate('excel')}
                    disabled={downloadingFormat !== null}
                    className="h-11 justify-start gap-3 bg-white hover:bg-slate-50 border-slate-200 text-slate-800 shadow-sm dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200"
                  >
                    {downloadingFormat === 'excel' ? (
                      <Spinner className="h-4 w-4" />
                    ) : (
                      <div className="h-7 w-7 rounded bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                        <FileSpreadsheet className="h-4 w-4" />
                      </div>
                    )}
                    <div className="text-left">
                      <div className="text-xs font-semibold">Unduh Template Excel (.xlsx)</div>
                      <div className="text-[10px] text-muted-foreground">Format 8 kolom terstruktur</div>
                    </div>
                    <Download className="h-3.5 w-3.5 ml-auto text-muted-foreground" />
                  </Button>
                </div>
              </div>

              {/* Upload Dropzone */}
              <div className="space-y-2">
                <Label className="text-sm font-semibold">File Soal</Label>
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragActive(true);
                  }}
                  onDragLeave={() => setDragActive(false)}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-150 flex flex-col items-center justify-center gap-3 ${
                    dragActive
                      ? 'border-primary bg-primary/5 scale-[0.99]'
                      : 'border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50/50 dark:border-slate-800 dark:bg-slate-900/40'
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".docx,.xlsx,.xls"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <div className="h-12 w-12 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                    <UploadCloud className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
                      Klik untuk memilih file atau seret file ke sini
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Mendukung format Microsoft Word (.docx) atau Excel (.xlsx) maks. 15MB
                    </p>
                  </div>

                  {selectedFile && (
                    <div className="mt-2 inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-xs font-semibold">
                      {selectedFile.name.endsWith('.docx') ? (
                        <FileText className="h-4 w-4" />
                      ) : (
                        <FileSpreadsheet className="h-4 w-4" />
                      )}
                      <span>{selectedFile.name}</span>
                      <span className="text-[10px] opacity-75">
                        ({(selectedFile.size / 1024).toFixed(1)} KB)
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            /* Step 2: Preview & Validation Screen */
            <div className="space-y-4">
              {/* Telemetry Summary Cards */}
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3 text-center dark:border-slate-800 dark:bg-slate-900/50">
                  <div className="text-xl font-bold tabular-nums">
                    {previewData?.total_questions || 0}
                  </div>
                  <div className="text-[11px] text-muted-foreground font-medium">Total Terdeteksi</div>
                </div>

                <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-3 text-center dark:border-emerald-900/40 dark:bg-emerald-950/20">
                  <div className="text-xl font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
                    {previewData?.valid_count || 0}
                  </div>
                  <div className="text-[11px] text-emerald-700 dark:text-emerald-300 font-medium flex items-center justify-center gap-1">
                    <CheckCircle2 className="h-3 w-3" /> Siap Diimpor
                  </div>
                </div>

                <div className="rounded-xl border border-rose-200 bg-rose-50/50 p-3 text-center dark:border-rose-900/40 dark:bg-rose-950/20">
                  <div className="text-xl font-bold tabular-nums text-rose-600 dark:text-rose-400">
                    {previewData?.invalid_count || 0}
                  </div>
                  <div className="text-[11px] text-rose-700 dark:text-rose-300 font-medium flex items-center justify-center gap-1">
                    <AlertCircle className="h-3 w-3" /> Butuh Perbaikan
                  </div>
                </div>
              </div>

              {/* Questions List Preview */}
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground px-1">
                  <span>Daftar Butir Soal Terdeteksi</span>
                  <span>
                    Menampilkan {previewData?.questions.length || 0} soal
                  </span>
                </div>

                <div className="space-y-3 max-h-[46vh] overflow-y-auto pr-1">
                  {previewData?.questions.map((q: ImportQuestionItemInput, idx: number) => (
                    <QuestionImportPreviewItem key={idx} question={q} index={idx} />
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <DialogFooter className="p-4 border-t bg-slate-50/50 dark:bg-slate-900/40 flex items-center justify-between sm:justify-between">
          {step === 'upload' ? (
            <>
              <Button type="button" variant="outline" onClick={handleClose}>
                Batal
              </Button>
              <Button
                type="button"
                onClick={handleStartAnalysis}
                disabled={!selectedFile || !selectedBankId || previewMutation.isPending}
                className="gap-2"
              >
                {previewMutation.isPending ? (
                  <>
                    <Spinner className="h-4 w-4" /> Menganalisis File...
                  </>
                ) : (
                  <>
                    Analisis & Pratinjau <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </Button>
            </>
          ) : (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep('upload')}
                disabled={confirmMutation.isPending}
                className="gap-1.5"
              >
                <ArrowLeft className="h-4 w-4" /> Ganti File
              </Button>

              <div className="flex items-center gap-2">
                <Button type="button" variant="ghost" onClick={handleClose}>
                  Batal
                </Button>
                <Button
                  type="button"
                  onClick={() => confirmMutation.mutate()}
                  disabled={
                    !previewData ||
                    previewData.valid_count === 0 ||
                    confirmMutation.isPending
                  }
                  className="gap-2 bg-primary"
                >
                  {confirmMutation.isPending ? (
                    <>
                      <Spinner className="h-4 w-4" /> Menyimpan Soal...
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4" /> Simpan ({previewData?.valid_count || 0}) Soal ke Bank
                    </>
                  )}
                </Button>
              </div>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function QuestionImportPreviewItem({
  question: q,
  index,
}: {
  question: ImportQuestionItemInput;
  index: number;
}) {
  const letters = ['A', 'B', 'C', 'D', 'E'];

  const typeConfig: Record<QuestionType, { label: string; className: string }> = {
    [QuestionType.MULTIPLE_CHOICE]: {
      label: 'Pilihan Ganda',
      className:
        'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300 border-blue-200 dark:border-blue-800',
    },
    [QuestionType.MULTI_SELECT]: {
      label: 'PG Kompleks',
      className:
        'bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300 border-purple-200 dark:border-purple-800',
    },
    [QuestionType.TRUE_FALSE]: {
      label: 'Benar / Salah',
      className:
        'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300 border-amber-200 dark:border-amber-800',
    },
    [QuestionType.SHORT_ANSWER]: {
      label: 'Isian Singkat',
      className:
        'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/50 dark:text-cyan-300 border-cyan-200 dark:border-cyan-800',
    },
    [QuestionType.MATCHING]: {
      label: 'Menjodohkan',
      className:
        'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/50 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800',
    },
    [QuestionType.ESSAY]: {
      label: 'Esai / Uraian',
      className:
        'bg-rose-100 text-rose-800 dark:bg-rose-900/50 dark:text-rose-300 border-rose-200 dark:border-rose-800',
    },
  };

  const badgeConfig = typeConfig[q.type] || {
    label: q.type,
    className: 'bg-slate-100 text-slate-800',
  };

  return (
    <div
      className={`rounded-xl border p-4 transition-all duration-150 ${
        q.valid
          ? 'border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/70'
          : 'border-rose-200 bg-rose-50/30 dark:border-rose-900/50 dark:bg-rose-950/20'
      }`}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2 pb-2 border-b border-slate-100 dark:border-slate-800/60 mb-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="h-6 w-6 rounded-md bg-slate-100 dark:bg-slate-800 text-xs font-bold flex items-center justify-center text-slate-700 dark:text-slate-300">
            {q.number || index + 1}
          </span>
          <Badge variant="outline" className={`text-[10px] h-5 font-semibold ${badgeConfig.className}`}>
            {badgeConfig.label}
          </Badge>
          <Badge variant={q.valid ? 'secondary' : 'destructive'} className="text-[10px] h-5">
            {q.valid ? 'Valid' : 'Gagal Validasi'}
          </Badge>
        </div>

        {!q.valid && q.error && (
          <span className="text-xs text-rose-600 dark:text-rose-400 font-medium flex items-center gap-1">
            <AlertCircle className="h-3.5 w-3.5" /> {q.error}
          </span>
        )}
      </div>

      {/* Question Content */}
      <div className="text-sm font-medium text-slate-900 dark:text-slate-100 mb-3">
        <MathRenderer content={q.content} />
        {q.image_url && (
          <div className="mt-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={q.image_url}
              alt="Diagram Soal"
              className="max-h-36 rounded-lg border object-contain"
            />
          </div>
        )}
      </div>

      {/* Options Body based on QuestionType */}
      {q.type === QuestionType.ESSAY ? (
        <div className="p-3 rounded-lg border border-dashed border-rose-200 bg-rose-50/40 dark:border-rose-900/50 dark:bg-rose-950/20 text-xs text-rose-900 dark:text-rose-300 flex items-center gap-2">
          <FileText className="h-4 w-4 shrink-0 text-rose-600" />
          <span>Soal bertipe esai / uraian bebas dinilai secara manual oleh guru atau via rubrik penilaian.</span>
        </div>
      ) : q.type === QuestionType.SHORT_ANSWER ? (
        <div className="p-3 rounded-lg border border-cyan-200 bg-cyan-50/40 dark:border-cyan-900/50 dark:bg-cyan-950/20 text-xs text-cyan-900 dark:text-cyan-200 space-y-1.5">
          <div className="font-semibold text-cyan-800 dark:text-cyan-300 flex items-center gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5 text-cyan-600" />
            <span>Kunci Jawaban yang Diterima:</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {q.options.map((opt, oIdx) => (
              <Badge
                key={oIdx}
                variant="outline"
                className="bg-white dark:bg-slate-900 border-cyan-300 text-cyan-950 dark:text-cyan-100 text-xs py-0.5 px-2"
              >
                {opt.content}
              </Badge>
            ))}
          </div>
        </div>
      ) : q.type === QuestionType.MATCHING ? (
        <div className="space-y-2">
          <div className="text-xs font-semibold text-indigo-700 dark:text-indigo-400 flex items-center gap-1">
            <span>Pasangan Jawaban:</span>
          </div>
          <div className="grid grid-cols-1 gap-2">
            {q.options.map((opt, oIdx) => {
              let left = opt.content;
              let right = '';
              try {
                const parsed = JSON.parse(opt.content);
                left = parsed.left || opt.content;
                right = parsed.right || '';
              } catch {
                if (opt.content.includes('->')) {
                  const parts = opt.content.split('->');
                  left = (parts[0] || '').trim();
                  right = (parts[1] || '').trim();
                }
              }
              return (
                <div
                  key={oIdx}
                  className="flex items-center gap-2 p-2.5 rounded-lg border border-indigo-100 bg-indigo-50/50 dark:border-indigo-900/50 dark:bg-indigo-950/30 text-xs"
                >
                  <span className="h-5 w-5 rounded bg-indigo-200 dark:bg-indigo-800 text-indigo-800 dark:text-indigo-200 flex items-center justify-center font-bold text-[10px] shrink-0">
                    {oIdx + 1}
                  </span>
                  <div className="flex-1 font-medium text-slate-800 dark:text-slate-200 truncate">
                    <MathRenderer content={left} />
                  </div>
                  <ArrowRight className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
                  <div className="flex-1 font-semibold text-indigo-900 dark:text-indigo-300 truncate">
                    <MathRenderer content={right} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* MULTIPLE_CHOICE, MULTI_SELECT, TRUE_FALSE */
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {q.options.map((opt, oIdx) => (
            <div
              key={oIdx}
              className={`flex items-start gap-2 p-2 rounded-lg text-xs transition-colors ${
                opt.is_correct
                  ? 'bg-emerald-50 border border-emerald-200 text-emerald-900 font-medium dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-200'
                  : 'bg-slate-50 border border-slate-100 text-slate-700 dark:bg-slate-800/50 dark:border-slate-800 dark:text-slate-300'
              }`}
            >
              <span
                className={`h-5 w-5 rounded flex items-center justify-center font-bold text-[10px] shrink-0 ${
                  opt.is_correct
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200'
                }`}
              >
                {q.type === QuestionType.TRUE_FALSE
                  ? opt.content.startsWith('B')
                    ? 'B'
                    : 'S'
                  : letters[oIdx] || opt.order}
              </span>
              <div className="flex-1 truncate">
                <MathRenderer content={opt.content} />
              </div>
              {opt.is_correct && (
                <Badge className="bg-emerald-600 text-white text-[9px] h-4 px-1 shrink-0 ml-auto">
                  KUNCI
                </Badge>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Explanation */}
      {q.explanation && (
        <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px] text-muted-foreground">
          <span className="font-semibold text-slate-700 dark:text-slate-300">
            Pembahasan:{' '}
          </span>
          <MathRenderer content={q.explanation} />
        </div>
      )}
    </div>
  );
}
