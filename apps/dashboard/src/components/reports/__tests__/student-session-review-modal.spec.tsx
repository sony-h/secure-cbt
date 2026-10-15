import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StudentSessionReviewModal } from '../student-session-review-modal';
import * as apiService from '@/lib/api-service';

vi.mock('@/lib/api-service', async (importOriginal) => {
  const actual = await importOriginal<typeof apiService>();
  return {
    ...actual,
    reportApi: {
      ...actual.reportApi,
      getSessionReview: vi.fn(),
    },
  };
});

describe('StudentSessionReviewModal', () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  const renderComponent = (props: any) =>
    render(
      <QueryClientProvider client={queryClient}>
        <StudentSessionReviewModal {...props} />
      </QueryClientProvider>,
    );

  it('renders student summary, questions, answer choices, and explanations', async () => {
    vi.mocked(apiService.reportApi.getSessionReview).mockResolvedValue({
      data: {
        success: true,
        data: {
          session_id: 'sess-123',
          student_id: 'std-1',
          student_name: 'Ahmad Siswa',
          nis: '202501001',
          class_name: 'XII RPL 1',
          exam_id: 'exam-1',
          exam_title: 'Ujian KKA',
          subject_name: 'KKA',
          score: 100,
          correct_count: 1,
          wrong_count: 0,
          submitted_at: '2026-10-15T10:00:00Z',
          status: 'SUBMITTED',
          questions: [
            {
              id: 'q-1',
              number: 1,
              type: 'MULTIPLE_CHOICE',
              content: 'Apa fungsi firewall dalam jaringan?',
              image_url: null,
              difficulty: 'MEDIUM',
              explanation: 'Firewall bertugas menyaring paket lalu lintas data.',
              student_answer: 'opt-b',
              is_correct: true,
              score: 100,
              feedback: null,
              options: [
                { id: 'opt-a', content: 'Mempercepat internet', image_url: null, is_correct: false, order: 1 },
                { id: 'opt-b', content: 'Menyaring lalu lintas data', image_url: null, is_correct: true, order: 2 },
              ],
            },
          ],
        },
      },
    } as any);

    renderComponent({
      open: true,
      onClose: vi.fn(),
      sessionId: 'sess-123',
      studentName: 'Ahmad Siswa',
      nis: '202501001',
    });

    expect(await screen.findByText(/Ahmad Siswa/i)).toBeTruthy();
    expect(screen.getByText(/202501001/i)).toBeTruthy();
    expect(screen.getByText(/Apa fungsi firewall dalam jaringan\?/i)).toBeTruthy();
    expect(screen.getByText(/Firewall bertugas menyaring paket lalu lintas data/i)).toBeTruthy();
    expect(screen.getByText(/Menyaring lalu lintas data/i)).toBeTruthy();
  });
});
