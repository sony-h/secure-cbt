import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { ProctorBroadcastModal, BroadcastTargetStudent } from '../proctor-broadcast-modal';
import * as apiService from '@/lib/api-service';

vi.mock('@/lib/api-service', async (importOriginal) => {
  const actual = await importOriginal<typeof apiService>();
  return {
    ...actual,
    monitoringApi: {
      ...actual.monitoringApi,
      broadcastAnnouncement: vi.fn().mockResolvedValue({ data: { success: true } }),
    },
  };
});

describe('ProctorBroadcastModal', () => {
  const mockStudents: BroadcastTargetStudent[] = [
    {
      id: 'sess-1',
      student_user_id: 'user-std-1',
      student: { nis: '1001', full_name: 'Ahmad Siswa', class: { name: 'XII RPL 1' } },
    },
    {
      id: 'sess-2',
      student_user_id: 'user-std-2',
      student: { nis: '1002', full_name: 'Budi Santoso', class: { name: 'XII RPL 1' } },
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('broadcasts to all students by default when targetMode is all', async () => {
    render(
      <ProctorBroadcastModal
        examId="exam-123"
        examTitle="Ujian Matematika"
        open={true}
        onOpenChange={vi.fn()}
        activeSessions={mockStudents}
      />,
    );

    expect(screen.getByText(/Semua Siswa di Ruangan/i)).toBeTruthy();
    expect(screen.getByText(/Siswa Tertentu/i)).toBeTruthy();

    const textarea = screen.getByPlaceholderText(/Contoh: Siswa dipersilakan/i);
    fireEvent.change(textarea, { target: { value: 'Waktu kurang 15 menit' } });

    const submitBtn = screen.getByRole('button', { name: /Siarkan Pengumuman/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(apiService.monitoringApi.broadcastAnnouncement).toHaveBeenCalledWith(
        'exam-123',
        expect.objectContaining({
          message: 'Waktu kurang 15 menit',
          urgency: 'low',
          studentUserId: undefined,
        }),
      );
    });
  });

  it('allows targeting a specific student and passes studentUserId on submit', async () => {
    render(
      <ProctorBroadcastModal
        examId="exam-123"
        examTitle="Ujian Matematika"
        open={true}
        onOpenChange={vi.fn()}
        activeSessions={mockStudents}
      />,
    );

    // Click "Siswa Tertentu" tab
    const specificBtn = screen.getByText(/Siswa Tertentu/i);
    fireEvent.click(specificBtn);

    // Select dropdown should be visible
    const select = screen.getByLabelText(/Pilih Peserta Ujian/i);
    expect(select).toBeTruthy();

    // Select second student Budi Santoso
    fireEvent.change(select, { target: { value: 'sess-2' } });

    const textarea = screen.getByPlaceholderText(/Contoh: Siswa dipersilakan/i);
    fireEvent.change(textarea, { target: { value: 'Jangan buka jendela lain' } });

    const submitBtn = screen.getByRole('button', { name: /Kirim Pesan ke Budi Santoso/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(apiService.monitoringApi.broadcastAnnouncement).toHaveBeenCalledWith(
        'exam-123',
        expect.objectContaining({
          message: 'Jangan buka jendela lain',
          studentUserId: 'user-std-2',
          studentName: 'Budi Santoso',
        }),
      );
    });
  });
});
