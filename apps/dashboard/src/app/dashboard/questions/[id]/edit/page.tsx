'use client';

import { useQuery } from '@tanstack/react-query';
import { questionBankApi } from '@/lib/api-service';
import { QuestionStudio, QuestionStudioData } from '@/components/questions/question-studio';
import { Spinner } from '@/components/ui/spinner';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

interface EditQuestionPageProps {
  params: { id: string };
}

export default function EditQuestionPage({ params }: EditQuestionPageProps) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['question', params.id],
    queryFn: async () => {
      const res = await questionBankApi.getQuestionById(params.id);
      return res.data?.data;
    },
  });

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[300px] gap-3">
        <Spinner className="h-8 w-8 text-primary" />
        <p className="text-sm text-muted-foreground font-medium">Memuat data soal...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[300px] gap-4">
        <p className="text-sm text-destructive font-medium">Soal tidak ditemukan atau gagal dimuat.</p>
        <Button variant="outline" asChild>
          <Link href="/dashboard/questions" className="gap-2">
            <ArrowLeft className="h-4 w-4" /> Kembali ke Bank Soal
          </Link>
        </Button>
      </div>
    );
  }

  const initialData: QuestionStudioData = {
    id: data.id,
    question_bank_id: data.question_bank_id,
    type: data.type,
    content: data.content,
    image_url: data.image_url || null,
    difficulty: data.difficulty,
    explanation: data.explanation || '',
    options: (data.options || []).map((o: any) => ({
      content: o.content || '',
      is_correct: o.is_correct || false,
      image_url: o.image_url || null,
    })),
    tags: (data.tags || []).map((t: any) => t.tag || t),
  };

  return <QuestionStudio initialData={initialData} isEditing={true} />;
}
