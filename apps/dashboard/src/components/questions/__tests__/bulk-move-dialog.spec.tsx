import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { BulkMoveDialog } from '../bulk-move-dialog';
import { questionBankApi } from '@/lib/api-service';

vi.mock('@/lib/api-service', () => ({
  questionBankApi: {
    bulkMoveQuestions: vi.fn(),
  },
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

const mockBanks = [
  { id: 'bank-1', title: 'Matematika Wajib X', subject: { name: 'Matematika' } },
  { id: 'bank-2', title: 'Fisika Dasar X', subject: { name: 'Fisika' } },
];

describe('BulkMoveDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders modal with banks list and calls bulkMoveQuestions on submit', async () => {
    (questionBankApi.bulkMoveQuestions as any).mockResolvedValue({
      data: { success: true, message: '2 soal berhasil dipindahkan', data: { count: 2 } },
    });

    const onClose = vi.fn();
    const onSuccess = vi.fn();

    render(
      <BulkMoveDialog
        open={true}
        onClose={onClose}
        selectedQuestionIds={['q-1', 'q-2']}
        banks={mockBanks}
        currentBankId="bank-1"
        onSuccess={onSuccess}
      />
    );

    expect(screen.getByText(/Pindahkan 2 soal terpilih ke bank soal tujuan/i)).toBeTruthy();

    const select = screen.getByLabelText(/Bank Soal Tujuan/i);
    expect(select).toBeTruthy();

    // Select bank-2
    fireEvent.change(select, { target: { value: 'bank-2' } });

    const submitBtn = screen.getByRole('button', { name: /Pindahkan/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(questionBankApi.bulkMoveQuestions).toHaveBeenCalledWith({
        ids: ['q-1', 'q-2'],
        target_bank_id: 'bank-2',
      });
      expect(onSuccess).toHaveBeenCalled();
      expect(onClose).toHaveBeenCalled();
    });
  });
});
