'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { reportApi, ItemAnalysisData } from '@/lib/api-service';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { RichMarkdownRenderer } from '@/components/ui/rich-markdown-renderer';
import { HelpCircle, CheckCircle2, XCircle, BarChart3, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ItemAnalysisViewProps {
  examId: string;
}

export function ItemAnalysisView({ examId }: ItemAnalysisViewProps) {
  const { data, isLoading } = useQuery<ItemAnalysisData>({
    queryKey: ['item-analysis', examId],
    queryFn: async () => {
      const res = await reportApi.getItemAnalysis(examId);
      return res.data.data;
    },
    enabled: !!examId,
  });

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3">
        <Spinner className="w-8 h-8 text-primary" />
        <p className="text-sm text-muted-foreground animate-pulse">
          Menganalisis butir soal dan sebaran distractor...
        </p>
      </div>
    );
  }

  if (!data || data.questions.length === 0) {
    return (
      <div className="p-8 text-center text-muted-foreground border rounded-xl bg-card">
        Belum ada data analisis butir soal untuk ujian ini.
      </div>
    );
  }

  const questions = data.questions;
  const easyCount = questions.filter((q) => q.difficulty_index > 0.7).length;
  const mediumCount = questions.filter((q) => q.difficulty_index >= 0.3 && q.difficulty_index <= 0.7).length;
  const hardCount = questions.filter((q) => q.difficulty_index < 0.3).length;
  const avgPassRate =
    questions.length > 0
      ? (questions.reduce((acc, q) => acc + q.pass_rate, 0) / questions.length).toFixed(1)
      : '0';

  const getDifficultyBadge = (p: number) => {
    if (p > 0.7) {
      return (
        <Badge variant="outline" className="text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-300">
          Mudah (P={p.toFixed(2)})
        </Badge>
      );
    }
    if (p >= 0.3) {
      return (
        <Badge variant="outline" className="text-blue-700 bg-blue-50 dark:bg-blue-950/40 dark:text-blue-300 border-blue-300">
          Sedang (P={p.toFixed(2)})
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="text-amber-700 bg-amber-50 dark:bg-amber-950/40 dark:text-amber-300 border-amber-300">
        Sukar (P={p.toFixed(2)})
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      {/* Overview Analytics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Total Peserta Selesai</p>
              <p className="text-2xl font-bold mt-0.5">{data.total_sessions}</p>
            </div>
            <div className="p-2.5 rounded-full bg-primary/10 text-primary">
              <BarChart3 className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Rata-rata Daya Serap</p>
              <p className="text-2xl font-bold mt-0.5 text-emerald-600">{avgPassRate}%</p>
            </div>
            <div className="p-2.5 rounded-full bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40">
              <TrendingUp className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Distribusi Kesukaran</p>
              <p className="text-xs font-medium mt-1.5 flex gap-2">
                <span className="text-emerald-600 font-semibold">{easyCount} Mudah</span>
                <span className="text-blue-600 font-semibold">{mediumCount} Sedang</span>
                <span className="text-amber-600 font-semibold">{hardCount} Sukar</span>
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Total Butir Soal</p>
              <p className="text-2xl font-bold mt-0.5">{questions.length}</p>
            </div>
            <div className="p-2.5 rounded-full bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
              <HelpCircle className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Item Analysis Breakdown Table */}
      <div className="border rounded-xl bg-card overflow-hidden">
        <div className="p-4 border-b bg-muted/20 flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-sm">Analisis Tingkat Kesukaran & Sebaran Pengecoh (Distractor)</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Evaluasi efektivitas tiap butir soal dan pilihan jawaban pengecoh berdasarkan hasil respon siswa.
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-muted/50 border-b text-muted-foreground font-semibold">
              <tr>
                <th className="p-3 w-12 text-center">No</th>
                <th className="p-3 min-w-[260px]">Butir Pertanyaan</th>
                <th className="p-3 w-28">Tipe Soal</th>
                <th className="p-3 w-36">Tingkat Kesukaran</th>
                <th className="p-3 w-24 text-center">Responden</th>
                <th className="p-3 w-28 text-center">Benar / Salah</th>
                <th className="p-3 min-w-[280px]">Sebaran Pilihan Jawaban (Distractor)</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {questions.map((q) => (
                <tr key={q.question_id} className="hover:bg-muted/30 transition-colors">
                  <td className="p-3 text-center font-bold text-slate-500">{q.number}</td>
                  <td className="p-3">
                    <div className="line-clamp-2 text-foreground font-medium max-w-md">
                      <RichMarkdownRenderer content={q.content} />
                    </div>
                  </td>
                  <td className="p-3">
                    <Badge variant="secondary" className="text-[10px]">
                      {q.type}
                    </Badge>
                  </td>
                  <td className="p-3">{getDifficultyBadge(q.difficulty_index)}</td>
                  <td className="p-3 text-center font-medium">{q.total_answered}</td>
                  <td className="p-3 text-center">
                    <span className="text-emerald-600 font-semibold">{q.correct_count}</span>
                    <span className="text-muted-foreground mx-1">/</span>
                    <span className="text-rose-600 font-semibold">{q.wrong_count}</span>
                  </td>
                  <td className="p-3">
                    {q.distractor_distribution.length > 0 ? (
                      <div className="space-y-1.5">
                        <div className="flex flex-wrap gap-1.5">
                          {q.distractor_distribution.map((d, dIdx) => {
                            const optLetter = String.fromCharCode(65 + dIdx);
                            return (
                              <div
                                key={d.option_id}
                                className={cn(
                                  'flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium border',
                                  d.is_correct
                                    ? 'bg-emerald-50 border-emerald-300 text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300'
                                    : d.count > 0
                                    ? 'bg-slate-50 border-slate-300 text-slate-800 dark:bg-slate-800 dark:text-slate-300'
                                    : 'bg-muted/40 border-muted text-muted-foreground opacity-60',
                                )}
                                title={`Opsi ${optLetter}: ${d.count} siswa (${d.percentage}%)`}
                              >
                                <span className={cn('font-bold', d.is_correct && 'text-emerald-600')}>
                                  {optLetter}{d.is_correct ? ' ★' : ''}:
                                </span>
                                <span>{d.count} ({d.percentage}%)</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ) : (
                      <span className="text-muted-foreground italic">Non-objektif</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
