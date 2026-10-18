import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { StudentExportDialog } from '../student-export-dialog';

describe('StudentExportDialog', () => {
  const sampleStudents = [
    {
      id: 's-1',
      nis: '1001',
      full_name: 'Ahmad Dahlan',
      class: { id: 'c-1', name: 'X AKL 1' },
      status: 'ACTIVE',
      plain_password: 'AKL-ab12cd',
      created_at: '2026-01-01',
    },
    {
      id: 's-2',
      nis: '1002',
      full_name: 'Budi Raharjo',
      class: { id: 'c-1', name: 'X AKL 1' },
      status: 'ACTIVE',
      plain_password: 'AKL-ef34gh',
      created_at: '2026-01-01',
    },
  ];

  const sampleClasses = [
    { id: 'c-1', name: 'X AKL 1' },
    { id: 'c-2', name: 'XI TJKT 2' },
  ];

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('renders modal with format options and handles template toggle between tabular and card', async () => {
    const onClose = vi.fn();
    const onExportExcel = vi.fn().mockResolvedValue(undefined);

    render(
      <StudentExportDialog
        open={true}
        onClose={onClose}
        students={sampleStudents}
        classes={sampleClasses}
        onExportExcel={onExportExcel}
      />
    );

    expect(screen.getByText(/Ekspor Kredensial Siswa/i)).toBeTruthy();

    // Default or switch to PDF
    const pdfRadio = screen.getByLabelText(/PDF \/ Cetak Dokumen/i);
    fireEvent.click(pdfRadio);

    // Template options should be visible
    expect(screen.getByText(/Daftar Tabel/i)).toBeTruthy();
    expect(screen.getByText(/Kartu Peserta/i)).toBeTruthy();

    // Toggle to Kartu Peserta
    const cardTemplateRadio = screen.getByLabelText(/Kartu Peserta/i);
    fireEvent.click(cardTemplateRadio);
    expect((cardTemplateRadio as HTMLInputElement).checked).toBe(true);
  });

  it('calls onExportExcel when Excel format is selected and export is clicked', async () => {
    const onClose = vi.fn();
    const onExportExcel = vi.fn().mockResolvedValue(undefined);

    render(
      <StudentExportDialog
        open={true}
        onClose={onClose}
        students={sampleStudents}
        classes={sampleClasses}
        onExportExcel={onExportExcel}
      />
    );

    const excelRadio = screen.getByLabelText(/Excel \(\.xlsx\)/i);
    fireEvent.click(excelRadio);

    const exportBtn = screen.getByTestId('export-action-button');
    fireEvent.click(exportBtn);

    await waitFor(() => {
      expect(onExportExcel).toHaveBeenCalledTimes(1);
    });
  });

  it('triggers window.print when PDF format is selected and print action is clicked', async () => {
    const printSpy = vi.spyOn(window, 'print').mockImplementation(() => {});
    const onClose = vi.fn();
    const onExportExcel = vi.fn();

    render(
      <StudentExportDialog
        open={true}
        onClose={onClose}
        students={sampleStudents}
        classes={sampleClasses}
        onExportExcel={onExportExcel}
      />
    );

    const pdfRadio = screen.getByLabelText(/PDF \/ Cetak Dokumen/i);
    fireEvent.click(pdfRadio);

    const exportBtn = screen.getByTestId('export-action-button');
    fireEvent.click(exportBtn);

    expect(printSpy).toHaveBeenCalled();
  });
});
