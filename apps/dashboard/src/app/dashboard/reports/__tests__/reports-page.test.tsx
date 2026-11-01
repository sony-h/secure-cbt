import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import ReportsPage from '../page';
import * as apiService from '@/lib/api-service';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams('exam=exam-1'),
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
              id: 'exam-1',
              title: 'UTS Pemrograman Web',
              subject: { name: 'Pemrograman Web' },
              status: 'PUBLISHED',
              _count: { exam_sessions: 2 },
            },
          ],
        },
      }),
      getById: vi.fn().mockResolvedValue({
        data: {
          data: {
            id: 'exam-1',
            exam_classes: [{ class: { id: 'cls-1', name: 'X RPL 1' } }],
          },
        },
      }),
    },
    academicApi: {
      getClasses: vi.fn().mockResolvedValue({
        data: { data: [{ id: 'cls-1', name: 'X RPL 1' }] },
      }),
    },
    reportApi: {
      getExamReport: vi.fn().mockResolvedValue({
        data: {
          data: {
            exam_id: 'exam-1',
            exam_title: 'UTS Pemrograman Web',
            subject_name: 'Pemrograman Web',
            students: [
              {
                session_id: 'sess-1',
                attempt1_session_id: 'sess-1',
                attempt2_session_id: null,
                student_id: 'std-1',
                student_name: 'Ahmad Faiz',
                nis: '1001',
                class_name: 'X RPL 1',
                score: 55,
                main_score: 55,
                remedial_score: null,
                is_remedial_allowed: false,
                attempt_count: 1,
                correct_count: 11,
                wrong_count: 9,
                essay_score: 0,
                total_questions: 20,
                status: 'failed',
              },
              {
                session_id: 'sess-2',
                attempt1_session_id: 'sess-2-1',
                attempt2_session_id: 'sess-2-2',
                student_id: 'std-2',
                student_name: 'Budi Santoso',
                nis: '1002',
                class_name: 'X RPL 1',
                score: 85,
                main_score: 60,
                remedial_score: 85,
                is_remedial_allowed: true,
                attempt_count: 2,
                correct_count: 17,
                wrong_count: 3,
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
    sessionApi: {
      authorizeRemedial: vi.fn().mockResolvedValue({ data: { success: true } }),
      bulkAuthorizeRemedial: vi.fn().mockResolvedValue({ data: { success: true, count: 1 } }),
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

describe('ReportsPage - Dual-Score & Remedial Workflows', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders dual-score table headers (Nilai Utama & Nilai Remedial) and student values', async () => {
    renderWithClient(<ReportsPage />);

    await waitFor(() => {
      expect(screen.getByText('Ahmad Faiz')).toBeDefined();
    });

    expect(screen.getByText('Nilai Utama')).toBeDefined();
    expect(screen.getByText('Nilai Remedial')).toBeDefined();

    // Ahmad Faiz: main_score 55, remedial_score —
    expect(screen.getByText('55.0')).toBeDefined();

    // Budi Santoso: main_score 60, remedial_score 85
    expect(screen.getByText('60.0')).toBeDefined();
    expect(screen.getByText('85.0')).toBeDefined();
  });

  it('renders individual Izinkan Remedial button for eligible student (Ahmad Faiz)', async () => {
    renderWithClient(<ReportsPage />);

    await waitFor(() => {
      expect(screen.getByText('Ahmad Faiz')).toBeDefined();
    });

    const remedialButtons = screen.getAllByRole('button', { name: /^Izinkan Remedial$/i });
    expect(remedialButtons.length).toBeGreaterThanOrEqual(1);

    fireEvent.click(remedialButtons[0]!);

    await waitFor(() => {
      expect(apiService.sessionApi.authorizeRemedial).toHaveBeenCalledWith('sess-1');
    });
  });

  it('renders bulk remedial authorization button and triggers bulk action', async () => {
    renderWithClient(<ReportsPage />);

    await waitFor(() => {
      expect(screen.getByText('Ahmad Faiz')).toBeDefined();
    });

    const bulkBtn = screen.getByRole('button', { name: /Izinkan Remedial Semua/i });
    expect(bulkBtn).toBeDefined();

    fireEvent.click(bulkBtn);

    // Confirmation dialog appears
    const confirmBtn = await screen.findByRole('button', { name: /Ya, Izinkan Remedial Massal/i });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(apiService.sessionApi.bulkAuthorizeRemedial).toHaveBeenCalledWith('exam-1', {
        student_ids: ['std-1'],
      });
    });
  });
});
