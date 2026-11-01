import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import ReportsPage from '../page';
import * as apiService from '@/lib/api-service';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams('exam=exam-multi-1'),
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
  }),
  usePathname: () => '/dashboard/reports',
}));

vi.mock('@/stores/auth.store', () => ({
  useAuthStore: () => ({
    user: { id: 'admin-1', role: 'ADMIN', full_name: 'Administrator' },
  }),
}));

vi.mock('@/lib/api-service', async (importOriginal) => {
  const actual = await importOriginal<typeof apiService>();
  return {
    ...actual,
    examApi: {
      getAll: vi.fn().mockResolvedValue({
        data: {
          data: [
            {
              id: 'exam-multi-1',
              title: 'Latihan Mandiri Fisika',
              subject: { name: 'Fisika' },
              status: 'PUBLISHED',
              max_attempts: 3,
              _count: { exam_sessions: 2 },
            },
          ],
        },
      }),
      getById: vi.fn().mockResolvedValue({
        data: {
          data: {
            id: 'exam-multi-1',
            max_attempts: 3,
            exam_classes: [{ class: { id: 'cls-1', name: 'X IPA 1' } }],
          },
        },
      }),
    },
    academicApi: {
      getClasses: vi.fn().mockResolvedValue({
        data: { data: [{ id: 'cls-1', name: 'X IPA 1' }] },
      }),
    },
    reportApi: {
      getExamReport: vi.fn().mockResolvedValue({
        data: {
          data: {
            exam_id: 'exam-multi-1',
            exam_title: 'Latihan Mandiri Fisika',
            subject_name: 'Fisika',
            max_attempts: 3,
            is_multi_attempt: true,
            students: [
              {
                session_id: 'sess-best-1',
                student_id: 'std-1',
                student_name: 'Citra Kirana',
                nis: '3001',
                class_name: 'X IPA 1',
                score: 88,
                best_score: 88,
                attempts_count: 2,
                attempt_count: 2,
                attempts: [
                  { attempt_number: 1, session_id: 'sess-1', score: 65 },
                  { attempt_number: 2, session_id: 'sess-best-1', score: 88 },
                ],
                correct_count: 18,
                wrong_count: 2,
                essay_score: 0,
                total_questions: 20,
                status: 'passed',
              },
            ],
          },
        },
      }),
    },
    settingsApi: {
      get: vi.fn().mockResolvedValue({
        data: { data: { passing_grade: 75 } },
      }),
    },
  };
});

function renderWithClient(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });
  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>
  );
}

describe('ReportsPage - Multi-Attempt Best Score Display', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders "Nilai Terbaik" and "Percobaan" headers for multi-attempt exams', async () => {
    renderWithClient(<ReportsPage />);

    await waitFor(() => {
      expect(screen.getByText('Citra Kirana')).toBeDefined();
    });

    expect(screen.getByText('Nilai Terbaik')).toBeDefined();
    expect(screen.getByText('Percobaan')).toBeDefined();
    expect(screen.queryByText('Nilai Utama')).toBeNull();
    expect(screen.getAllByText('88.0').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('2x')).toBeDefined();
  });
});
