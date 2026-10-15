import { describe, it, expect } from 'vitest';
import ExcelJS from 'exceljs';
import { generateWordTemplate, generateExcelTemplate } from '../templates/template-generator';
import { WordParserService } from '../parsers/word-parser.service';
import { ExcelParserService } from '../parsers/excel-parser.service';
import { QuestionType } from '@secure-cbt/shared';

describe('TemplateGenerator (Multi-Type Support)', () => {
  it('should generate a valid Word .docx buffer containing all 6 question types and parse cleanly', async () => {
    const buffer = await generateWordTemplate();
    expect(buffer).toBeInstanceOf(Buffer);
    expect(buffer.length).toBeGreaterThan(1000);

    const wordParser = new WordParserService();
    const questions = await wordParser.parse(buffer);

    expect(questions.length).toBeGreaterThanOrEqual(6);
    expect(questions.every((q) => q.valid)).toBe(true);

    const types = questions.map((q) => q.type);
    expect(types).toContain(QuestionType.MULTIPLE_CHOICE);
    expect(types).toContain(QuestionType.MULTI_SELECT);
    expect(types).toContain(QuestionType.TRUE_FALSE);
    expect(types).toContain(QuestionType.SHORT_ANSWER);
    expect(types).toContain(QuestionType.MATCHING);
    expect(types).toContain(QuestionType.ESSAY);
  });

  it('should generate a valid Excel .xlsx buffer with Tipe Soal containing all 6 types and parse cleanly', async () => {
    const buffer = await generateExcelTemplate();
    expect(buffer).toBeInstanceOf(Buffer);
    expect(buffer.length).toBeGreaterThan(1000);

    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(buffer);
    const sheetNames = wb.worksheets.map((ws) => ws.name);
    expect(sheetNames).toContain('📋 Panduan');
    expect(sheetNames).toContain('✍️ Input Soal');
    expect(sheetNames).toContain('💡 Contoh Soal Multi-Tipe');

    const excelParser = new ExcelParserService();
    const questions = excelParser.parse(buffer);

    expect(questions.length).toBeGreaterThanOrEqual(6);
    expect(questions.every((q) => q.valid)).toBe(true);

    const types = questions.map((q) => q.type);
    expect(types).toContain(QuestionType.MULTIPLE_CHOICE);
    expect(types).toContain(QuestionType.MULTI_SELECT);
    expect(types).toContain(QuestionType.TRUE_FALSE);
    expect(types).toContain(QuestionType.SHORT_ANSWER);
    expect(types).toContain(QuestionType.MATCHING);
    expect(types).toContain(QuestionType.ESSAY);
  });
});
