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
      adjustWarnings: vi.fn().mockResolvedValue({ data: { success: true } }),
      resetWarnings: vi.fn().mockResolvedValue({ data: { success: true } }),
      extendTime: vi.fn().mockResolvedValue({ data: { success: true } }),
      unlock: vi.fn().mockResolvedValue({ data: { success: true } }),
      forceSubmit: vi.fn().mockResolvedValue({ data: { success: true } }),
    },
  };
});

describe('StudentActionDialog', () => {
  const mockSession: ActionStudentSession = {
    id: 'sess-123',
    student_user_id: 'user-std-123',
    student: {
      nis: '20260101',
      full_name: 'Dewi Sartika',
      class: { name: 'XII IPA 1' },
    },
    status: 'ACTIVE',
    warning_count: 2,
    remaining_time_seconds: 1800,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render strike stepper buttons and two-way time adjustments', () => {
    render(
      <StudentActionDialog
        session={mockSession}
        open={true}
        onOpenChange={() => {}}
      />
    );

    expect(screen.getByText('-1 Strike')).toBeDefined();
    expect(screen.getByText('+1 Strike')).toBeDefined();
    expect(screen.getByText('Reset 0')).toBeDefined();
    expect(screen.getByText('+5m')).toBeDefined();
    expect(screen.getByText('-5m')).toBeDefined();
  });

  it('should call adjustWarnings with delta 1 when +1 Strike is clicked', async () => {
    render(
      <StudentActionDialog
        session={mockSession}
        open={true}
        onOpenChange={() => {}}
      />
    );

    fireEvent.click(screen.getByText('+1 Strike'));
    await waitFor(() => {
      expect(apiService.sessionApi.adjustWarnings).toHaveBeenCalledWith('sess-123', 1);
    });
  });

  it('should call adjustWarnings with delta -1 when -1 Strike is clicked', async () => {
    render(
      <StudentActionDialog
        session={mockSession}
        open={true}
        onOpenChange={() => {}}
      />
    );

    fireEvent.click(screen.getByText('-1 Strike'));
    await waitFor(() => {
      expect(apiService.sessionApi.adjustWarnings).toHaveBeenCalledWith('sess-123', -1);
    });
  });

  it('should call extendTime with negative minutes when -5m is clicked', async () => {
    render(
      <StudentActionDialog
        session={mockSession}
        open={true}
        onOpenChange={() => {}}
      />
    );

    fireEvent.click(screen.getByText('-5m'));
    await waitFor(() => {
      expect(apiService.sessionApi.extendTime).toHaveBeenCalledWith('sess-123', -5);
    });
  });

  it('should disable strike steppers and reset button if session is EXPIRED', () => {
    const expiredSession = {
      ...mockSession,
      status: 'EXPIRED',
      warning_count: 2,
    };

    render(
      <StudentActionDialog
        session={expiredSession}
        open={true}
        onOpenChange={() => {}}
      />
    );

    expect((screen.getByText('+1 Strike').closest('button') as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByText('-1 Strike').closest('button') as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByText('Reset 0').closest('button') as HTMLButtonElement).disabled).toBe(true);
  });
});
