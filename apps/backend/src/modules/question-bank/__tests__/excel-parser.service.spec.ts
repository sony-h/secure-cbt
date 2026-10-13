import { describe, it, expect } from 'vitest';
import * as xlsx from 'xlsx';
import { ExcelParserService } from '../parsers/excel-parser.service';
import { QuestionType, DifficultyLevel } from '@secure-cbt/shared';

describe('ExcelParserService', () => {
  const service = new ExcelParserService();

  it('should parse questions from an Excel buffer with standard headers', () => {
    const data = [
      ['No', 'Pertanyaan', 'Opsi A', 'Opsi B', 'Opsi C', 'Opsi D', 'Opsi E', 'Kunci', 'Pembahasan'],
      [
        1,
        'Siapa presiden pertama Indonesia?',
        'Soeharto',
        'Ir. Soekarno',
        'B.J. Habibie',
        'Gus Dur',
        'Megawati',
        'B',
        'Proklamator dan presiden pertama adalah Ir. Soekarno.',
      ],
      [
        2,
        'Rumus kimia air adalah?',
        'CO2',
        'H2O',
        'O2',
        'NaCl',
        'CH4',
        'B',
        'Air terdiri dari 2 hidrogen dan 1 oksigen.',
      ],
    ];

    const ws = xlsx.utils.aoa_to_sheet(data);
    const wb = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(wb, ws, 'Soal');
    const buffer = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });

    const result = service.parse(buffer);

    expect(result).toHaveLength(2);

    const q1 = result[0];
    expect(q1.content).toBe('Siapa presiden pertama Indonesia?');
    expect(q1.type).toBe(QuestionType.MULTIPLE_CHOICE);
    expect(q1.options).toHaveLength(5);
    expect(q1.options[1].content).toBe('Ir. Soekarno');
    expect(q1.options[1].is_correct).toBe(true);
    expect(q1.explanation).toBe('Proklamator dan presiden pertama adalah Ir. Soekarno.');
    expect(q1.valid).toBe(true);

    const q2 = result[1];
    expect(q2.content).toBe('Rumus kimia air adalah?');
    expect(q2.options[1].content).toBe('H2O');
    expect(q2.options[1].is_correct).toBe(true);
    expect(q2.valid).toBe(true);
  });

  it('should flag errors when question content is empty or key is invalid', () => {
    const data = [
      ['No', 'Pertanyaan', 'Pilihan A', 'Pilihan B', 'Kunci Jawaban'],
      [1, '', 'Jawaban A', 'Jawaban B', 'A'],
      [2, 'Pertanyaan tanpa kunci valid?', 'Jawaban A', 'Jawaban B', 'X'],
    ];

    const ws = xlsx.utils.aoa_to_sheet(data);
    const wb = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(wb, ws, 'Soal');
    const buffer = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });

    const result = service.parse(buffer);

    expect(result).toHaveLength(2);
    expect(result[0].valid).toBe(false);
    expect(result[0].error).toContain('Pertanyaan tidak boleh kosong');

    expect(result[1].valid).toBe(false);
    expect(result[1].error).toContain("Kunci jawaban 'X' tidak ditemukan");
  });

  it('should parse the bundled default-template-soal.xlsx successfully', () => {
    const fs = require('fs');
    const path = require('path');
    const templatePath = path.join(__dirname, '../templates/default-template-soal.xlsx');
    const buffer = fs.readFileSync(templatePath);

    const result = service.parse(buffer);
    expect(result.length).toBeGreaterThanOrEqual(2);
    expect(result[0].valid).toBe(true);
    expect(result[0].options).toHaveLength(5);
    expect(result[0].options[1].is_correct).toBe(true);
  });

  it('should auto-detect question sheet in multi-sheet workbook with Panduan as first sheet', () => {
    const wb = xlsx.utils.book_new();

    // Sheet 1: Panduan (Instruction text, no questions)
    const guideData = [
      ['PETUNJUK PENGISIAN SOAL'],
      ['Isi kolom sesuai panduan'],
      ['Pilih kunci jawaban dari menu'],
    ];
    const wsGuide = xlsx.utils.aoa_to_sheet(guideData);
    xlsx.utils.book_append_sheet(wb, wsGuide, '📋 Panduan');

    // Sheet 2: Input Soal (Actual questions)
    const inputData = [
      ['No', 'Soal', 'Opsi A', 'Opsi B', 'Opsi C', 'Opsi D', 'Opsi E', 'Kunci Jawaban', 'Pembahasan (Opsional)', 'Tingkat Kesulitan'],
      [1, 'Berapakah 10 x 10?', '50', '100', '150', '200', '250', ' B ', '10 x 10 = 100', 'mudah'],
      [], // Empty row to test whitespace resilience
      [2, 'Ibu kota Jawa Barat adalah...', 'Surabaya', 'Semarang', 'Bandung', 'Medan', 'Denpasar', 'c', '', 'SEDANG'],
    ];
    const wsInput = xlsx.utils.aoa_to_sheet(inputData);
    xlsx.utils.book_append_sheet(wb, wsInput, '✍️ Input Soal');

    const buffer = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });
    const result = service.parse(buffer);

    expect(result).toHaveLength(2);
    expect(result[0].content).toBe('Berapakah 10 x 10?');
    expect(result[0].options[1].is_correct).toBe(true);
    expect(result[0].difficulty).toBe(DifficultyLevel.EASY);
    expect(result[0].valid).toBe(true);

    expect(result[1].content).toBe('Ibu kota Jawa Barat adalah...');
    expect(result[1].options[2].is_correct).toBe(true);
    expect(result[1].difficulty).toBe(DifficultyLevel.MEDIUM);
    expect(result[1].valid).toBe(true);
  });

  it('should correctly extract answer key when prefixed with JAWABAN: or KUNCI: (C-1)', () => {
    const data = [
      ['No', 'Soal', 'Opsi A', 'Opsi B', 'Opsi C', 'Opsi D', 'Opsi E', 'Kunci Jawaban'],
      [1, 'Soal dengan prefiks Jawaban', 'Opsi 1', 'Opsi 2', 'Opsi 3', 'Opsi 4', 'Opsi 5', 'JAWABAN: B'],
      [2, 'Soal dengan prefiks Kunci', 'Opsi 1', 'Opsi 2', 'Opsi 3', 'Opsi 4', 'Opsi 5', 'Kunci: E'],
    ];

    const ws = xlsx.utils.aoa_to_sheet(data);
    const wb = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(wb, ws, 'Soal');
    const buffer = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });

    const result = service.parse(buffer);
    expect(result).toHaveLength(2);

    // Q1 key must be B, NOT A (from J-A-W-A-B-A-N)
    expect(result[0].options[1].is_correct).toBe(true);
    expect(result[0].options[0].is_correct).toBe(false);

    // Q2 key must be E, NOT C (from K-U-N-C-I)
    expect(result[1].options[4].is_correct).toBe(true);
    expect(result[1].options[2].is_correct).toBe(false);
  });
});
