'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { reportApi, SessionReviewData, SessionReviewQuestion } from '@/lib/api-service';
import { Modal } from '@/components/ui/modal';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { RichMarkdownRenderer } from '@/components/ui/rich-markdown-renderer';
import {
  CheckCircle2,
  XCircle,
  HelpCircle,
  Lightbulb,
  Award,
  BookOpen,
  Calendar,
  User,
  ArrowRight,
  Check,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface StudentSessionReviewModalProps {
  open: boolean;
  onClose: () => void;
  sessionId: string | null;
  studentName?: string;
  nis?: string;
}

export function StudentSessionReviewModal({
  open,
  onClose,
  sessionId,
  studentName,
  nis,
}: StudentSessionReviewModalProps) {
  const [activeQuestionId, setActiveQuestionId] = useState<string | null>(null);

  const { data: reviewData, isLoading } = useQuery<SessionReviewData>({
    queryKey: ['session-review', sessionId],
    queryFn: async () => {
      if (!sessionId) throw new Error('No session ID');
      const res = await reportApi.getSessionReview(sessionId);
      return res.data.data;
    },
    enabled: open && !!sessionId,
  });

  const questions = reviewData?.questions || [];

  const scrollToQuestion = (id: string) => {
    setActiveQuestionId(id);
    const element = document.getElementById(`review-question-${id}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const getDifficultyBadge = (diff?: string) => {
    switch (diff?.toUpperCase()) {
      case 'EASY':
        return <Badge variant="outline" className="text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-300">Mudah</Badge>;
      case 'HARD':
        return <Badge variant="outline" className="text-amber-700 bg-amber-50 dark:bg-amber-950/40 dark:text-amber-300 border-amber-300">Sukar</Badge>;
      default:
        return <Badge variant="outline" className="text-blue-700 bg-blue-50 dark:bg-blue-950/40 dark:text-blue-300 border-blue-300">Sedang</Badge>;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'MULTIPLE_CHOICE': return 'Pilihan Ganda';
      case 'MULTI_SELECT': return 'Pilihan Ganda Kompleks';
      case 'TRUE_FALSE': return 'Benar / Salah';
      case 'SHORT_ANSWER': return 'Jawaban Singkat';
      case 'MATCHING': return 'Menjodohkan';
      case 'ESSAY': return 'Esai';
      default: return type;
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Audit & Pembahasan Ujian Siswa"
      description={`Detail evaluasi jawaban, kunci jawaban, dan pembahasan per butir soal.`}
      maxWidth="sm:max-w-4xl"
      className="max-h-[90vh]"
      footer={
        <div className="flex items-center justify-between w-full">
          <div className="text-xs text-muted-foreground">
            {questions.length > 0 && `Total ${questions.length} butir soal`}
          </div>
          <Button variant="outline" onClick={onClose}>
            Tutup
          </Button>
        </div>
      }
    >
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <Spinner className="w-8 h-8 text-primary" />
          <p className="text-sm text-muted-foreground animate-pulse">Memuat detail lembar jawaban siswa...</p>
        </div>
      ) : !reviewData ? (
        <div className="py-12 text-center text-muted-foreground">
          Data evaluasi lembar jawaban tidak tersedia.
        </div>
      ) : (
        <div className="space-y-6">
          {/* Student & Session Overview Card */}
          <div className="p-4 rounded-xl border bg-muted/30 grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="flex items-start gap-2.5">
              <User className="w-4 h-4 text-primary shrink-0 mt-0.5" />
              <div>
                <p className="text-xs text-muted-foreground">Siswa</p>
                <p className="font-semibold text-sm leading-tight">{reviewData.student_name || studentName}</p>
                <p className="text-xs text-muted-foreground">NIS: {reviewData.nis || nis}</p>
              </div>
            </div>

            <div className="flex items-start gap-2.5">
              <BookOpen className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs text-muted-foreground">Ujian / Mapel</p>
                <p className="font-semibold text-sm leading-tight">{reviewData.exam_title}</p>
                <p className="text-xs text-muted-foreground">{reviewData.subject_name} • {reviewData.class_name}</p>
              </div>
            </div>

            <div className="flex items-start gap-2.5">
              <Award className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs text-muted-foreground">Nilai Akhir</p>
                <p className="font-bold text-lg text-primary leading-tight">
                  {reviewData.score !== null ? reviewData.score.toFixed(1) : '—'}
                </p>
                <p className="text-xs text-muted-foreground">
                  <span className="text-emerald-600 font-medium">{reviewData.correct_count ?? 0} Benar</span> /{' '}
                  <span className="text-red-600 font-medium">{reviewData.wrong_count ?? 0} Salah</span>
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2.5">
              <Calendar className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs text-muted-foreground">Waktu Submit</p>
                <p className="font-medium text-xs leading-tight">
                  {reviewData.submitted_at
                    ? new Date(reviewData.submitted_at).toLocaleString('id-ID', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    : '—'}
                </p>
                <Badge variant={reviewData.status === 'SUBMITTED' ? 'outline' : 'secondary'} className="text-[10px] mt-1 h-4">
                  {reviewData.status}
                </Badge>
              </div>
            </div>
          </div>

          {/* Quick Jump Question Navigator */}
          <div className="space-y-1.5 border-b pb-4">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Navigasi Cepat Butir Soal:
            </p>
            <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto p-1">
              {questions.map((q) => {
                const isCorrect = q.is_correct || q.score >= 50;
                const isUnanswered = !q.student_answer;
                return (
                  <button
                    key={q.id}
                    type="button"
                    onClick={() => scrollToQuestion(q.id)}
                    className={cn(
                      'w-7 h-7 rounded text-xs font-semibold flex items-center justify-center transition-all border',
                      isUnanswered
                        ? 'bg-slate-100 text-slate-600 border-slate-300 dark:bg-slate-800 dark:text-slate-400'
                        : isCorrect
                        ? 'bg-emerald-500 text-white border-emerald-600 shadow-sm'
                        : 'bg-rose-500 text-white border-rose-600 shadow-sm',
                      activeQuestionId === q.id && 'ring-2 ring-primary ring-offset-1',
                    )}
                    title={`Soal ${q.number}: ${isUnanswered ? 'Tidak Dijawab' : isCorrect ? 'Benar' : 'Salah'}`}
                  >
                    {q.number}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Question List */}
          <div className="space-y-6">
            {questions.map((q) => {
              const isCorrect = q.is_correct || q.score >= 50;
              const isUnanswered = !q.student_answer;

              return (
                <div
                  key={q.id}
                  id={`review-question-${q.id}`}
                  className={cn(
                    'rounded-xl border p-5 space-y-4 transition-all scroll-mt-4',
                    isUnanswered
                      ? 'border-slate-200 bg-slate-50/40 dark:border-slate-800 dark:bg-slate-900/30'
                      : isCorrect
                      ? 'border-emerald-200 bg-emerald-50/20 dark:border-emerald-950 dark:bg-emerald-950/10'
                      : 'border-rose-200 bg-rose-50/20 dark:border-rose-950 dark:bg-rose-950/10',
                  )}
                >
                  {/* Question Header */}
                  <div className="flex items-center justify-between border-b pb-3 gap-2 flex-wrap">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm bg-primary/10 text-primary px-2.5 py-1 rounded-md">
                        Soal #{q.number}
                      </span>
                      <Badge variant="secondary" className="text-xs">
                        {getTypeLabel(q.type)}
                      </Badge>
                      {getDifficultyBadge(q.difficulty)}
                    </div>

                    <div className="flex items-center gap-2">
                      {isUnanswered ? (
                        <span className="inline-flex items-center gap-1 text-xs text-slate-500 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-full font-medium">
                          <HelpCircle className="w-3.5 h-3.5" /> Tidak Dijawab
                        </span>
                      ) : isCorrect ? (
                        <span className="inline-flex items-center gap-1 text-xs text-emerald-700 bg-emerald-100 dark:bg-emerald-950/60 dark:text-emerald-300 px-2.5 py-1 rounded-full font-medium">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Benar (+{q.score} poin)
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs text-rose-700 bg-rose-100 dark:bg-rose-950/60 dark:text-rose-300 px-2.5 py-1 rounded-full font-medium">
                          <XCircle className="w-3.5 h-3.5" /> Salah ({q.score} poin)
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Question Content */}
                  <div className="text-sm font-medium text-foreground leading-relaxed">
                    <RichMarkdownRenderer content={q.content} />
                    {q.image_url && (
                      <div className="mt-3 max-w-md rounded-lg overflow-hidden border">
                        <img src={q.image_url} alt={`Lampiran soal #${q.number}`} className="w-full object-contain" />
                      </div>
                    )}
                  </div>

                  {/* Options or Answer Display */}
                  <div className="space-y-2 pt-1">
                    {q.type === 'MULTIPLE_CHOICE' || q.type === 'MULTI_SELECT' || q.type === 'TRUE_FALSE' ? (
                      <div className="space-y-2">
                        {q.options.map((opt, optIndex) => {
                          const optionLetter = String.fromCharCode(65 + optIndex);
                          const studentTokens =
                            q.student_answer
                              ?.split(',')
                              .map((s) => s.trim())
                              .filter(Boolean) ?? [];

                          const isStudentPick =
                            studentTokens.includes(opt.id) ||
                            studentTokens.some((tok) => tok.toLowerCase() === opt.content.trim().toLowerCase()) ||
                            studentTokens.some((tok) => tok.toUpperCase() === optionLetter);
                          const isKey = opt.is_correct;

                          return (
                            <div
                              key={opt.id}
                              className={cn(
                                'flex items-start gap-3 p-3 rounded-lg border text-sm transition-colors',
                                isKey && isStudentPick
                                  ? 'border-emerald-500 bg-emerald-100/60 dark:bg-emerald-950/50 text-emerald-950 dark:text-emerald-100'
                                  : isKey
                                  ? 'border-emerald-500/80 bg-emerald-50/50 dark:bg-emerald-950/30 text-emerald-900 dark:text-emerald-200'
                                  : isStudentPick
                                  ? 'border-rose-400 bg-rose-100/60 dark:bg-rose-950/40 text-rose-950 dark:text-rose-100'
                                  : 'border-slate-200/80 bg-card/60 dark:border-slate-800 text-muted-foreground',
                              )}
                            >
                              <div
                                className={cn(
                                  'w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5',
                                  isKey
                                    ? 'bg-emerald-600 text-white'
                                    : isStudentPick
                                    ? 'bg-rose-600 text-white'
                                    : 'bg-muted text-foreground',
                                )}
                              >
                                {optionLetter}
                              </div>

                              <div className="flex-1 space-y-1">
                                <div className="leading-relaxed">
                                  <RichMarkdownRenderer content={opt.content} />
                                </div>
                                {opt.image_url && (
                                  <img src={opt.image_url} alt={`Opsi ${optionLetter}`} className="max-w-xs rounded border mt-2" />
                                )}
                              </div>

                              <div className="shrink-0 flex items-center gap-1.5 self-center">
                                {isStudentPick && (
                                  <Badge variant={isKey ? 'success' : 'destructive'} className="text-[10px] px-2 py-0.5">
                                    Pilihan Siswa
                                  </Badge>
                                )}
                                {isKey && (
                                  <Badge variant="outline" className="text-[10px] border-emerald-600 text-emerald-700 dark:text-emerald-400 font-semibold px-2 py-0.5">
                                    Kunci Benar
                                  </Badge>
                                )}
                              </div>
                            </div>
                          );
                        })}

                        {(() => {
                          const studentTokens =
                            q.student_answer
                              ?.split(',')
                              .map((s) => s.trim())
                              .filter(Boolean) ?? [];
                          const hasAnyMatch = q.options.some((opt, optIndex) => {
                            const optionLetter = String.fromCharCode(65 + optIndex);
                            return (
                              studentTokens.includes(opt.id) ||
                              studentTokens.some((tok) => tok.toLowerCase() === opt.content.trim().toLowerCase()) ||
                              studentTokens.some((tok) => tok.toUpperCase() === optionLetter)
                            );
                          });

                          if (q.student_answer && !hasAnyMatch) {
                            return (
                              <div className="mt-2 p-2.5 rounded-lg border border-amber-300 bg-amber-50/60 dark:bg-amber-950/30 text-amber-900 dark:text-amber-200 text-xs">
                                <span className="font-semibold">Catatan Jawaban Siswa Terpilih: </span>
                                <span>{q.student_answer}</span>
                              </div>
                            );
                          }
                          return null;
                        })()}
                      </div>
                    ) : q.type === 'MATCHING' ? (
                      (() => {
                        const parsedPairs = q.options.map((opt, optIndex) => {
                          let left = opt.content;
                          let rightKey = '';
                          try {
                            const p = JSON.parse(opt.content);
                            left = p.left || opt.content;
                            rightKey = p.right || '';
                          } catch {
                            left = opt.content;
                          }
                          return { id: opt.id, left, rightKey, index: optIndex + 1 };
                        });

                        let studentMatches: Record<string, string> = {};
                        try {
                          if (q.student_answer) {
                            studentMatches = JSON.parse(q.student_answer);
                          }
                        } catch {
                          studentMatches = {};
                        }

                        return (
                          <div className="space-y-2">
                            {parsedPairs.map((pair) => {
                              const studentTargetId = studentMatches[pair.id];
                              const matchedOption = parsedPairs.find((o) => o.id === studentTargetId);
                              let studentChoiceText = matchedOption ? matchedOption.rightKey : studentTargetId;
                              if (studentChoiceText && /^[0-9a-fA-F-]{36}$/.test(studentChoiceText)) {
                                const fallbackOpt = q.options.find((o) => o.id === studentChoiceText);
                                if (fallbackOpt) {
                                  try {
                                    studentChoiceText = JSON.parse(fallbackOpt.content).right || fallbackOpt.content;
                                  } catch {
                                    studentChoiceText = fallbackOpt.content;
                                  }
                                }
                              }

                              const isPairCorrect =
                                studentTargetId === pair.id ||
                                (!!studentChoiceText &&
                                  studentChoiceText.trim().toLowerCase() === pair.rightKey.trim().toLowerCase());

                              return (
                                <div
                                  key={pair.id}
                                  className={cn(
                                    'p-3 rounded-lg border text-sm space-y-2 transition-colors',
                                    isPairCorrect
                                      ? 'border-emerald-500/80 bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-950 dark:text-emerald-100'
                                      : 'border-rose-400 bg-rose-50/50 dark:bg-rose-950/20 text-rose-950 dark:text-rose-100',
                                  )}
                                >
                                  <div className="flex items-start gap-2">
                                    <span className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5 bg-primary/10 text-primary">
                                      {pair.index}
                                    </span>
                                    <div className="font-semibold text-foreground flex-1">
                                      <RichMarkdownRenderer content={pair.left} />
                                    </div>
                                    <Badge variant={isPairCorrect ? 'success' : 'destructive'} className="text-[10px] px-2 py-0.5 shrink-0">
                                      {isPairCorrect ? 'Cocok ✓' : 'Salah ✗'}
                                    </Badge>
                                  </div>
                                  <div className="pl-7 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                                    <div className="p-2 rounded bg-background/80 border border-border/60">
                                      <p className="font-semibold text-muted-foreground mb-0.5">Pilihan Pasangan Siswa:</p>
                                      <p
                                        className={cn(
                                          'font-medium',
                                          isPairCorrect
                                            ? 'text-emerald-700 dark:text-emerald-300'
                                            : 'text-rose-700 dark:text-rose-300',
                                        )}
                                      >
                                        {studentChoiceText || <span className="italic text-muted-foreground">Belum dipasangkan</span>}
                                      </p>
                                    </div>
                                    {!isPairCorrect && (
                                      <div className="p-2 rounded bg-emerald-500/10 border border-emerald-500/30">
                                        <p className="font-semibold text-emerald-800 dark:text-emerald-300 mb-0.5">Kunci Pasangan Seharusnya:</p>
                                        <p className="font-medium text-emerald-900 dark:text-emerald-200">
                                          {pair.rightKey}
                                        </p>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        );
                      })()
                    ) : q.type === 'SHORT_ANSWER' ? (
                      (() => {
                        let displayAnswer = q.student_answer;
                        if (displayAnswer && /^[0-9a-fA-F-]{36}$/.test(displayAnswer.trim())) {
                          const matchedOpt = q.options.find((o) => o.id === displayAnswer?.trim());
                          if (matchedOpt) displayAnswer = matchedOpt.content;
                        }

                        return (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                            <div className="p-3 rounded-lg border bg-card">
                              <p className="text-xs font-semibold text-muted-foreground mb-1">Jawaban Siswa:</p>
                              <p className="font-medium">{displayAnswer || <span className="italic text-muted-foreground">Tidak dijawab</span>}</p>
                            </div>
                            <div className="p-3 rounded-lg border border-emerald-300 bg-emerald-50/40 dark:bg-emerald-950/20 text-emerald-900 dark:text-emerald-200">
                              <p className="text-xs font-semibold text-emerald-800 dark:text-emerald-300 mb-1">Kunci Jawaban yang Diterima:</p>
                              <div className="space-y-1">
                                {q.options.map((o) => (
                                  <p key={o.id} className="font-medium">• {o.content}</p>
                                ))}
                              </div>
                            </div>
                          </div>
                        );
                      })()
                    ) : (
                      /* Essay */
                      <div className="space-y-3 text-sm">
                        <div className="p-3 rounded-lg border bg-card">
                          <p className="text-xs font-semibold text-muted-foreground mb-1">Jawaban Siswa:</p>
                          <p className="whitespace-pre-wrap">{q.student_answer || <span className="italic text-muted-foreground">Tidak dijawab</span>}</p>
                        </div>
                        {q.feedback && (
                          <div className="p-3 rounded-lg border border-blue-200 bg-blue-50/50 dark:bg-blue-950/30 text-blue-900 dark:text-blue-200">
                            <p className="text-xs font-semibold text-blue-800 dark:text-blue-300 mb-1">Catatan Penilai (Feedback):</p>
                            <p>{q.feedback}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Explanation Section */}
                  {q.explanation && (
                    <div className="p-3.5 rounded-lg border border-amber-200/80 bg-amber-50/60 dark:border-amber-900/50 dark:bg-amber-950/20 text-sm">
                      <div className="flex items-center gap-1.5 text-amber-900 dark:text-amber-300 font-semibold text-xs mb-1.5">
                        <Lightbulb className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                        Pembahasan Soal:
                      </div>
                      <div className="text-amber-950 dark:text-amber-100 text-xs leading-relaxed">
                        <RichMarkdownRenderer content={q.explanation} />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </Modal>
  );
}
