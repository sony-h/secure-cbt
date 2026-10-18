import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import React from 'react';
import {
  NotificationBell,
  pushDashboardNotification,
} from '../notification-bell';
import { handleMonitoringSocketEvent } from '../use-notification-socket';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

describe('Realtime Notification Socket Integration', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('adds a new notification when pushDashboardNotification is dispatched', () => {
    render(<NotificationBell initialNotifications={[]} open={true} />);

    expect(screen.getByText(/tidak ada notifikasi/i)).toBeTruthy();

    act(() => {
      pushDashboardNotification({
        title: 'Pelanggaran Baru',
        message: 'Siswa Budi keluar dari aplikasi',
        type: 'warning',
      });
    });

    expect(screen.getByText('Pelanggaran Baru')).toBeTruthy();
    expect(screen.getByText('Siswa Budi keluar dari aplikasi')).toBeTruthy();
  });

  it('maps warning.triggered socket event into warning notification', () => {
    const pushSpy = vi.fn();

    handleMonitoringSocketEvent(
      'warning.triggered',
      {
        studentName: 'Andi Saputra',
        event: 'SPLIT_SCREEN',
        count: 2,
      },
      pushSpy,
    );

    expect(pushSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        title: expect.stringContaining('Andi Saputra'),
        type: 'warning',
        message: expect.stringContaining('SPLIT_SCREEN'),
      }),
    );
  });

  it('maps exam.submitted socket event into success notification', () => {
    const pushSpy = vi.fn();

    handleMonitoringSocketEvent(
      'exam.submitted',
      {
        studentName: 'Dewi Lestari',
      },
      pushSpy,
    );

    expect(pushSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Ujian Diselesaikan',
        type: 'success',
        message: expect.stringContaining('Dewi Lestari'),
      }),
    );
  });

  it('maps session.force_submit socket event into danger notification', () => {
    const pushSpy = vi.fn();

    handleMonitoringSocketEvent(
      'session.force_submit',
      {
        studentName: 'Rudi',
      },
      pushSpy,
    );

    expect(pushSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Sesi Dihentikan',
        type: 'danger',
        message: expect.stringContaining('Rudi'),
      }),
    );
  });
});
