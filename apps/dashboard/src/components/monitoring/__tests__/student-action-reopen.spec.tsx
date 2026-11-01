import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { StudentActionDialog, ActionStudentSession } from '../student-action-dialog';
import * as apiService from '@/lib/api-service';

vi.mock('@/lib/api-service', async (importOriginal) => {
  const actual = await importOriginal<typeof apiService>();
  return {
    ...actual,
    sessionApi: {
      ...actual.sessionApi,
      reopen: vi.fn().mockResolvedValue({ data: { success: true } }),
      authorizeRemedial: vi.fn().mockResolvedValue({ data: { success: true } }),
    },
  };
});

describe('StudentActionDialog - Reopen & Remedial Actions', () => {
  const mockSubmittedSession: ActionStudentSession = {
    id: 'sess-submitted-1',
    student_user_id: 'user-std-1',
    student: {
      nis: '20260101',
      full_name: 'Dewi Sartika',
      class: { name: 'XII IPA 1' },
    },
    status: 'SUBMITTED',
    warning_count: 2,
    remaining_time_seconds: 0,
    attempt_number: 1,
    is_remedial_allowed: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders recovery section for SUBMITTED session and calls reopen on submit', async () => {
    render(
      <StudentActionDialog
        session={mockSubmittedSession}
        open={true}
        onOpenChange={() => {}}
      />
    );

    const reopenBtn = screen.getByRole('button', { name: /Buka Kembali Sesi/i });
    expect(reopenBtn).toBeDefined();

    fireEvent.click(reopenBtn);

    await waitFor(() => {
      expect(apiService.sessionApi.reopen).toHaveBeenCalledWith('sess-submitted-1', {
        additional_minutes: 5,
        reset_strikes: true,
      });
    });
  });

  it('renders remedial authorization button and calls authorizeRemedial', async () => {
    render(
      <StudentActionDialog
        session={mockSubmittedSession}
        open={true}
        onOpenChange={() => {}}
      />
    );

    const remedialBtn = screen.getByRole('button', { name: /Izinkan Remedial/i });
    expect(remedialBtn).toBeDefined();

    fireEvent.click(remedialBtn);

    await waitFor(() => {
      expect(apiService.sessionApi.authorizeRemedial).toHaveBeenCalledWith('sess-submitted-1');
    });
  });

  it('displays authorized status when is_remedial_allowed is true', () => {
    render(
      <StudentActionDialog
        session={{
          ...mockSubmittedSession,
          is_remedial_allowed: true,
        }}
        open={true}
        onOpenChange={() => {}}
      />
    );

    expect(screen.getByText(/Remedial Diizinkan/i)).toBeDefined();
  });
});
