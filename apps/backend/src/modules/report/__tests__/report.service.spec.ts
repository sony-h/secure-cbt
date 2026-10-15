import { NotFoundException } from '@nestjs/common';
import ExcelJS from 'exceljs';
import { ReportService } from '../report.service';
import { QuestionType, SessionStatus, DifficultyLevel } from '@secure-cbt/shared';
import { vi, describe, it, expect, beforeEach } from 'vitest';

function UUID() { return crypto.randomUUID?.() ?? '00000000-0000-0000-0000-000000000001'; }

describe('ReportService', () => {
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

  describe('getSessionReview()', () => {
    it('should throw NotFoundException if session is not found', async () => {
      mockPrisma.examSession.findUnique.mockResolvedValue(null);
      await expect(service.getSessionReview(UUID())).rejects.toThrow(NotFoundException);
    });

    it('should return session review with question details, student answer, key, and explanation even if exam is ongoing', async () => {
      const sessionId = UUID();
      const questionId = UUID();
      const opt1Id = UUID();
      const opt2Id = UUID();

      mockPrisma.examSession.findUnique.mockResolvedValue({
        id: sessionId,
        student_id: UUID(),
        status: SessionStatus.SUBMITTED,
        submitted_at: new Date('2026-10-15T10:00:00Z'),
        student: {
          full_name: 'Ahmad Siswa',
          nis: '202501001',
          class: { name: 'XII RPL 1' },
        },
        score: {
          total_score: 100,
          correct_count: 1,
          wrong_count: 0,
        },
        exam: {
          id: UUID(),
          title: 'Ujian KKA',
          subject: { name: 'KKA' },
          exam_questions: [
            {
              id: 'eq-1',
              position: 1,
              package_id: null,
              question: {
                id: questionId,
                type: QuestionType.MULTIPLE_CHOICE,
                content: 'Apa kepanjangan KKA?',
                image_url: null,
                difficulty: DifficultyLevel.EASY,
                explanation: 'KKA adalah Keamanan Komputer dan Jaringan',
                options: [
                  { id: opt1Id, content: 'Pilihan Salah', image_url: null, is_correct: false, order: 1 },
                  { id: opt2Id, content: 'Pilihan Benar', image_url: null, is_correct: true, order: 2 },
                ],
              },
            },
          ],
        },
        answers: [
          {
            question_id: questionId,
            answer_text: opt2Id,
            is_correct: true,
            score: 100,
            feedback: null,
          },
        ],
      });

      const result = await service.getSessionReview(sessionId);

      expect(result.session_id).toBe(sessionId);
      expect(result.student_name).toBe('Ahmad Siswa');
      expect(result.nis).toBe('202501001');
      expect(result.score).toBe(100);
      expect(result.questions).toHaveLength(1);
      expect(result.questions[0]).toEqual({
        id: questionId,
        number: 1,
        type: QuestionType.MULTIPLE_CHOICE,
        content: 'Apa kepanjangan KKA?',
        image_url: null,
        difficulty: DifficultyLevel.EASY,
        explanation: 'KKA adalah Keamanan Komputer dan Jaringan',
        student_answer: opt2Id,
        is_correct: true,
        score: 100,
        feedback: null,
        options: [
          { id: opt1Id, content: 'Pilihan Salah', image_url: null, is_correct: false, order: 1 },
          { id: opt2Id, content: 'Pilihan Benar', image_url: null, is_correct: true, order: 2 },
        ],
      });
    });
  });

  describe('getItemAnalysis()', () => {
    it('should throw NotFoundException if exam is not found', async () => {
      mockPrisma.exam.findFirst.mockResolvedValue(null);
      await expect(service.getItemAnalysis(UUID())).rejects.toThrow(NotFoundException);
    });

    it('should calculate difficulty index, pass rate, and distractor distribution across student sessions', async () => {
      const examId = UUID();
      const questionId = UUID();
      const optA = UUID();
      const optB = UUID();

      mockPrisma.exam.findFirst.mockResolvedValue({
        id: examId,
        title: 'Ujian Akhir Semester',
        exam_questions: [
          {
            id: 'eq-1',
            position: 1,
            question: {
              id: questionId,
              type: QuestionType.MULTIPLE_CHOICE,
              content: 'Soal 1',
              difficulty: DifficultyLevel.MEDIUM,
              options: [
                { id: optA, order: 1, content: 'Opsi A (Salah)', is_correct: false },
                { id: optB, order: 2, content: 'Opsi B (Benar)', is_correct: true },
              ],
            },
          },
        ],
      });

      // 4 student sessions submitted
      // 3 students answered Opt B (correct), 1 student answered Opt A (wrong)
      mockPrisma.examSession.findMany.mockResolvedValue([
        {
          id: UUID(),
          status: SessionStatus.SUBMITTED,
          answers: [{ question_id: questionId, answer_text: optB, is_correct: true }],
        },
        {
          id: UUID(),
          status: SessionStatus.SUBMITTED,
          answers: [{ question_id: questionId, answer_text: optB, is_correct: true }],
        },
        {
          id: UUID(),
          status: SessionStatus.SUBMITTED,
          answers: [{ question_id: questionId, answer_text: optB, is_correct: true }],
        },
        {
          id: UUID(),
          status: SessionStatus.SUBMITTED,
          answers: [{ question_id: questionId, answer_text: optA, is_correct: false }],
        },
      ]);

      const result = await service.getItemAnalysis(examId);

      expect(result.exam_id).toBe(examId);
      expect(result.total_sessions).toBe(4);
      expect(result.questions).toHaveLength(1);

      const qAnalysis = result.questions[0];
      expect(qAnalysis.question_id).toBe(questionId);
      expect(qAnalysis.number).toBe(1);
      expect(qAnalysis.total_answered).toBe(4);
      expect(qAnalysis.correct_count).toBe(3);
      expect(qAnalysis.wrong_count).toBe(1);
      expect(qAnalysis.difficulty_index).toBe(0.75); // 3 / 4
      expect(qAnalysis.pass_rate).toBe(75);
      expect(qAnalysis.distractor_distribution).toEqual([
        {
          option_id: optA,
          order: 1,
          content: 'Opsi A (Salah)',
          is_correct: false,
          count: 1,
          percentage: 25,
        },
        {
          option_id: optB,
          order: 2,
          content: 'Opsi B (Benar)',
          is_correct: true,
          count: 3,
          percentage: 75,
        },
      ]);
    });

    it('should handle questions with 0 answered sessions without dividing by zero', async () => {
      const examId = UUID();
      const questionId = UUID();

      mockPrisma.exam.findFirst.mockResolvedValue({
        id: examId,
        title: 'Ujian Kosong',
        exam_questions: [
          {
            id: 'eq-1',
            position: 1,
            question: {
              id: questionId,
              type: QuestionType.MULTIPLE_CHOICE,
              content: 'Soal Belum Ada Yang Jawab',
              difficulty: DifficultyLevel.EASY,
              options: [],
            },
          },
        ],
      });

      mockPrisma.examSession.findMany.mockResolvedValue([]);

      const result = await service.getItemAnalysis(examId);

      expect(result.total_sessions).toBe(0);
      expect(result.questions[0].difficulty_index).toBe(0);
      expect(result.questions[0].pass_rate).toBe(0);
    });
  });

  describe('generateExcelReport()', () => {
    it('should throw NotFoundException if exam does not exist', async () => {
      mockPrisma.exam.findFirst.mockResolvedValue(null);
      await expect(service.generateExcelReport(UUID())).rejects.toThrow(NotFoundException);
    });

    it('should generate a valid Excel .xlsx buffer with header, student records, and statistical formulas', async () => {
      const examId = UUID();
      const student1Id = UUID();
      const student2Id = UUID();

      mockPrisma.exam.findFirst.mockResolvedValue({
        id: examId,
        title: 'Penilaian Akhir Semester Ganjil',
        subject: { name: 'Teknologi Jaringan Komputer' },
      });

      mockPrisma.setting.findFirst.mockResolvedValue({
        passing_grade: 75,
      });

      mockPrisma.examSession.findMany.mockResolvedValue([
        {
          id: UUID(),
          student_id: student1Id,
          student: {
            full_name: 'Budi Raharjo',
            nis: '202510001',
            class: { name: 'XII TKJ 1' },
          },
          score: {
            total_score: 85.5,
            correct_count: 34,
            wrong_count: 6,
            essay_score: 25,
            total_questions: 40,
          },
        },
        {
          id: UUID(),
          student_id: student2Id,
          student: {
            full_name: 'Anisa Putri',
            nis: '202510002',
            class: { name: 'XII TKJ 1' },
          },
          score: {
            total_score: 65.0,
            correct_count: 24,
            wrong_count: 16,
            essay_score: 15,
            total_questions: 40,
          },
        },
      ]);

      const buffer = await service.generateExcelReport(examId);

      expect(buffer).toBeInstanceOf(Buffer);
      expect(buffer.length).toBeGreaterThan(1000);

      const wb = new ExcelJS.Workbook();
      await wb.xlsx.load(buffer);
      const sheet = wb.getWorksheet('Laporan Nilai');
      expect(sheet).toBeDefined();

      // Verify title & header
      expect(sheet?.getCell('A2').value).toBe('LAPORAN HASIL EVALUASI NILAI UJIAN SISWA');
      expect(sheet?.getCell('C5').value).toBe(': Teknologi Jaringan Komputer');
      expect(sheet?.getCell('C6').value).toBe(': Penilaian Akhir Semester Ganjil');

      // Verify student data rows
      // Student 1 (Anisa Putri, alphabetically first)
      const row10 = sheet?.getRow(10);
      expect(row10?.getCell(3).value).toBe('Anisa Putri');
      expect(row10?.getCell(9).value).toBe('REMEDIAL');

      // Student 2 (Budi Raharjo, alphabetically second)
      const row11 = sheet?.getRow(11);
      expect(row11?.getCell(3).value).toBe('Budi Raharjo');
      expect(row11?.getCell(9).value).toBe('LULUS');

      // Verify stats formulas (at row 13 = endDataRow 11 + 2)
      const averageRow = sheet?.getRow(13);
      expect(averageRow?.getCell(2).value).toBe('RATA-RATA NILAI');
      expect((averageRow?.getCell(8).value as any)?.formula).toBe('AVERAGE(H10:H11)');
    });

    it('should generate an empty table template cleanly when no student sessions exist', async () => {
      const examId = UUID();

      mockPrisma.exam.findFirst.mockResolvedValue({
        id: examId,
        title: 'Ujian Baru',
        subject: { name: 'Bahasa Indonesia' },
      });

      mockPrisma.setting.findFirst.mockResolvedValue({
        passing_grade: 70,
      });

      mockPrisma.examSession.findMany.mockResolvedValue([]);

      const buffer = await service.generateExcelReport(examId);
      expect(buffer).toBeInstanceOf(Buffer);
      expect(buffer.length).toBeGreaterThan(500);

      const wb = new ExcelJS.Workbook();
      await wb.xlsx.load(buffer);
      const sheet = wb.getWorksheet('Laporan Nilai');
      expect(sheet?.getCell('A10').value).toBe('Belum ada data nilai siswa untuk ujian ini.');
    });
  });
});
