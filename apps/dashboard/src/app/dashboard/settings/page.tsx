'use client';

import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { settingsApi, questionBankApi } from '@/lib/api-service';
import { formatDate } from '@/lib/utils';
import { useRoleGuard } from '@/hooks/use-role-guard';
import { ErrorBoundary } from '@/components/ui/error-boundary';
import { UserRole } from '@secure-cbt/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import {
  Save,
  RotateCcw,
  FileText,
  FileSpreadsheet,
  Upload,
  Download,
  Trash2,
} from 'lucide-react';

interface SettingsData {
  id: string; warning_limit: number; auto_submit_enabled: boolean;
  fullscreen_required: boolean; lock_task_mode: boolean;
  autosave_interval: number; session_timeout: number; passing_grade: number;
  template_docx_url?: string | null;
  template_xlsx_url?: string | null;
  created_at: string; updated_at: string;
}

function SettingsPageContent() {
  useRoleGuard([UserRole.ADMIN]);
  const queryClient = useQueryClient();

  const { data: settings, isLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: async () => { const { data } = await settingsApi.get(); return data.data as SettingsData; },
  });

  const updateMutation = useMutation({
    mutationFn: (dto: Record<string, unknown>) => settingsApi.update(dto),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['settings'] }); toast.success('Pengaturan disimpan'); },
    onError: () => toast.error('Gagal menyimpan pengaturan'),
  });

  const wordFileInputRef = useRef<HTMLInputElement>(null);
  const excelFileInputRef = useRef<HTMLInputElement>(null);

  const uploadWordMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      return settingsApi.uploadWordTemplate(formData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
      toast.success('Master template Word berhasil diunggah');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Gagal mengunggah template Word');
    },
  });

  const uploadExcelMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      return settingsApi.uploadExcelTemplate(formData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
      toast.success('Master template Excel berhasil diunggah');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Gagal mengunggah template Excel');
    },
  });

  const resetWordMutation = useMutation({
    mutationFn: () => settingsApi.resetWordTemplate(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
      toast.success('Template Word dikembalikan ke bawaan sistem');
    },
    onError: () => toast.error('Gagal mereset template Word'),
  });

  const resetExcelMutation = useMutation({
    mutationFn: () => settingsApi.resetExcelTemplate(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
      toast.success('Template Excel dikembalikan ke bawaan sistem');
    },
    onError: () => toast.error('Gagal mereset template Excel'),
  });

  const handleDownloadWord = async () => {
    try {
      const res = await questionBankApi.downloadTemplateWord();
      const blob = new Blob([res.data], {
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'Template_Soal_Assessia.docx';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch {
      toast.error('Gagal mengunduh template');
    }
  };

  const handleDownloadExcel = async () => {
    try {
      const res = await questionBankApi.downloadTemplateExcel();
      const blob = new Blob([res.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'Template_Soal_Assessia.xlsx';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch {
      toast.error('Gagal mengunduh template');
    }
  };

  if (isLoading || !settings) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-40 mb-2" />
            <Skeleton className="h-4 w-72" />
          </CardHeader>
          <CardContent className="space-y-4">
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="space-y-1 flex-1">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-56" />
                </div>
                <Skeleton className="h-9 w-20" />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Pengaturan</h1>
          <p className="text-muted-foreground">Konfigurasi sistem dan ujian</p>
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle>Keamanan Ujian</CardTitle><CardDescription>Konfigurasi batas peringatan, fullscreen, dan auto-submit</CardDescription></CardHeader>
        <CardContent className="space-y-4">
          <SettingRow label="Batas Peringatan" description="Jumlah maksimal pelanggaran sebelum ujian otomatis dikumpulkan" value={settings.warning_limit} type="number" min={1} max={10} onSave={(val) => updateMutation.mutate({ warning_limit: Number(val) })} disabled={updateMutation.isPending} />
          <SettingRow label="Interval Auto-Save (detik)" description="Seberapa sering jawaban siswa disimpan otomatis" value={settings.autosave_interval} type="number" min={1} max={60} onSave={(val) => updateMutation.mutate({ autosave_interval: Number(val) })} disabled={updateMutation.isPending} />
          <SettingRow label="Timeout Sesi (menit)" description="Waktu maksimal idle sebelum sesi dianggap expired" value={settings.session_timeout} type="number" min={5} max={120} onSave={(val) => updateMutation.mutate({ session_timeout: Number(val) })} disabled={updateMutation.isPending} />
          <SettingRow label="Kriteria Ketuntasan Minimal (KKM / Passing Grade)" description="Nilai minimal standar kelulusan ujian untuk siswa" value={settings.passing_grade} type="number" min={0} max={100} onSave={(val) => updateMutation.mutate({ passing_grade: Number(val) })} disabled={updateMutation.isPending} />
          <Separator className="my-2" />
          <SettingToggle label="Auto Submit" description="Kumpulkan ujian otomatis saat batas peringatan terlampaui" value={settings.auto_submit_enabled} onSave={(val) => updateMutation.mutate({ auto_submit_enabled: val })} disabled={updateMutation.isPending} />
          <SettingToggle label="Wajib Fullscreen" description="Siswa harus dalam mode layar penuh selama ujian" value={settings.fullscreen_required} onSave={(val) => updateMutation.mutate({ fullscreen_required: val })} disabled={updateMutation.isPending} />
          <SettingToggle label="Lock Task Mode" description="Kunci perangkat dalam mode ujian (Android kiosk)" value={settings.lock_task_mode} onSave={(val) => updateMutation.mutate({ lock_task_mode: val })} disabled={updateMutation.isPending} />
        </CardContent>
      </Card>

      {/* Master Template Manager Card */}
      <Card>
        <CardHeader>
          <CardTitle>Master Template Soal (Word & Excel)</CardTitle>
          <CardDescription>
            Atur master template resmi sekolah dengan lebar kolom dan format baku agar seluruh guru mengunduh template yang seragam saat mengimpor soal.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Word Master Template */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl border border-slate-200 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-900/40">
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 dark:bg-blue-950/40 dark:text-blue-400">
                <FileText className="h-5 w-5" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    Master Template Word (.docx)
                  </h4>
                  <Badge variant={settings.template_docx_url ? 'default' : 'secondary'} className="text-[10px]">
                    {settings.template_docx_url ? 'Template Kustom Aktif' : 'Bawaan Sistem'}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  Format tabel kisi-kisi per butir soal. Guru dapat langsung menempelkan gambar diagram pada tabel.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <input
                ref={wordFileInputRef}
                type="file"
                accept=".docx"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    uploadWordMutation.mutate(e.target.files[0]);
                  }
                }}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleDownloadWord}
                className="gap-1.5 text-xs"
              >
                <Download className="h-3.5 w-3.5" /> Unduh
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => wordFileInputRef.current?.click()}
                disabled={uploadWordMutation.isPending}
                className="gap-1.5 text-xs bg-white dark:bg-slate-800"
              >
                <Upload className="h-3.5 w-3.5" />
                {uploadWordMutation.isPending ? 'Mengunggah...' : 'Ganti Template'}
              </Button>
              {settings.template_docx_url && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => resetWordMutation.mutate()}
                  disabled={resetWordMutation.isPending}
                  className="text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                  title="Kembalikan ke template bawaan"
                >
                  <RotateCcw className="h-3.5 w-3.5" /> Reset
                </Button>
              )}
            </div>
          </div>

          {/* Excel Master Template */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl border border-slate-200 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-900/40">
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 dark:bg-emerald-950/40 dark:text-emerald-400">
                <FileSpreadsheet className="h-5 w-5" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    Master Template Excel (.xlsx)
                  </h4>
                  <Badge variant={settings.template_xlsx_url ? 'default' : 'secondary'} className="text-[10px]">
                    {settings.template_xlsx_url ? 'Template Kustom Aktif' : 'Bawaan Sistem'}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  Format spreadsheet 8 kolom (Pertanyaan, Opsi A-E, Kunci, Pembahasan).
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <input
                ref={excelFileInputRef}
                type="file"
                accept=".xlsx,.xls"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    uploadExcelMutation.mutate(e.target.files[0]);
                  }
                }}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleDownloadExcel}
                className="gap-1.5 text-xs"
              >
                <Download className="h-3.5 w-3.5" /> Unduh
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => excelFileInputRef.current?.click()}
                disabled={uploadExcelMutation.isPending}
                className="gap-1.5 text-xs bg-white dark:bg-slate-800"
              >
                <Upload className="h-3.5 w-3.5" />
                {uploadExcelMutation.isPending ? 'Mengunggah...' : 'Ganti Template'}
              </Button>
              {settings.template_xlsx_url && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => resetExcelMutation.mutate()}
                  disabled={resetExcelMutation.isPending}
                  className="text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                  title="Kembalikan ke template bawaan"
                >
                  <RotateCcw className="h-3.5 w-3.5" /> Reset
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground text-right">Terakhir diperbarui: {formatDate(settings.updated_at)}</p>
    </div>
  );
}

function SettingRow({ label, description, value, type, min, max, onSave, disabled }: {
  label: string; description: string; value: number; type: 'number'; min?: number; max?: number;
  onSave: (value: string) => void; disabled: boolean;
}) {
  const [current, setCurrent] = useState(String(value));
  useEffect(() => { setCurrent(String(value)); }, [value]);
  const changed = String(value) !== current;

  return (
    <div className="flex items-end gap-4">
      <div className="flex-1 space-y-1">
        <Label>{label}</Label>
        <p className="text-xs text-muted-foreground">{description}</p>
        <Input type={type} min={min} max={max} value={current} onChange={(e) => setCurrent(e.target.value)} />
      </div>
      <div className="flex gap-2">
        {changed && <Button variant="ghost" size="icon" onClick={() => setCurrent(String(value))} title="Reset"><RotateCcw className="h-4 w-4" /></Button>}
        <Button variant="outline" size="sm" onClick={() => { if (changed) onSave(current); }} disabled={disabled || !changed}><Save className="mr-1 h-3 w-3" />Simpan</Button>
      </div>
    </div>
  );
}

function SettingToggle({ label, description, value, onSave, disabled }: {
  label: string; description: string; value: boolean; onSave: (value: boolean) => void; disabled: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <div className="space-y-1">
        <Label>{label}</Label>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <div className="flex items-center gap-3">
        <Switch checked={value} onCheckedChange={onSave} disabled={disabled} />
        <span className="text-sm text-muted-foreground min-w-[4rem]">{value ? 'Aktif' : 'Nonaktif'}</span>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  return <ErrorBoundary><SettingsPageContent /></ErrorBoundary>;
}
