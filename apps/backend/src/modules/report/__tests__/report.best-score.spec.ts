import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ReportService } from '../report.service';

function UUID() {
  return crypto.randomUUID?.() ?? '00000000-0000-0000-0000-000000000001';
}

function createMockPrisma() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mock: Record<string, any> = {
    exam: { findFirst: vi.fn(), findUnique: vi.fn() },
    examSession: { findMany: vi.fn() },
    setting: { findFirst: vi.fn().mockResolvedValue({ passing_grade: 75 }) },
  };
  return mock;
}

describe('ReportService - Best Score Aggregation', () => {
  let service: ReportService;
  let mockPrisma: ReturnType<typeof createMockPrisma>;

  beforeEach(() => {
    mockPrisma = createMockPrisma();
    service = new ReportService(mockPrisma as any);
  });

  it('aggregates best score as max across all completed attempts for multi-attempt exams', async () => {
    const examId = UUID();
    const studentId = UUID();

    mockPrisma.exam.findFirst.mockResolvedValue({
      id: examId,
      title: 'Ujian Percobaan',
      max_attempts: 3,
      subject_id: 'sub-1',
      subject: { name: 'Matematika' },
    });

    mockPrisma.examSession.findMany.mockResolvedValue([
      {
        id: 'ses-1',
        student_id: studentId,
        attempt_number: 1,
        score: { total_score: 70, correct_count: 7, wrong_count: 3, essay_score: 0, total_questions: 10 },
        student: { id: studentId, full_name: 'Budi Santoso', nis: '1001', class: { name: 'X-1' } },
      },
      {
        id: 'ses-2',
        student_id: studentId,
        attempt_number: 2,
        score: { total_score: 90, correct_count: 9, wrong_count: 1, essay_score: 0, total_questions: 10 },
        student: { id: studentId, full_name: 'Budi Santoso', nis: '1001', class: { name: 'X-1' } },
      },
    ]);

    const report = await service.getExamReport(examId);
    expect(report.total_students).toBe(1);
    expect(report.students[0].score).toBe(90); // max(70, 90)
    expect(report.students[0].best_score).toBe(90);
    expect(report.students[0].attempts_count).toBe(2);
    expect(report.students[0].status).toBe('passed'); // 90 >= 75
  });

  it('keeps single attempt Option C dual score structure when max_attempts is 1', async () => {
    const examId = UUID();
    const studentId = UUID();

    mockPrisma.exam.findFirst.mockResolvedValue({
      id: examId,
      title: 'UTS Kimia',
      max_attempts: 1,
      subject_id: 'sub-1',
      subject: { name: 'Kimia' },
    });

    mockPrisma.examSession.findMany.mockResolvedValue([
      {
        id: 'ses-1',
        student_id: studentId,
        attempt_number: 1,
        is_remedial_allowed: true,
        score: { total_score: 65, correct_count: 6, wrong_count: 4, essay_score: 0, total_questions: 10 },
        student: { id: studentId, full_name: 'Siti Rahma', nis: '1002', class: { name: 'X-2' } },
      },
      {
        id: 'ses-2',
        student_id: studentId,
        attempt_number: 2,
        score: { total_score: 80, correct_count: 8, wrong_count: 2, essay_score: 0, total_questions: 10 },
        student: { id: studentId, full_name: 'Siti Rahma', nis: '1002', class: { name: 'X-2' } },
      },
    ]);

    const report = await service.getExamReport(examId);
    expect(report.students[0].main_score).toBe(65);
    expect(report.students[0].remedial_score).toBe(80);
    expect(report.students[0].best_score).toBe(80);
  });

  it('exports Excel with NILAI TERBAIK and PERCOBAAN columns for multi-attempt exams', async () => {
    const examId = UUID();
    const studentId = UUID();

    mockPrisma.exam.findFirst.mockResolvedValue({
      id: examId,
      title: 'Ujian Mandiri',
      max_attempts: 3,
      subject_id: 'sub-1',
      subject: { name: 'Fisika' },
    });

    mockPrisma.examSession.findMany.mockResolvedValue([
      {
        id: 'ses-1',
        student_id: studentId,
        attempt_number: 1,
        score: { total_score: 60, correct_count: 6, wrong_count: 4, essay_score: 0, total_questions: 10 },
        student: { id: studentId, full_name: 'Budi Santoso', nis: '1001', class: { name: 'X-1' } },
      },
      {
        id: 'ses-2',
        student_id: studentId,
        attempt_number: 2,
        score: { total_score: 85, correct_count: 8, wrong_count: 2, essay_score: 0, total_questions: 10 },
        student: { id: studentId, full_name: 'Budi Santoso', nis: '1001', class: { name: 'X-1' } },
      },
    ]);

    const ExcelJS = (await import('exceljs')).default;
    const buffer = await service.generateExcelReport(examId);
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);
    const sheet = workbook.getWorksheet('Laporan Nilai');

    expect(sheet).toBeDefined();
    const headerRow = sheet!.getRow(9);
    const headerValues = headerRow.values as string[];

    expect(headerValues).toContain('PERCOBAAN');
    expect(headerValues).toContain('NILAI TERBAIK');
    expect(headerValues).not.toContain('NILAI UTAMA');

    const studentRow = sheet!.getRow(10);
    const studentValues = studentRow.values as any[];
    expect(studentValues).toContain('2x');
    expect(studentValues).toContain(85);
  });
});
