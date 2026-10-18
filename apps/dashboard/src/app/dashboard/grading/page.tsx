'use client';

import { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/auth.store';
import { examApi, gradingApi } from '@/lib/api-service';
import { useRoleGuard } from '@/hooks/use-role-guard';
import { ErrorBoundary } from '@/components/ui/error-boundary';
import { UserRole } from '@secure-cbt/shared';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileCheck, AlertCircle, Clock, CheckCircle2, History, ChevronDown, ChevronUp } from 'lucide-react';
import { toast } from 'sonner';

interface Exam { id: string; title: string; subject?: { name: string }; status: string; }
interface PendingStudent {
  session_id: string;
  student_name: string;
  nis: string;
  class_name: string;
  pending_count: number;
  graded_count?: number;
  total_essays?: number;
}
interface SessionEssay {
  question_id: string;
  question_content: string;
  answer_text: string | null;
  score: number | null;
  feedback: string | null;
}
interface SessionEssays {
  session_id: string;
  student_name: string;
  nis: string;
  class_name: string;
  essays: SessionEssay[];
}
interface EssayHistoryItem {
  id: string;
  event: 'ESSAY_GRADED' | 'ESSAY_REVISED';
  question_id: string;
  previous_score?: number | null;
  new_score?: number | null;
  score?: number | null;
  previous_feedback?: string | null;
  new_feedback?: string | null;
  feedback?: string | null;
  revision_note?: string | null;
  grader_id?: string;
  grader_name?: string | null;
  timestamp: string;
  created_at?: string;
}

function EssayHistoryAuditTrail({
  sessionId,
  questionId,
}: {
  sessionId: string;
  questionId: string;
}) {
  const [isOpen, setIsOpen] = useState(false);

  const { data: history, isLoading } = useQuery({
    queryKey: ['essay-history', sessionId, questionId],
    queryFn: async () => {
      const { data } = await gradingApi.getEssayHistory(sessionId, questionId);
      return data.data as EssayHistoryItem[];
    },
    enabled: isOpen,
  });

  return (
    <div className="pt-2 border-t border-dashed">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1.5 h-8 px-2"
        onClick={() => setIsOpen(!isOpen)}
      >
        <History className="h-3.5 w-3.5 text-primary" />
        <span>Riwayat Revisi (Audit Trail)</span>
        {isOpen ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
      </Button>

      {isOpen && (
        <div className="mt-2 pl-3 border-l-2 border-primary/40 space-y-2 text-xs">
          {isLoading ? (
            <div className="flex items-center gap-2 py-2 text-muted-foreground">
              <Spinner className="h-3.5 w-3.5" /> Memuat riwayat revisi...
            </div>
          ) : !history || history.length === 0 ? (
            <p className="text-muted-foreground italic py-1">Belum ada riwayat revisi atau penilaian.</p>
          ) : (
            <div className="space-y-2">
              {history.map((item, idx) => (
                <div key={item.id || idx} className="p-2.5 rounded-md bg-muted/60 border space-y-1">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span className="font-semibold">
                      {item.event === 'ESSAY_REVISED' ? (
                        <span className="text-amber-600 dark:text-amber-400">
                          Revisi Nilai: {item.previous_score ?? 0} &rarr; {item.new_score ?? item.score}
                        </span>
                      ) : (
                        <span className="text-emerald-600 dark:text-emerald-400">
                          Penilaian Pertama: {item.score}
                        </span>
                      )}
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      {new Date(item.timestamp || item.created_at || '').toLocaleString('id-ID', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>

                  {item.revision_note && (
                    <div className="text-xs text-foreground bg-background/80 p-1.5 rounded border border-muted">
                      <span className="font-medium text-amber-700 dark:text-amber-400">Catatan Revisi: </span>
                      {item.revision_note}
                    </div>
                  )}

                  {(item.new_feedback || item.feedback) && (
                    <div className="text-muted-foreground text-xs">
                      <span className="font-medium text-foreground">Catatan Siswa: </span>
                      {item.new_feedback || item.feedback}
                    </div>
                  )}

                  <div className="text-[10px] text-muted-foreground pt-0.5">
                    Penilai: {item.grader_name || item.grader_id || 'Guru'}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function GradingPageContent() {
  useRoleGuard([UserRole.ADMIN, UserRole.TEACHER]);
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const isTeacher = user?.role === UserRole.TEACHER;

  const teacherSubjectIds = useMemo(() => {
    return new Set(
      user?.teacher?.teacher_subjects?.map((ts) => ts.subject_id || ts.subject?.id).filter(Boolean) || [],
    );
  }, [user]);

  const [selectedExam, setSelectedExam] = useState<string>('');
  const [selectedStudent, setSelectedStudent] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'pending' | 'completed'>('pending');
  const [scores, setScores] = useState<Record<string, number>>({});
  const [feedbacks, setFeedbacks] = useState<Record<string, string>>({});
  const [revisionNotes, setRevisionNotes] = useState<Record<string, string>>({});

  const { data: exams } = useQuery({
    queryKey: ['grading-exams'],
    queryFn: async () => {
      const { data } = await examApi.getAll({ per_page: 50 });
      return (data.data as Exam[]).filter((e) => ['PUBLISHED', 'ONGOING', 'FINISHED'].includes(e.status));
    },
  });

  const availableExams = useMemo(() => {
    if (!exams) return [];
    if (!isTeacher) return exams;
    return exams.filter((e) => teacherSubjectIds.has((e as any).subject?.id || (e as any).subject_id));
  }, [exams, isTeacher, teacherSubjectIds]);

  const { data: studentList, isLoading: listLoading } = useQuery({
    queryKey: ['pending-essays', selectedExam, activeTab],
    queryFn: async () => {
      if (!selectedExam) return [];
      const { data } = await gradingApi.getPendingEssays(selectedExam, { status: activeTab });
      return data.data as PendingStudent[];
    },
    enabled: !!selectedExam,
    refetchInterval: 10000,
  });

  const { data: sessionEssays, isLoading: sessionLoading } = useQuery({
    queryKey: ['session-essays', selectedStudent],
    queryFn: async () => {
      if (!selectedStudent) return null;
      const { data } = await gradingApi.getSessionEssays(selectedStudent);
      return data.data as SessionEssays;
    },
    enabled: !!selectedStudent,
  });

  useEffect(() => {
    if (sessionEssays) {
      const initialScores: Record<string, number> = {};
      const initialFeedbacks: Record<string, string> = {};
      for (const essay of sessionEssays.essays) {
        if (essay.score !== null) initialScores[essay.question_id] = essay.score;
        if (essay.feedback !== null) initialFeedbacks[essay.question_id] = essay.feedback;
      }
      setScores(initialScores);
      setFeedbacks(initialFeedbacks);
    }
  }, [sessionEssays]);

  const gradeMutation = useMutation({
    mutationFn: async ({
      question_id,
      score,
      feedback,
      revision_note,
    }: {
      question_id: string;
      score: number;
      feedback?: string;
      revision_note?: string;
    }) => {
      const { data } = await gradingApi.gradeEssay({
        session_id: selectedStudent!,
        question_id,
        score,
        feedback,
        revision_note,
      });
      return data;
    },
    onSuccess: (_, variables) => {
      toast.success('Nilai esai tersimpan');
      queryClient.invalidateQueries({ queryKey: ['pending-essays', selectedExam] });
      queryClient.invalidateQueries({ queryKey: ['session-essays', selectedStudent] });
      queryClient.invalidateQueries({
        queryKey: ['essay-history', selectedStudent, variables.question_id],
      });
      setRevisionNotes((prev) => {
        const next = { ...prev };
        delete next[variables.question_id];
        return next;
      });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Gagal menyimpan nilai');
    },
  });

  const totalPending = studentList?.reduce((sum, s) => sum + s.pending_count, 0) || 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Penilaian Esai</h1>
          <p className="text-muted-foreground">Nilai dan revisi jawaban esai siswa beserta riwayat audit</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Pilih Ujian</CardTitle>
          <CardDescription>Pilih ujian yang memiliki jawaban esai untuk dinilai atau ditinjau</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-3">
            <div className="flex-1 space-y-2">
              <Label>Ujian</Label>
              <Select
                value={selectedExam}
                onValueChange={(v) => {
                  setSelectedExam(v);
                  setSelectedStudent(null);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pilih Ujian" />
                </SelectTrigger>
                <SelectContent>
                  {availableExams?.map((e) => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.title} ({e.subject?.name})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {selectedExam && (
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <FileCheck className="h-5 w-5 text-primary" />
                  {activeTab === 'pending'
                    ? totalPending > 0
                      ? `${totalPending} esai belum dinilai`
                      : 'Semua esai sudah dinilai'
                    : 'Esai Selesai Dinilai'}
                </CardTitle>
                <CardDescription>
                  {activeTab === 'pending'
                    ? `${studentList?.length || 0} siswa dengan esai yang perlu dinilai`
                    : `${studentList?.length || 0} siswa yang seluruh esainya telah dinilai`}
                </CardDescription>
              </div>

              <Tabs
                value={activeTab}
                onValueChange={(v) => {
                  setActiveTab(v as 'pending' | 'completed');
                  setSelectedStudent(null);
                }}
              >
                <TabsList className="grid grid-cols-2">
                  <TabsTrigger value="pending" className="flex items-center gap-1.5 text-xs sm:text-sm">
                    <Clock className="h-4 w-4" />
                    Belum Dinilai
                  </TabsTrigger>
                  <TabsTrigger value="completed" className="flex items-center gap-1.5 text-xs sm:text-sm">
                    <CheckCircle2 className="h-4 w-4" />
                    Sudah Dinilai
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </CardHeader>

          <CardContent>
            {listLoading ? (
              <div className="flex h-32 items-center justify-center">
                <Spinner className="h-8 w-8" />
              </div>
            ) : !studentList || studentList.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                <AlertCircle className="h-8 w-8 mb-2" />
                <p>
                  {activeTab === 'pending'
                    ? 'Tidak ada esai yang perlu dinilai'
                    : 'Belum ada esai yang selesai dinilai'}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {studentList.map((student) => (
                  <div key={student.session_id}>
                    <button
                      onClick={() =>
                        setSelectedStudent(selectedStudent === student.session_id ? null : student.session_id)
                      }
                      className="w-full text-left p-3 border rounded-md hover:bg-muted transition flex items-center justify-between"
                    >
                      <div>
                        <p className="font-medium">{student.student_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {student.nis} &middot; {student.class_name}
                        </p>
                      </div>
                      {activeTab === 'pending' ? (
                        <Badge variant="destructive">{student.pending_count} belum dinilai</Badge>
                      ) : (
                        <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white">
                          {student.graded_count ?? student.total_essays} sudah dinilai
                        </Badge>
                      )}
                    </button>

                    {selectedStudent === student.session_id && (
                      <div className="mt-3 pl-4 space-y-4 border-l-2 border-primary">
                        {sessionLoading ? (
                          <div className="flex h-24 items-center justify-center">
                            <Spinner className="h-6 w-6" />
                          </div>
                        ) : sessionEssays ? (
                          sessionEssays.essays.map((essay) => {
                            const isGraded = essay.score !== null;

                            return (
                              <Card key={essay.question_id} className="border-muted">
                                <CardContent className="pt-4 space-y-3">
                                  <div className="flex items-center justify-between gap-2 flex-wrap">
                                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                      Soal Esai
                                    </p>
                                    {isGraded ? (
                                      <Badge className="bg-emerald-600 hover:bg-emerald-600 text-white flex items-center gap-1 text-xs">
                                        <CheckCircle2 className="h-3 w-3" />
                                        Sudah Dinilai - Nilai: {essay.score}
                                      </Badge>
                                    ) : (
                                      <Badge
                                        variant="outline"
                                        className="text-amber-700 border-amber-500 bg-amber-50 dark:bg-amber-950/30 flex items-center gap-1 text-xs"
                                      >
                                        <Clock className="h-3 w-3" />
                                        Belum Dinilai
                                      </Badge>
                                    )}
                                  </div>

                                  <div>
                                    <p className="text-sm font-medium">{essay.question_content}</p>
                                  </div>

                                  <div>
                                    <p className="text-xs font-medium text-muted-foreground mb-1">
                                      Jawaban Siswa
                                    </p>
                                    <div className="p-3 bg-muted rounded-md text-sm whitespace-pre-wrap">
                                      {essay.answer_text || '—'}
                                    </div>
                                  </div>

                                  <div className="grid grid-cols-1 md:grid-cols-12 gap-3 pt-2">
                                    <div className="md:col-span-2 space-y-1">
                                      <Label className="text-xs">Nilai (0-100)</Label>
                                      <Input
                                        type="number"
                                        min={0}
                                        max={100}
                                        value={scores[essay.question_id] ?? ''}
                                        onChange={(e) =>
                                          setScores((prev) => ({
                                            ...prev,
                                            [essay.question_id]: Number(e.target.value),
                                          }))
                                        }
                                      />
                                    </div>

                                    <div className="md:col-span-4 space-y-1">
                                      <Label className="text-xs">Umpan Balik Siswa</Label>
                                      <Input
                                        value={feedbacks[essay.question_id] ?? ''}
                                        onChange={(e) =>
                                          setFeedbacks((prev) => ({
                                            ...prev,
                                            [essay.question_id]: e.target.value,
                                          }))
                                        }
                                        placeholder="Catatan untuk siswa (opsional)"
                                      />
                                    </div>

                                    {isGraded ? (
                                      <div className="md:col-span-4 space-y-1">
                                        <Label className="text-xs">Catatan Revisi (Opsional)</Label>
                                        <Input
                                          value={revisionNotes[essay.question_id] ?? ''}
                                          onChange={(e) =>
                                            setRevisionNotes((prev) => ({
                                              ...prev,
                                              [essay.question_id]: e.target.value,
                                            }))
                                          }
                                          placeholder="Alasan perubahan nilai"
                                        />
                                      </div>
                                    ) : (
                                      <div className="hidden md:block md:col-span-4" />
                                    )}

                                    <div className="md:col-span-2 flex items-end">
                                      <Button
                                        className="w-full bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl shadow-md shadow-indigo-500/20 active:scale-95 transition-all font-semibold text-xs"
                                        onClick={() => {
                                          const score = scores[essay.question_id];
                                          if (score === undefined || score === null || isNaN(score)) {
                                            toast.error('Masukkan nilai terlebih dahulu');
                                            return;
                                          }
                                          gradeMutation.mutate({
                                            question_id: essay.question_id,
                                            score,
                                            feedback: feedbacks[essay.question_id] || '',
                                            revision_note: isGraded
                                              ? revisionNotes[essay.question_id] || ''
                                              : undefined,
                                          });
                                        }}
                                        disabled={gradeMutation.isPending}
                                      >
                                        {isGraded ? 'Simpan Revisi' : 'Simpan'}
                                      </Button>
                                    </div>
                                  </div>

                                  <EssayHistoryAuditTrail
                                    sessionId={student.session_id}
                                    questionId={essay.question_id}
                                  />
                                </CardContent>
                              </Card>
                            );
                          })
                        ) : null}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default function GradingPage() {
  return (
    <ErrorBoundary>
      <GradingPageContent />
    </ErrorBoundary>
  );
}
