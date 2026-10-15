'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import {
  Printer,
  Settings,
  FileText,
  Plus,
  Trash2,
  RotateCcw,
  Eye,
  School,
  X,
} from 'lucide-react';
import { toast } from 'sonner';

export interface FormalReportSigner {
  id: string;
  role: string;
  name: string;
  nip?: string;
}

export interface FormalReportConfig {
  assessmentTitle: string;
  schoolName: string;
  academicYear: string;
  city: string;
  province: string;
  regency: string;
  reportDate?: string;
  subjectLabel?: string;
  signers: FormalReportSigner[];
}

export const FORMAL_REPORT_STORAGE_KEY = 'cbt_formal_report_config';

export const DEFAULT_FORMAL_REPORT_CONFIG: FormalReportConfig = {
  assessmentTitle: 'Assessment Sumatif Tengah Semester Genap',
  schoolName: 'SMK INFORMATIKA WONOSOBO',
  academicYear: '2025 - 2026',
  city: 'Wonosobo',
  province: 'Jawa Tengah',
  regency: 'Wonosobo',
  reportDate: '',
  subjectLabel: '',
  signers: [
    {
      id: 'signer-1',
      role: 'Admin',
      name: 'Sony Hartono, S.Kom',
      nip: '',
    },
    {
      id: 'signer-2',
      role: 'Kepala Sekolah',
      name: 'Dadik Wahyu Ratmoko, S.Si',
      nip: '',
    },
  ],
};

export interface GradeResultItem {
  session_id: string;
  student: {
    nis?: string;
    username?: string;
    full_name: string;
    class_name?: string;
  };
  total_score: number;
  correct_count?: number;
  wrong_count?: number;
  essay_score?: number | null;
  total_questions?: number;
  status?: string;
}

export interface FormalReportExam {
  id?: string;
  title: string;
  subject?: {
    name: string;
    code?: string;
  };
}

export interface FormalReportModalProps {
  open: boolean;
  onClose: () => void;
  exam?: FormalReportExam | null;
  className?: string;
  results?: GradeResultItem[];
  settings?: any;
}

export function calculateReportSummary(results?: Array<{ total_score: number }>) {
  if (!results || results.length === 0) {
    return {
      average: '0',
      min: '0',
      max: '0',
      count: 0,
      numericAverage: 0,
      numericMin: 0,
      numericMax: 0,
    };
  }

  const scores = results.map((r) =>
    typeof r.total_score === 'number' && !isNaN(r.total_score) ? r.total_score : 0,
  );
  const sum = scores.reduce((acc, s) => acc + s, 0);
  const rawAvg = sum / scores.length;
  const rawMin = Math.min(...scores);
  const rawMax = Math.max(...scores);

  const formatNum = (n: number) => {
    if (Number.isInteger(n)) return n.toString();
    return Number(n.toFixed(2)).toString();
  };

  return {
    average: formatNum(rawAvg),
    min: formatNum(rawMin),
    max: formatNum(rawMax),
    count: scores.length,
    numericAverage: Number(rawAvg.toFixed(2)),
    numericMin: rawMin,
    numericMax: rawMax,
  };
}

function formatScoreValue(score?: number | null): string {
  if (score === null || score === undefined || isNaN(score)) return '0';
  if (Number.isInteger(score)) return score.toString();
  return Number(score.toFixed(1)).toString();
}

interface FormalReportDocumentContentProps {
  config: FormalReportConfig;
  exam?: FormalReportExam | null;
  className?: string;
  results?: GradeResultItem[];
  summary: ReturnType<typeof calculateReportSummary>;
  displayDate: string;
  subjectLabel: string;
}

export function FormalReportDocumentContent({
  config,
  exam,
  className,
  results = [],
  summary,
  displayDate,
  subjectLabel,
}: FormalReportDocumentContentProps) {
  return (
    <div className="formal-report-paper text-black font-sans text-[12px] leading-tight select-text">
      {/* KOP / HEADER */}
      <div className="relative flex items-center justify-between pb-2">
        <div className="w-16 h-16 shrink-0 flex items-center justify-center">
          <img
            src="/logo-only-light.png"
            alt="Logo Sekolah"
            className="w-16 h-16 object-contain"
            onError={(e) => {
              (e.target as HTMLElement).style.display = 'none';
            }}
          />
        </div>
        <div className="flex-1 text-center px-2">
          <div className="text-[15px] font-medium uppercase tracking-wide text-black leading-tight">
            {config.assessmentTitle || 'ASSESSMENT SUMATIF'}
          </div>
          <div className="text-[20px] font-bold uppercase tracking-wider text-black my-0.5 leading-snug">
            {config.schoolName || 'SMK INFORMATIKA WONOSOBO'}
          </div>
          <div className="text-[13px] font-medium text-black leading-tight">
            Tahun Ajaran {config.academicYear || '2025 - 2026'}
          </div>
        </div>
        {/* Dummy spacer to balance logo */}
        <div className="w-16 h-16 shrink-0" aria-hidden="true" />
      </div>

      {/* DIVIDER LINE */}
      <div className="border-b-[2.5px] border-black my-2.5" />

      {/* METADATA GRID */}
      <div className="grid grid-cols-2 gap-x-8 gap-y-1 text-[12px] text-black mb-3">
        <div className="space-y-0.5">
          <div className="flex">
            <span className="w-32 font-normal">Provinsi</span>
            <span className="mr-2">:</span>
            <span className="font-normal">{config.province || 'Jawa Tengah'}</span>
          </div>
          <div className="flex">
            <span className="w-32 font-normal">Kota / Kab.</span>
            <span className="mr-2">:</span>
            <span className="font-normal">{config.regency || config.city || 'Wonosobo'}</span>
          </div>
          <div className="flex">
            <span className="w-32 font-normal">Sekolah / Rombel</span>
            <span className="mr-2">:</span>
            <span className="font-medium">{className || config.schoolName}</span>
          </div>
        </div>
        <div className="space-y-0.5">
          <div className="flex">
            <span className="w-32 font-normal">Mata Pelajaran</span>
            <span className="mr-2">:</span>
            <span className="font-normal">{exam?.subject?.name || subjectLabel || '—'}</span>
          </div>
          <div className="flex">
            <span className="w-32 font-normal">Tanggal</span>
            <span className="mr-2">:</span>
            <span className="font-normal">{displayDate}</span>
          </div>
        </div>
      </div>

      {/* SCORE TABLE */}
      <table className="formal-report-table w-full border-collapse border border-black text-[12px] text-black mb-4">
        <thead>
          <tr className="bg-transparent">
            <th
              rowSpan={2}
              className="border border-black px-2 py-1 text-center font-bold w-12 align-middle"
            >
              NO
            </th>
            <th
              rowSpan={2}
              className="border border-black px-2 py-1 text-center font-bold w-24 align-middle"
            >
              USERNAME
            </th>
            <th
              rowSpan={2}
              className="border border-black px-3 py-1 text-center font-bold align-middle"
            >
              NAMA SISWA
            </th>
            <th
              colSpan={1}
              className="border border-black px-2 py-0.5 text-center font-bold w-36 align-middle"
            >
              MATA PELAJARAN
            </th>
            <th
              rowSpan={2}
              className="border border-black px-2 py-1 text-center font-bold w-28 align-middle"
            >
              JUMLAH
              <br />
              NILAI
            </th>
          </tr>
          <tr>
            <th className="border border-black px-2 py-0.5 text-center font-bold w-36 align-middle uppercase">
              {subjectLabel}
            </th>
          </tr>
        </thead>
        <tbody>
          {results.length > 0 ? (
            results.map((r, idx) => {
              const username = r.student.nis || r.student.username || '—';
              const name = r.student.full_name || '—';
              const scoreStr = formatScoreValue(r.total_score);
              return (
                <tr key={r.session_id || idx} className="hover:bg-slate-50/50">
                  <td className="border border-black px-2 py-0.5 text-center">{idx + 1}</td>
                  <td className="border border-black px-2 py-0.5 text-center font-mono">
                    {username}
                  </td>
                  <td className="border border-black px-3 py-0.5 text-left">{name}</td>
                  <td className="border border-black px-2 py-0.5 text-center">{scoreStr}</td>
                  <td className="border border-black px-2 py-0.5 text-center">{scoreStr}</td>
                </tr>
              );
            })
          ) : (
            <tr>
              <td
                colSpan={5}
                className="border border-black px-4 py-8 text-center text-slate-500 italic"
              >
                Belum ada data nilai peserta untuk laporan ini
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {/* SUMMARY BOX AND SIGNATURES */}
      <div className="avoid-page-break flex justify-between items-start gap-6 pt-2">
        {/* SUMMARY TABLE (BOTTOM LEFT) */}
        <div className="w-[300px] shrink-0">
          <table className="formal-report-table w-full border-collapse border border-black text-[12px] text-black">
            <thead>
              <tr>
                <th
                  rowSpan={2}
                  className="border border-black px-3 py-1 text-center font-bold w-28 align-middle"
                >
                  NILAI
                </th>
                <th
                  colSpan={1}
                  className="border border-black px-2 py-0.5 text-center font-bold align-middle"
                >
                  MATA PELAJARAN
                </th>
                <th
                  rowSpan={2}
                  className="border border-black px-2 py-1 text-center font-bold w-24 align-middle"
                >
                  JUMLAH
                  <br />
                  NILAI
                </th>
              </tr>
              <tr>
                <th className="border border-black px-2 py-0.5 text-center font-bold align-middle uppercase">
                  {subjectLabel}
                </th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-black px-3 py-0.5 text-left font-normal">
                  Rata - Rata
                </td>
                <td className="border border-black px-2 py-0.5 text-center">{summary.average}</td>
                <td className="border border-black px-2 py-0.5 text-center">{summary.average}</td>
              </tr>
              <tr>
                <td className="border border-black px-3 py-0.5 text-left font-normal">Terendah</td>
                <td className="border border-black px-2 py-0.5 text-center">{summary.min}</td>
                <td className="border border-black px-2 py-0.5 text-center">{summary.min}</td>
              </tr>
              <tr>
                <td className="border border-black px-3 py-0.5 text-left font-normal">
                  Tertinggi
                </td>
                <td className="border border-black px-2 py-0.5 text-center">{summary.max}</td>
                <td className="border border-black px-2 py-0.5 text-center">{summary.max}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* SIGNATURES BLOCK (BOTTOM RIGHT) */}
        <div className="flex-1 flex flex-col items-end text-[12px] text-black">
          <div className="text-right mb-2 pr-6 font-normal">
            {config.city || 'Wonosobo'}, {displayDate}
          </div>
          <div className="flex justify-end gap-10 w-full max-w-[440px]">
            {config.signers.map((signer) => (
              <div
                key={signer.id}
                className="flex-1 text-center flex flex-col justify-between min-w-[130px]"
              >
                <div className="font-normal text-black">{signer.role || 'Penandatangan'}</div>
                <div className="h-16 md:h-20" />
                <div>
                  <div className="font-bold underline text-black">
                    {signer.name || '______________________'}
                  </div>
                  {signer.nip ? (
                    <div className="text-[11px] text-black mt-0.5">{signer.nip}</div>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function FormalReportModal({
  open,
  onClose,
  exam,
  className,
  results = [],
  settings,
}: FormalReportModalProps) {
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<'preview' | 'settings'>('preview');

  // Load configuration with localStorage persistence and fallback defaults
  const [config, setConfig] = useState<FormalReportConfig>(() => {
    if (typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem(FORMAL_REPORT_STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          return {
            ...DEFAULT_FORMAL_REPORT_CONFIG,
            ...parsed,
            signers:
              Array.isArray(parsed.signers) && parsed.signers.length > 0
                ? parsed.signers
                : DEFAULT_FORMAL_REPORT_CONFIG.signers,
          };
        }
      } catch (e) {
        console.error('Failed to parse formal report config from localStorage', e);
      }
    }
    return DEFAULT_FORMAL_REPORT_CONFIG;
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  // Save config to localStorage on change
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(FORMAL_REPORT_STORAGE_KEY, JSON.stringify(config));
      } catch (e) {
        console.error('Failed to persist formal report config to localStorage', e);
      }
    }
  }, [config]);

  // Derive date and subject label
  const displayDate = useMemo(() => {
    if (config.reportDate && config.reportDate.trim().length > 0) {
      return config.reportDate.trim();
    }
    try {
      return new Date().toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
    } catch {
      return '15 Oktober 2026';
    }
  }, [config.reportDate]);

  const subjectLabel = useMemo(() => {
    if (config.subjectLabel && config.subjectLabel.trim().length > 0) {
      return config.subjectLabel.trim();
    }
    if (exam?.subject?.code && exam.subject.code.trim().length > 0) {
      return exam.subject.code.trim();
    }
    if (exam?.subject?.name) {
      const name = exam.subject.name.trim();
      // If words >= 2, default to initials (e.g. Koding dan Kecerdasan Artifisial -> KKA)
      const words = name.split(/\s+/).filter(Boolean);
      if (words.length >= 2 && words.length <= 5) {
        return words.map((w) => (w[0] ? w[0].toUpperCase() : '')).join('');
      }
      return name;
    }
    return 'KKA';
  }, [config.subjectLabel, exam?.subject]);

  const summary = useMemo(() => calculateReportSummary(results), [results]);

  const handlePrint = useCallback(() => {
    if (typeof window === 'undefined') return;
    document.body.classList.add('printing-formal-report');

    const handleAfterPrint = () => {
      document.body.classList.remove('printing-formal-report');
      window.removeEventListener('afterprint', handleAfterPrint);
    };
    window.addEventListener('afterprint', handleAfterPrint);

    window.print();

    // Fallback cleanup
    setTimeout(() => {
      document.body.classList.remove('printing-formal-report');
    }, 2500);
  }, []);

  const handleAddSigner = () => {
    const newSigner: FormalReportSigner = {
      id: `signer-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      role: 'Guru Mata Pelajaran',
      name: '',
      nip: '',
    };
    setConfig((prev) => ({
      ...prev,
      signers: [...prev.signers, newSigner],
    }));
  };

  const handleUpdateSigner = (index: number, field: keyof FormalReportSigner, value: string) => {
    setConfig((prev) => {
      const current = prev.signers[index];
      if (!current) return prev;
      const updated = [...prev.signers];
      updated[index] = { ...current, [field]: value };
      return { ...prev, signers: updated };
    });
  };

  const handleRemoveSigner = (index: number) => {
    if (config.signers.length <= 1) {
      toast.error('Laporan harus memiliki minimal 1 penandatangan');
      return;
    }
    setConfig((prev) => ({
      ...prev,
      signers: prev.signers.filter((_, i) => i !== index),
    }));
  };

  const handleResetDefaults = () => {
    setConfig(DEFAULT_FORMAL_REPORT_CONFIG);
    try {
      localStorage.setItem(
        FORMAL_REPORT_STORAGE_KEY,
        JSON.stringify(DEFAULT_FORMAL_REPORT_CONFIG),
      );
    } catch {}
    toast.success('Pengaturan laporan dikembalikan ke standar awal');
  };

  return (
    <>
      {/* GLOBAL PRINT CSS INJECTION */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
@media screen {
  #cbt-formal-report-print-portal {
    display: none !important;
  }
}

@media print {
  @page {
    size: A4 portrait;
    margin: 10mm 15mm 10mm 15mm;
  }

  body.printing-formal-report {
    background: #ffffff !important;
    color: #000000 !important;
  }

  body.printing-formal-report > *:not(#cbt-formal-report-print-portal) {
    display: none !important;
  }

  body.printing-formal-report #cbt-formal-report-print-portal {
    display: block !important;
    position: static !important;
    width: 100% !important;
    margin: 0 !important;
    padding: 0 !important;
    background: #ffffff !important;
    color: #000000 !important;
    visibility: visible !important;
  }

  body.printing-formal-report #cbt-formal-report-print-portal * {
    visibility: visible !important;
    color: #000000 !important;
    border-color: #000000 !important;
    box-shadow: none !important;
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }

  .formal-report-table {
    border-collapse: collapse !important;
    width: 100% !important;
  }

  .formal-report-table th,
  .formal-report-table td {
    border: 1px solid #000000 !important;
    color: #000000 !important;
  }

  .avoid-page-break {
    break-inside: avoid !important;
    page-break-inside: avoid !important;
  }
}
`,
        }}
      />

      {/* PORTAL FOR ACTUAL PRINT DOM (STANDALONE CLEAN ROOT) */}
      {mounted &&
        open &&
        createPortal(
          <div id="cbt-formal-report-print-portal" aria-hidden="true">
            <FormalReportDocumentContent
              config={config}
              exam={exam}
              className={className}
              results={results}
              summary={summary}
              displayDate={displayDate}
              subjectLabel={subjectLabel}
            />
          </div>,
          document.body,
        )}

      {/* MODAL DIALOG CONTAINER */}
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-5xl max-h-[92vh] flex flex-col p-0 gap-0 overflow-hidden sm:rounded-2xl">
          <Tabs
            value={activeTab}
            onValueChange={(v) => setActiveTab(v as 'preview' | 'settings')}
            className="flex-1 flex flex-col min-h-0 overflow-hidden"
          >
            {/* MODAL HEADER */}
            <DialogHeader className="p-6 pb-3 border-b shrink-0 text-left bg-background">
              <div className="flex items-center justify-between">
                <div>
                  <DialogTitle className="text-xl font-bold flex items-center gap-2">
                    <School className="w-5 h-5 text-primary" />
                    Laporan Hasil Ujian Resmi (Standar Wonosobo)
                  </DialogTitle>
                  <DialogDescription className="text-sm text-muted-foreground mt-1">
                    Format resmi cetak KKA / DKN sesuai standar SMK Informatika Wonosobo dengan
                    tanda tangan multi-pihak yang dapat dikustomisasi.
                  </DialogDescription>
                </div>
              </div>

              {/* TAB SELECTOR */}
              <div className="pt-3">
                <TabsList className="grid grid-cols-2 w-full max-w-sm">
                  <TabsTrigger
                    value="preview"
                    className="gap-2"
                    onClick={() => setActiveTab('preview')}
                  >
                    <FileText className="w-4 h-4" /> Pratinjau Cetak Formal
                  </TabsTrigger>
                  <TabsTrigger
                    value="settings"
                    className="gap-2"
                    onClick={() => setActiveTab('settings')}
                  >
                    <Settings className="w-4 h-4" /> Atur Tanda Tangan & Kop
                  </TabsTrigger>
                </TabsList>
              </div>
            </DialogHeader>

            {/* TAB 1: PREVIEW */}
            <TabsContent
              value="preview"
              className="mt-0 flex-1 overflow-y-auto p-6 bg-slate-100 dark:bg-slate-950/50 min-h-0"
            >
              <div className="flex flex-col items-center">
                <div className="w-full max-w-[840px] bg-white text-black p-8 md:p-10 shadow-lg rounded-sm border border-slate-300">
                  <FormalReportDocumentContent
                    config={config}
                    exam={exam}
                    className={className}
                    results={results}
                    summary={summary}
                    displayDate={displayDate}
                    subjectLabel={subjectLabel}
                  />
                </div>
              </div>
            </TabsContent>

            {/* TAB 2: SETTINGS */}
            <TabsContent
              value="settings"
              className="mt-0 flex-1 overflow-y-auto p-6 bg-slate-100 dark:bg-slate-950/50 min-h-0"
            >
              <div className="max-w-3xl mx-auto space-y-6">
                {/* SECTION 1: KOP & METADATA CONFIG */}
                <Card>
                  <CardContent className="p-6 space-y-4">
                    <div className="flex items-center justify-between border-b pb-2">
                      <h3 className="font-semibold text-base flex items-center gap-2">
                        <School className="w-4 h-4 text-primary" />
                        Kop Sekolah & Metadata Laporan
                      </h3>
                      <span className="text-xs text-muted-foreground">
                        Tersimpan otomatis di peramban
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1.5 md:col-span-2">
                        <Label htmlFor="assessmentTitle">Judul Asesmen / Ujian</Label>
                        <Input
                          id="assessmentTitle"
                          value={config.assessmentTitle}
                          onChange={(e) =>
                            setConfig((prev) => ({ ...prev, assessmentTitle: e.target.value }))
                          }
                          placeholder="Cth: Assessment Sumatif Tengah Semester Genap"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor="schoolName">Nama Sekolah</Label>
                        <Input
                          id="schoolName"
                          value={config.schoolName}
                          onChange={(e) =>
                            setConfig((prev) => ({ ...prev, schoolName: e.target.value }))
                          }
                          placeholder="Cth: SMK INFORMATIKA WONOSOBO"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor="academicYear">Tahun Ajaran</Label>
                        <Input
                          id="academicYear"
                          value={config.academicYear}
                          onChange={(e) =>
                            setConfig((prev) => ({ ...prev, academicYear: e.target.value }))
                          }
                          placeholder="Cth: 2025 - 2026 atau 2025/2026"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor="province">Provinsi</Label>
                        <Input
                          id="province"
                          value={config.province}
                          onChange={(e) =>
                            setConfig((prev) => ({ ...prev, province: e.target.value }))
                          }
                          placeholder="Cth: Jawa Tengah"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor="regency">Kota / Kabupaten</Label>
                        <Input
                          id="regency"
                          value={config.regency}
                          onChange={(e) =>
                            setConfig((prev) => ({ ...prev, regency: e.target.value }))
                          }
                          placeholder="Cth: Wonosobo atau KAB. WONOSOBO"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor="reportDate">Tanggal Dokumen (Kustom)</Label>
                        <Input
                          id="reportDate"
                          value={config.reportDate || ''}
                          onChange={(e) =>
                            setConfig((prev) => ({ ...prev, reportDate: e.target.value }))
                          }
                          placeholder={`Kosongkan untuk otomatis (${displayDate})`}
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor="subjectLabel">Singkatan Mapel di Tabel</Label>
                        <Input
                          id="subjectLabel"
                          value={config.subjectLabel || ''}
                          onChange={(e) =>
                            setConfig((prev) => ({ ...prev, subjectLabel: e.target.value }))
                          }
                          placeholder={`Kosongkan untuk otomatis (${subjectLabel})`}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* SECTION 2: SIGNERS CONFIG */}
                <Card>
                  <CardContent className="p-6 space-y-4">
                    <div className="flex items-center justify-between border-b pb-2">
                      <div>
                        <h3 className="font-semibold text-base">Daftar Penandatangan (Signers)</h3>
                        <p className="text-xs text-muted-foreground">
                          Atur jabatan, nama lengkap & gelar, serta NIP pada kolom tanda tangan
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleAddSigner}
                        className="gap-1.5 text-xs font-medium"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Tambah Penandatangan
                      </Button>
                    </div>

                    <div className="space-y-3">
                      {config.signers.map((signer, index) => (
                        <div
                          key={signer.id || index}
                          className="flex flex-col md:flex-row items-start md:items-end gap-3 p-3.5 rounded-lg border bg-card/60"
                        >
                          <div className="w-full md:w-44 space-y-1">
                            <Label className="text-xs text-muted-foreground">
                              Jabatan / Peran
                            </Label>
                            <Input
                              value={signer.role}
                              onChange={(e) =>
                                handleUpdateSigner(index, 'role', e.target.value)
                              }
                              placeholder="Cth: Kepala Sekolah"
                              className="h-9 text-xs"
                            />
                          </div>

                          <div className="flex-1 w-full space-y-1">
                            <Label className="text-xs text-muted-foreground">
                              Nama Lengkap & Gelar
                            </Label>
                            <Input
                              value={signer.name}
                              onChange={(e) =>
                                handleUpdateSigner(index, 'name', e.target.value)
                              }
                              placeholder="Cth: Dadik Wahyu Ratmoko, S.Si"
                              className="h-9 text-xs font-medium"
                            />
                          </div>

                          <div className="w-full md:w-48 space-y-1">
                            <Label className="text-xs text-muted-foreground">
                              NIP / NIY (Opsional)
                            </Label>
                            <Input
                              value={signer.nip || ''}
                              onChange={(e) =>
                                handleUpdateSigner(index, 'nip', e.target.value)
                              }
                              placeholder="Cth: NIP. 19780512..."
                              className="h-9 text-xs"
                            />
                          </div>

                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            disabled={config.signers.length <= 1}
                            onClick={() => handleRemoveSigner(index)}
                            className="h-9 w-9 text-destructive hover:bg-destructive/10 shrink-0"
                            title="Hapus penandatangan"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* MODAL FOOTER */}
            <div className="p-4 px-6 border-t shrink-0 bg-background flex flex-col-reverse sm:flex-row sm:justify-between items-center gap-3">
              <div className="flex items-center gap-2 w-full sm:w-auto">
                {activeTab === 'settings' ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleResetDefaults}
                    className="gap-1.5 text-xs text-muted-foreground hover:text-foreground"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Reset ke Default
                  </Button>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setActiveTab('settings')}
                    className="gap-1.5 text-xs"
                  >
                    <Settings className="w-3.5 h-3.5" />
                    Ubah Tanda Tangan & Kop
                  </Button>
                )}
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <Button type="button" variant="outline" onClick={onClose}>
                  Tutup
                </Button>
                <Button
                  type="button"
                  variant="default"
                  onClick={handlePrint}
                  className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90 font-medium"
                >
                  <Printer className="w-4 h-4" />
                  Cetak Dokumen (Print / PDF)
                </Button>
              </div>
            </div>
          </Tabs>
        </DialogContent>
      </Dialog>
    </>
  );
}
