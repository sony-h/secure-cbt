import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { NotificationBell, type DashboardNotification } from '../notification-bell';

const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

describe('NotificationBell', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  const initialItems: DashboardNotification[] = [
    {
      id: 'notif-1',
      title: 'Pelanggaran Terdeteksi',
      message: 'Siswa Ahmad Dahlan terdeteksi keluar dari aplikasi.',
      type: 'warning',
      timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
      read: false,
    },
    {
      id: 'notif-2',
      title: 'Ujian Disubmit',
      message: 'Siti Rahma telah menyelesaikan ujian Matematika.',
      type: 'success',
      timestamp: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
      read: true,
    },
  ];

  it('renders bell button and badge with unread count', () => {
    render(<NotificationBell initialNotifications={initialItems} />);

    // Unread count is 1
    const badge = screen.getByTestId('notification-badge');
    expect(badge).toBeTruthy();
    expect(badge.textContent).toBe('1');
  });

  it('renders notification items when open', () => {
    render(<NotificationBell initialNotifications={initialItems} open={true} />);

    expect(screen.getByText('Notifikasi')).toBeTruthy();
    expect(screen.getByText('Pelanggaran Terdeteksi')).toBeTruthy();
    expect(screen.getByText('Ujian Disubmit')).toBeTruthy();
  });

  it('marks all as read when "Tandai dibaca" is clicked', () => {
    render(<NotificationBell initialNotifications={initialItems} open={true} />);

    const markReadBtn = screen.getByRole('button', { name: /tandai dibaca/i });
    fireEvent.click(markReadBtn);

    expect(screen.queryByTestId('notification-badge')).toBeNull();
  });

  it('clears all notifications when "Bersihkan" is clicked and displays empty state', () => {
    render(<NotificationBell initialNotifications={initialItems} open={true} />);

    const clearBtn = screen.getByRole('button', { name: /bersihkan/i });
    fireEvent.click(clearBtn);

    expect(screen.getByText(/tidak ada notifikasi/i)).toBeTruthy();
  });
});
