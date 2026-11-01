import { ReportService } from '../report.service';
import ExcelJS from 'exceljs';
import { SessionStatus, SessionType } from '@secure-cbt/shared';
import { vi, describe, it, expect, beforeEach } from 'vitest';

function UUID() {
  return crypto.randomUUID?.() ?? '00000000-0000-0000-0000-000000000001';
}

describe('ReportService - Dual-Score Reporting (Option C)', () => {
  let service: ReportService;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      exam: { findFirst: vi.fn(), findUnique: vi.fn() },
      examSession: { findUnique: vi.fn(), findMany: vi.fn() },
      student: { findMany: vi.fn() },
      class: { findUnique: vi.fn() },
      setting: { findFirst: vi.fn() },
    };
    service = new ReportService(mockPrisma as any);
  });

  describe('getExamReport() with dual scores', () => {
    it('returns grouped student records with main_score, remedial_score, and attempt_count', async () => {
      const examId = UUID();
      const student1Id = UUID();
      const student2Id = UUID();

      mockPrisma.exam.findFirst.mockResolvedValue({
        id: examId,
        title: 'UTS Pemrograman Web',
        subject: { name: 'Pemrograman Web' },
      });

      mockPrisma.setting.findFirst.mockResolvedValue({
        passing_grade: 75,
      });

      // 3 sessions total: student 1 has 2 attempts, student 2 has 1 attempt
      mockPrisma.examSession.findMany.mockResolvedValue([
        {
          id: UUID(),
          exam_id: examId,
          student_id: student1Id,
          attempt_number: 1,
          session_type: SessionType.MAIN,
          is_remedial_allowed: true,
          status: SessionStatus.SUBMITTED,
          student: { full_name: 'Ahmad Faiz', nis: '1001', class: { name: 'X RPL 1' } },
          score: { total_score: 55, correct_count: 11, wrong_count: 9, essay_score: 0, total_questions: 20 },
        },
        {
          id: UUID(),
          exam_id: examId,
          student_id: student1Id,
          attempt_number: 2,
          session_type: SessionType.REMEDIAL,
          is_remedial_allowed: false,
          status: SessionStatus.SUBMITTED,
          student: { full_name: 'Ahmad Faiz', nis: '1001', class: { name: 'X RPL 1' } },
          score: { total_score: 85, correct_count: 17, wrong_count: 3, essay_score: 0, total_questions: 20 },
        },
        {
          id: UUID(),
          exam_id: examId,
          student_id: student2Id,
          attempt_number: 1,
          session_type: SessionType.MAIN,
          is_remedial_allowed: false,
          status: SessionStatus.SUBMITTED,
          student: { full_name: 'Budi Santoso', nis: '1002', class: { name: 'X RPL 1' } },
          score: { total_score: 90, correct_count: 18, wrong_count: 2, essay_score: 0, total_questions: 20 },
        },
      ]);

      const report = await service.getExamReport(examId);

      expect(report.total_students).toBe(2);
      expect(report.students).toHaveLength(2);

      const ahmad = report.students.find((s: any) => s.nis === '1001');
      expect(ahmad).toBeDefined();
      expect(ahmad?.main_score).toBe(55);
      expect(ahmad?.remedial_score).toBe(85);
      expect(ahmad?.attempt_count).toBe(2);
      expect(ahmad?.is_remedial_allowed).toBe(true);

      const budi = report.students.find((s: any) => s.nis === '1002');
      expect(budi).toBeDefined();
      expect(budi?.main_score).toBe(90);
      expect(budi?.remedial_score).toBeNull();
      expect(budi?.attempt_count).toBe(1);
      expect(budi?.is_remedial_allowed).toBe(false);
    });
  });

  describe('generateExcelReport() with dual scores', () => {
    it('produces Excel file containing NILAI UTAMA and NILAI REMEDIAL columns', async () => {
      const examId = UUID();
      const student1Id = UUID();

      mockPrisma.exam.findFirst.mockResolvedValue({
        id: examId,
        title: 'UTS Pemrograman Web',
        subject: { name: 'Pemrograman Web' },
      });

      mockPrisma.setting.findFirst.mockResolvedValue({
        passing_grade: 75,
      });

      mockPrisma.examSession.findMany.mockResolvedValue([
        {
          id: UUID(),
          exam_id: examId,
          student_id: student1Id,
          attempt_number: 1,
          session_type: SessionType.MAIN,
          is_remedial_allowed: true,
          status: SessionStatus.SUBMITTED,
          student: { full_name: 'Ahmad Faiz', nis: '1001', class: { name: 'X RPL 1' } },
          score: { total_score: 55, correct_count: 11, wrong_count: 9, essay_score: 0, total_questions: 20 },
        },
        {
          id: UUID(),
          exam_id: examId,
          student_id: student1Id,
          attempt_number: 2,
          session_type: SessionType.REMEDIAL,
          is_remedial_allowed: false,
          status: SessionStatus.SUBMITTED,
          student: { full_name: 'Ahmad Faiz', nis: '1001', class: { name: 'X RPL 1' } },
          score: { total_score: 85, correct_count: 17, wrong_count: 3, essay_score: 0, total_questions: 20 },
        },
      ]);

      const buffer = await service.generateExcelReport(examId);
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(buffer);
      const sheet = workbook.getWorksheet('Laporan Nilai');

      expect(sheet).toBeDefined();
      const headerRow = sheet!.getRow(9);
      const headerValues = headerRow.values as string[];

      expect(headerValues).toContain('NILAI UTAMA');
      expect(headerValues).toContain('NILAI REMEDIAL');

      // Row 10 is student 1
      const studentRow = sheet!.getRow(10);
      const studentValues = studentRow.values as any[];
      expect(studentValues).toContain(55);
      expect(studentValues).toContain(85);
    });
  });
});
