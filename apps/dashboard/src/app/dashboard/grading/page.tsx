'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { examApi, gradingApi } from '@/lib/api-service';
import { useRoleGuard } from '@/hooks/use-role-guard';
import { ErrorBoundary } from '@/components/ui/error-boundary';
import { UserRole } from '@secure-cbt/shared';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, Badge, Spinner } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { FileCheck, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

interface Exam { id: string; title: string; subject?: { name: string }; status: string; }
interface PendingStudent { session_id: string; student_name: string; nis: string; class_name: string; pending_count: number; }
interface SessionEssay { question_id: string; question_content: string; answer_text: string | null; score: number | null; feedback: string | null; }
interface SessionEssays { session_id: string; student_name: string; nis: string; class_name: string; essays: SessionEssay[]; }

function GradingPageContent() {
  useRoleGuard([UserRole.ADMIN, UserRole.TEACHER]);
  const queryClient = useQueryClient();

  const [selectedExam, setSelectedExam] = useState<string>('');
  const [selectedStudent, setSelectedStudent] = useState<string | null>(null);
  const [scores, setScores] = useState<Record<string, number>>({});
  const [feedbacks, setFeedbacks] = useState<Record<string, string>>({});

  const { data: exams } = useQuery({
    queryKey: ['grading-exams'],
    queryFn: async () => {
      const { data } = await examApi.getAll({ per_page: 50 });
      return (data.data as Exam[]).filter((e) => ['PUBLISHED', 'ONGOING', 'FINISHED'].includes(e.status));
    },
  });

  const { data: pendingList, isLoading: pendingLoading } = useQuery({
    queryKey: ['pending-essays', selectedExam],
    queryFn: async () => { if (!selectedExam) return []; const { data } = await gradingApi.getPendingEssays(selectedExam); return data.data as PendingStudent[]; },
    enabled: !!selectedExam,
    refetchInterval: 10000,
  });

  const { data: sessionEssays, isLoading: sessionLoading } = useQuery({
    queryKey: ['session-essays', selectedStudent],
    queryFn: async () => { if (!selectedStudent) return null; const { data } = await gradingApi.getSessionEssays(selectedStudent); return data.data as SessionEssays; },
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
    mutationFn: async ({ question_id, score, feedback }: { question_id: string; score: number; feedback: string }) => {
      const { data } = await gradingApi.gradeEssay({ session_id: selectedStudent!, question_id, score, feedback });
      return data;
    },
    onSuccess: () => {
      toast.success('Nilai esai tersimpan');
      queryClient.invalidateQueries({ queryKey: ['pending-essays', selectedExam] });
      queryClient.invalidateQueries({ queryKey: ['session-essays', selectedStudent] });
    },
    onError: (err: any) => { toast.error(err?.response?.data?.message || 'Gagal menyimpan nilai'); },
  });

  const totalPending = pendingList?.reduce((sum, s) => sum + s.pending_count, 0) || 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-3xl font-bold tracking-tight">Penilaian Esai</h1><p className="text-muted-foreground">Nilai jawaban esai siswa secara manual</p></div>
      </div>

      <Card>
        <CardHeader><CardTitle>Pilih Ujian</CardTitle><CardDescription>Pilih ujian yang memiliki jawaban esai untuk dinilai</CardDescription></CardHeader>
        <CardContent>
          <div className="flex items-end gap-3">
            <div className="flex-1 space-y-2">
              <Label>Ujian</Label>
              <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={selectedExam} onChange={(e) => { setSelectedExam(e.target.value); setSelectedStudent(null); }}>
                <option value="">Pilih Ujian</option>
                {exams?.map((e) => (<option key={e.id} value={e.id}>{e.title} ({e.subject?.name})</option>))}
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {selectedExam && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileCheck className="h-5 w-5" />
              {totalPending > 0 ? `${totalPending} esai belum dinilai` : 'Semua esai sudah dinilai'}
            </CardTitle>
            <CardDescription>{pendingList?.length || 0} siswa dengan esai yang perlu dinilai</CardDescription>
          </CardHeader>
          <CardContent>
            {pendingLoading ? (
              <div className="flex h-32 items-center justify-center"><Spinner className="h-8 w-8" /></div>
            ) : !pendingList || pendingList.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground"><AlertCircle className="h-8 w-8 mb-2" /><p>Tidak ada esai yang perlu dinilai</p></div>
            ) : (
              <div className="space-y-4">
                {pendingList.map((student) => (
                  <div key={student.session_id}>
                    <button
                      onClick={() => setSelectedStudent(selectedStudent === student.session_id ? null : student.session_id)}
                      className="w-full text-left p-3 border rounded-md hover:bg-muted transition flex items-center justify-between"
                    >
                      <div>
                        <p className="font-medium">{student.student_name}</p>
                        <p className="text-xs text-muted-foreground">{student.nis} &middot; {student.class_name}</p>
                      </div>
                      <Badge variant="destructive">{student.pending_count} belum dinilai</Badge>
                    </button>

                    {selectedStudent === student.session_id && (
                      <div className="mt-3 pl-4 space-y-4 border-l-2 border-primary">
                        {sessionLoading ? (
                          <div className="flex h-24 items-center justify-center"><Spinner className="h-6 w-6" /></div>
                        ) : sessionEssays ? (
                          sessionEssays.essays.map((essay) => (
                            <Card key={essay.question_id} className="border-muted">
                              <CardContent className="pt-4 space-y-3">
                                <div><p className="text-xs font-medium text-muted-foreground mb-1">Soal</p><p className="text-sm">{essay.question_content}</p></div>
                                <div><p className="text-xs font-medium text-muted-foreground mb-1">Jawaban Siswa</p><div className="p-3 bg-muted rounded-md text-sm whitespace-pre-wrap">{essay.answer_text || '—'}</div></div>
                                <div className="flex items-end gap-4">
                                  <div className="space-y-1">
                                    <Label>Nilai (0-100)</Label>
                                    <input type="number" min={0} max={100} className="flex h-10 w-24 rounded-md border border-input bg-background px-3 py-2 text-sm" value={scores[essay.question_id] ?? ''} onChange={(e) => setScores((prev) => ({ ...prev, [essay.question_id]: Number(e.target.value) }))} />
                                  </div>
                                  <div className="flex-1 space-y-1">
                                    <Label>Catatan</Label>
                                    <input className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={feedbacks[essay.question_id] ?? ''} onChange={(e) => setFeedbacks((prev) => ({ ...prev, [essay.question_id]: e.target.value }))} placeholder="Catatan untuk siswa (opsional)" />
                                  </div>
                                  <Button onClick={() => {
                                    const score = scores[essay.question_id];
                                    if (score === undefined || score === null) { toast.error('Masukkan nilai terlebih dahulu'); return; }
                                    gradeMutation.mutate({ question_id: essay.question_id, score, feedback: feedbacks[essay.question_id] || '' });
                                  }} disabled={gradeMutation.isPending}>Simpan</Button>
                                </div>
                              </CardContent>
                            </Card>
                          ))
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
  return <ErrorBoundary><GradingPageContent /></ErrorBoundary>;
}
