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
      grantExtraAttempt: vi.fn().mockResolvedValue({ data: { success: true } }),
    },
  };
});

describe('StudentActionDialog - Grant Attempt', () => {
  const mockSubmittedSession: ActionStudentSession = {
    id: 'sess-submitted-1',
    student_user_id: 'user-std-1',
    student: {
      nis: '20260101',
      full_name: 'Budi Handoko',
      class: { name: 'XII IPA 1' },
    },
    status: 'SUBMITTED',
    warning_count: 0,
    remaining_time_seconds: 0,
    attempt_number: 1,
    is_remedial_allowed: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders "+1 Kuota Percobaan" action button and triggers sessionApi.grantExtraAttempt', async () => {
    const onSuccess = vi.fn();
    render(
      <StudentActionDialog
        session={mockSubmittedSession}
        open={true}
        onOpenChange={() => {}}
        onSuccess={onSuccess}
      />
    );

    const grantBtn = screen.getByRole('button', { name: /\+1 Kuota Percobaan/i });
    expect(grantBtn).toBeDefined();

    fireEvent.click(grantBtn);

    await waitFor(() => {
      expect(apiService.sessionApi.grantExtraAttempt).toHaveBeenCalledWith('sess-submitted-1', expect.anything());
      expect(onSuccess).toHaveBeenCalled();
    });
  });
});
