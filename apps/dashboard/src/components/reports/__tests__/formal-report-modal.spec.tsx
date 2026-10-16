import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import {
  FormalReportModal,
  calculateReportSummary,
  FORMAL_REPORT_STORAGE_KEY,
  DEFAULT_FORMAL_REPORT_CONFIG,
  type GradeResultItem,
} from '../formal-report-modal';

describe('FormalReportModal & Helpers', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  describe('calculateReportSummary', () => {
    it('returns zeroes when results are undefined or empty', () => {
      expect(calculateReportSummary(undefined)).toEqual({
        average: '0',
        min: '0',
        max: '0',
        count: 0,
        numericAverage: 0,
        numericMin: 0,
        numericMax: 0,
      });

      expect(calculateReportSummary([])).toEqual({
        average: '0',
        min: '0',
        max: '0',
        count: 0,
        numericAverage: 0,
        numericMin: 0,
        numericMax: 0,
      });
    });

    it('calculates average, min, and max accurately with decimal scores', () => {
      const mockScores = [
        { total_score: 90.1 },
        { total_score: 0 },
        { total_score: 93.4 },
        { total_score: 0 },
        { total_score: 96.7 },
        { total_score: 100 },
      ];

      // Sum: 380.2, Count: 6 -> 380.2 / 6 = 63.3666... -> 63.37
      const summary = calculateReportSummary(mockScores);
      expect(summary.count).toBe(6);
      expect(summary.average).toBe('63.37');
      expect(summary.min).toBe('0');
      expect(summary.max).toBe('100');
      expect(summary.numericAverage).toBe(63.37);
      expect(summary.numericMin).toBe(0);
      expect(summary.numericMax).toBe(100);
    });

    it('handles all 100s or identical integer scores cleanly', () => {
      const mockScores = [{ total_score: 85 }, { total_score: 85 }, { total_score: 85 }];
      const summary = calculateReportSummary(mockScores);
      expect(summary.average).toBe('85');
      expect(summary.min).toBe('85');
      expect(summary.max).toBe('85');
    });
  });

  describe('FormalReportModal Component', () => {
    const mockResults: GradeResultItem[] = [
      {
        session_id: 's1',
        student: { nis: '2720', full_name: 'Achmad Nur Arrafa' },
        total_score: 90.1,
      },
      {
        session_id: 's2',
        student: { nis: '2742', full_name: 'Adella Ristiana Salsabila' },
        total_score: 0,
      },
      {
        session_id: 's3',
        student: { nis: '2740', full_name: 'Adip Karomi Fazza' },
        total_score: 93.4,
      },
    ];

    const mockExam = {
      id: 'exam-1',
      title: 'Assessment Sumatif Tengah Semester Genap',
      subject: { name: 'Koding dan Kecerdasan Artifisial', code: 'KKA' },
    };

    it('renders the formal report preview with kop, table, summary box, and default signers', () => {
      render(
        <FormalReportModal
          open={true}
          onClose={vi.fn()}
          exam={mockExam}
          className="X AKL"
          results={mockResults}
        />,
      );

      // Verify Title & Kop
      expect(screen.getAllByText(/Assessment Sumatif Tengah Semester Genap/i).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/SMK INFORMATIKA WONOSOBO/i).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/Tahun Ajaran 2025 - 2026/i).length).toBeGreaterThan(0);

      // Verify Metadata
      expect(screen.getAllByText(/X AKL/i).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/Jawa Tengah/i).length).toBeGreaterThan(0);

      // Verify Score Table contents
      expect(screen.getAllByText('Achmad Nur Arrafa').length).toBeGreaterThan(0);
      expect(screen.getAllByText('2720').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Adella Ristiana Salsabila').length).toBeGreaterThan(0);

      // Verify Summary Box (90.1 + 0 + 93.4) / 3 = 61.17
      expect(screen.getAllByText('Rata - Rata').length).toBeGreaterThan(0);
      expect(screen.getAllByText('61.17').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Terendah').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Tertinggi').length).toBeGreaterThan(0);

      // Verify Default Signers
      expect(screen.getAllByText('Sony Hartono, S.Kom').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Dadik Wahyu Ratmoko, S.Si').length).toBeGreaterThan(0);
    });

    it('allows editing custom signers and adding a new signer', async () => {
      render(
        <FormalReportModal
          open={true}
          onClose={vi.fn()}
          exam={mockExam}
          className="X AKL"
          results={mockResults}
        />,
      );

      // Switch to Settings tab
      const settingsTab = screen.getByRole('tab', { name: /Atur Tanda Tangan & Kop/i });
      fireEvent.click(settingsTab);

      // Verify initial signers (2 inputs for name)
      expect(screen.getByDisplayValue('Sony Hartono, S.Kom')).toBeDefined();
      expect(screen.getByDisplayValue('Dadik Wahyu Ratmoko, S.Si')).toBeDefined();

      // Click "Tambah Penandatangan"
      const addSignerBtn = screen.getByRole('button', { name: /Tambah Penandatangan/i });
      fireEvent.click(addSignerBtn);

      // Find the newly added signer inputs (there should now be 3 roles)
      const roleInputs = screen.getAllByPlaceholderText(/Cth: Kepala Sekolah/i);
      expect(roleInputs.length).toBe(3);

      // Edit the new signer
      fireEvent.change(roleInputs[2]!, { target: { value: 'Pengawas Ujian' } });

      const nameInputs = screen.getAllByPlaceholderText(/Cth: Dadik Wahyu Ratmoko/i);
      fireEvent.change(nameInputs[2]!, { target: { value: 'Budi Santoso, M.Pd' } });

      // Switch back to Preview tab
      const previewTab = screen.getByRole('tab', { name: /Pratinjau Cetak Formal/i });
      fireEvent.click(previewTab);

      // Verify new signer is rendered in document preview
      expect(screen.getAllByText('Pengawas Ujian').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Budi Santoso, M.Pd').length).toBeGreaterThan(0);
    });

    it('persists changes in localStorage and loads saved settings', async () => {
      // 1. Initial render and modify assessment title & city
      const { unmount } = render(
        <FormalReportModal
          open={true}
          onClose={vi.fn()}
          exam={mockExam}
          className="X AKL"
          results={mockResults}
        />,
      );

      // Go to settings tab
      fireEvent.click(screen.getByRole('tab', { name: /Atur Tanda Tangan & Kop/i }));

      const titleInput = screen.getByLabelText(/Judul Asesmen/i);
      fireEvent.change(titleInput, { target: { value: 'PENILAIAN AKHIR SEMESTER GASAL' } });

      const cityInput = screen.getByLabelText(/Kota \/ Kabupaten/i);
      fireEvent.change(cityInput, { target: { value: 'KAB. TEMANGGUNG' } });

      await waitFor(() => {
        const stored = localStorage.getItem(FORMAL_REPORT_STORAGE_KEY);
        expect(stored).not.toBeNull();
        const parsed = JSON.parse(stored!);
        expect(parsed.assessmentTitle).toBe('PENILAIAN AKHIR SEMESTER GASAL');
        expect(parsed.regency).toBe('KAB. TEMANGGUNG');
      });

      unmount();

      // 2. Re-render modal: verify it loads persisted configuration from localStorage
      render(
        <FormalReportModal
          open={true}
          onClose={vi.fn()}
          exam={mockExam}
          className="X AKL"
          results={mockResults}
        />,
      );

      expect(screen.getAllByText(/PENILAIAN AKHIR SEMESTER GASAL/i).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/KAB. TEMANGGUNG/i).length).toBeGreaterThan(0);
    });

    it('resets settings to defaults when "Reset ke Default" is clicked', async () => {
      // Set some custom config in localStorage
      localStorage.setItem(
        FORMAL_REPORT_STORAGE_KEY,
        JSON.stringify({
          ...DEFAULT_FORMAL_REPORT_CONFIG,
          schoolName: 'SMA KUSTOM 99',
        }),
      );

      render(
        <FormalReportModal
          open={true}
          onClose={vi.fn()}
          exam={mockExam}
          className="X AKL"
          results={mockResults}
        />,
      );

      // Switch to settings
      fireEvent.click(screen.getByRole('tab', { name: /Atur Tanda Tangan & Kop/i }));
      expect(screen.getByDisplayValue('SMA KUSTOM 99')).toBeDefined();

      // Click Reset ke Default
      const resetBtn = screen.getByRole('button', { name: /Reset ke Default/i });
      fireEvent.click(resetBtn);

      await waitFor(() => {
        expect(screen.getByDisplayValue('SMK INFORMATIKA WONOSOBO')).toBeDefined();
        const stored = JSON.parse(localStorage.getItem(FORMAL_REPORT_STORAGE_KEY)!);
        expect(stored.schoolName).toBe('SMK INFORMATIKA WONOSOBO');
      });
    });

    it('triggers window.print and sets printing class when Cetak Dokumen is clicked', () => {
      const printSpy = vi.spyOn(window, 'print').mockImplementation(() => {});

      render(
        <FormalReportModal
          open={true}
          onClose={vi.fn()}
          exam={mockExam}
          className="X AKL"
          results={mockResults}
        />,
      );

      const printBtn = screen.getByRole('button', { name: /Cetak Dokumen \(Print \/ PDF\)/i });
      fireEvent.click(printBtn);

      expect(printSpy).toHaveBeenCalled();
      expect(document.body.classList.contains('printing-formal-report')).toBe(true);
    });
  });
});
