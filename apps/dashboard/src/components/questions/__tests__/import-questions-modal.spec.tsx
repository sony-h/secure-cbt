import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ImportQuestionsModal, QuestionImportPreviewItem } from '../import-questions-modal';
import { QuestionType, DifficultyLevel, ImportQuestionItemInput } from '@secure-cbt/shared';

// Mock Sonner toast
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock API service
vi.mock('@/lib/api-service', () => ({
  questionBankApi: {
    previewImport: vi.fn(),
    confirmImport: vi.fn(),
    downloadTemplateWord: vi.fn(),
    downloadTemplateExcel: vi.fn(),
  },
}));

describe('ImportQuestionsModal & QuestionImportPreviewItem', () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  const renderModal = (props: any = {}) => {
    return render(
      <QueryClientProvider client={queryClient}>
        <ImportQuestionsModal
          open={true}
          onOpenChange={vi.fn()}
          banks={[{ id: '123', title: 'Bank Ujian Utama' }]}
          {...props}
        />
      </QueryClientProvider>,
    );
  };

  it('renders modal in upload step initially', () => {
    renderModal();
    expect(screen.getByText(/Import Soal Massal/i)).toBeDefined();
    expect(screen.getByText(/Klik untuk memilih file atau seret file ke sini/i)).toBeDefined();
  });

  describe('QuestionImportPreviewItem for All 6 Question Formats', () => {
    it('renders MULTIPLE_CHOICE question with blue badge and options', () => {
      const q: ImportQuestionItemInput = {
        number: 1,
        content: 'Ibu kota Indonesia adalah...',
        type: QuestionType.MULTIPLE_CHOICE,
        difficulty: DifficultyLevel.EASY,
        valid: true,
        options: [
          { order: 1, content: 'Jakarta', is_correct: false },
          { order: 2, content: 'Nusantara', is_correct: true },
        ],
      };

      render(<QuestionImportPreviewItem question={q} index={0} />);
      expect(screen.getByText('Pilihan Ganda')).toBeDefined();
      expect(screen.getByText('Ibu kota Indonesia adalah...')).toBeDefined();
      expect(screen.getByText('Nusantara')).toBeDefined();
      expect(screen.getByText('KUNCI')).toBeDefined();
    });

    it('renders MULTI_SELECT question with purple badge and multiple keys', () => {
      const q: ImportQuestionItemInput = {
        number: 2,
        content: 'Bahasa interpreted:',
        type: QuestionType.MULTI_SELECT,
        difficulty: DifficultyLevel.MEDIUM,
        valid: true,
        options: [
          { order: 1, content: 'Python', is_correct: true },
          { order: 2, content: 'JavaScript', is_correct: true },
          { order: 3, content: 'C++', is_correct: false },
        ],
      };

      render(<QuestionImportPreviewItem question={q} index={1} />);
      expect(screen.getByText('PG Kompleks')).toBeDefined();
      const keys = screen.getAllByText('KUNCI');
      expect(keys).toHaveLength(2);
    });

    it('renders TRUE_FALSE question with amber badge and Benar/Salah options', () => {
      const q: ImportQuestionItemInput = {
        number: 3,
        content: 'Fotosintesis menghasilkan glukosa.',
        type: QuestionType.TRUE_FALSE,
        difficulty: DifficultyLevel.EASY,
        valid: true,
        options: [
          { order: 1, content: 'Benar', is_correct: true },
          { order: 2, content: 'Salah', is_correct: false },
        ],
      };

      render(<QuestionImportPreviewItem question={q} index={2} />);
      expect(screen.getByText('Benar / Salah')).toBeDefined();
      expect(screen.getByText('Benar')).toBeDefined();
      expect(screen.getByText('Salah')).toBeDefined();
    });

    it('renders SHORT_ANSWER question with cyan badge and accepted keys', () => {
      const q: ImportQuestionItemInput = {
        number: 4,
        content: 'Bahasa resmi Brazil adalah...',
        type: QuestionType.SHORT_ANSWER,
        difficulty: DifficultyLevel.MEDIUM,
        valid: true,
        options: [
          { order: 1, content: 'Portugis', is_correct: true },
          { order: 2, content: 'Portuguese', is_correct: true },
        ],
      };

      render(<QuestionImportPreviewItem question={q} index={3} />);
      expect(screen.getByText('Isian Singkat')).toBeDefined();
      expect(screen.getByText('Portugis')).toBeDefined();
      expect(screen.getByText('Portuguese')).toBeDefined();
    });

    it('renders MATCHING question with indigo badge and paired items', () => {
      const q: ImportQuestionItemInput = {
        number: 5,
        content: 'Jodohkan pahlawan dan asalnya:',
        type: QuestionType.MATCHING,
        difficulty: DifficultyLevel.HARD,
        valid: true,
        options: [
          {
            order: 1,
            content: JSON.stringify({ left: 'R.A. Kartini', right: 'Jepara' }),
            is_correct: true,
          },
          {
            order: 2,
            content: JSON.stringify({ left: 'Pangeran Diponegoro', right: 'Yogyakarta' }),
            is_correct: true,
          },
        ],
      };

      render(<QuestionImportPreviewItem question={q} index={4} />);
      expect(screen.getByText('Menjodohkan')).toBeDefined();
      expect(screen.getByText('R.A. Kartini')).toBeDefined();
      expect(screen.getByText('Jepara')).toBeDefined();
      expect(screen.getByText('Pangeran Diponegoro')).toBeDefined();
      expect(screen.getByText('Yogyakarta')).toBeDefined();
    });

    it('renders ESSAY question with rose badge and descriptive notice', () => {
      const q: ImportQuestionItemInput = {
        number: 6,
        content: 'Jelaskan perbedaan siklus litik dan lisogenik!',
        type: QuestionType.ESSAY,
        difficulty: DifficultyLevel.HARD,
        valid: true,
        options: [],
        explanation: 'Rubrik penilaian esai',
      };

      render(<QuestionImportPreviewItem question={q} index={5} />);
      expect(screen.getByText('Esai / Uraian')).toBeDefined();
      expect(screen.getByText(/dinilai secara manual/i)).toBeDefined();
      expect(screen.getByText('Rubrik penilaian esai')).toBeDefined();
    });
  });
});
