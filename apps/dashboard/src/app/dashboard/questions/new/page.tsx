'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { QuestionStudio, defaultQuestionStudioData } from '@/components/questions/question-studio';
import { Spinner } from '@/components/ui/spinner';

function NewQuestionContent() {
  const searchParams = useSearchParams();
  const bankId = searchParams.get('bank_id') || '';

  const initialData = {
    ...defaultQuestionStudioData,
    question_bank_id: bankId,
  };

  return <QuestionStudio initialData={initialData} isEditing={false} />;
}

export default function NewQuestionPage() {
  return (
    <Suspense fallback={<div className="flex justify-center py-12"><Spinner className="h-8 w-8 text-primary" /></div>}>
      <NewQuestionContent />
    </Suspense>
  );
}
