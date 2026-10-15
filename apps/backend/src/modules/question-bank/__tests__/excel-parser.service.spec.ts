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

  describe('Multi-Type Questions in Excel', () => {
    it('should parse all 6 question formats when Tipe Soal column is provided', () => {
      const data = [
        [
          'No',
          'Tipe Soal',
          'Soal',
          'Opsi A',
          'Opsi B',
          'Opsi C',
          'Opsi D',
          'Opsi E',
          'Kunci Jawaban',
          'Pembahasan',
          'Tingkat Kesulitan',
        ],
        // 1. Pilihan Ganda
        [
          1,
          'PILIHAN GANDA',
          'Ibu kota Indonesia?',
          'Jakarta',
          'Nusantara',
          'Surabaya',
          'Bandung',
          '',
          'B',
          'Nusantara di Kaltim',
          'MUDAH',
        ],
        // 2. PG Kompleks
        [
          2,
          'PG KOMPLEKS',
          'Bahasa interpreted?',
          'Python',
          'JavaScript',
          'C++',
          'Ruby',
          '',
          'A, B, D',
          'Python, JS, Ruby interpreted',
          'SEDANG',
        ],
        // 3. Benar Salah
        [
          3,
          'BENAR SALAH',
          'Fotosintesis menghasilkan glukosa.',
          '',
          '',
          '',
          '',
          '',
          'BENAR',
          'Glukosa dan O2 dihasilkan',
          'MUDAH',
        ],
        // 4. Isian Singkat
        [
          4,
          'ISIAN SINGKAT',
          'Bahasa resmi Brazil?',
          '',
          '',
          '',
          '',
          '',
          'Portugis, Portuguese',
          '',
          'SEDANG',
        ],
        // 5. Menjodohkan
        [
          5,
          'MENJODOHKAN',
          'Jodohkan pahlawan dan asalnya:',
          'Kartini -> Jepara',
          'Diponegoro -> Jogja',
          'Dien -> Aceh',
          '',
          '',
          '',
          '',
          'SULIT',
        ],
        // 6. Esai
        [
          6,
          'ESAI',
          'Jelaskan siklus litik dan lisogenik!',
          '',
          '',
          '',
          '',
          '',
          '',
          'Rubrik penilaian',
          'SULIT',
        ],
      ];

      const ws = xlsx.utils.aoa_to_sheet(data);
      const wb = xlsx.utils.book_new();
      xlsx.utils.book_append_sheet(wb, ws, '✍️ Input Soal');
      const buffer = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });

      const result = service.parse(buffer);
      expect(result).toHaveLength(6);

      // Q1: MULTIPLE_CHOICE
      expect(result[0].type).toBe(QuestionType.MULTIPLE_CHOICE);
      expect(result[0].options).toHaveLength(4);
      expect(result[0].options[1].is_correct).toBe(true); // Nusantara
      expect(result[0].valid).toBe(true);

      // Q2: MULTI_SELECT
      expect(result[1].type).toBe(QuestionType.MULTI_SELECT);
      expect(result[1].options[0].is_correct).toBe(true); // A
      expect(result[1].options[1].is_correct).toBe(true); // B
      expect(result[1].options[2].is_correct).toBe(false); // C
      expect(result[1].options[3].is_correct).toBe(true); // D
      expect(result[1].valid).toBe(true);

      // Q3: TRUE_FALSE
      expect(result[2].type).toBe(QuestionType.TRUE_FALSE);
      expect(result[2].options).toHaveLength(2);
      expect(result[2].options[0].content).toBe('Benar');
      expect(result[2].options[0].is_correct).toBe(true);
      expect(result[2].options[1].content).toBe('Salah');
      expect(result[2].options[1].is_correct).toBe(false);
      expect(result[2].valid).toBe(true);

      // Q4: SHORT_ANSWER
      expect(result[3].type).toBe(QuestionType.SHORT_ANSWER);
      expect(result[3].options.length).toBeGreaterThanOrEqual(1);
      expect(result[3].options[0].content).toBe('Portugis');
      expect(result[3].options[0].is_correct).toBe(true);
      expect(result[3].valid).toBe(true);

      // Q5: MATCHING
      expect(result[4].type).toBe(QuestionType.MATCHING);
      expect(result[4].options).toHaveLength(3);
      const pair1 = JSON.parse(result[4].options[0].content);
      expect(pair1.left).toBe('Kartini');
      expect(pair1.right).toBe('Jepara');
      expect(result[4].valid).toBe(true);

      // Q6: ESSAY
      expect(result[5].type).toBe(QuestionType.ESSAY);
      expect(result[5].options).toHaveLength(0);
      expect(result[5].explanation).toBe('Rubrik penilaian');
      expect(result[5].valid).toBe(true);
    });

    it('should auto-detect multi-select, true-false, and matching in legacy template without Tipe Soal column', () => {
      const data = [
        ['No', 'Soal', 'Opsi A', 'Opsi B', 'Opsi C', 'Opsi D', 'Kunci Jawaban'],
        [1, 'Pilih buah:', 'Apel', 'Bayam', 'Jeruk', 'Wortel', 'A, C'],
        [2, 'Langit biru karena hamburan Rayleigh', '', '', '', '', 'BENAR'],
        [3, 'Jodohkan:', 'Ayam -> Bertelur', 'Kucing -> Beranak', '', '', ''],
      ];

      const ws = xlsx.utils.aoa_to_sheet(data);
      const wb = xlsx.utils.book_new();
      xlsx.utils.book_append_sheet(wb, ws, 'Soal');
      const buffer = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });

      const result = service.parse(buffer);
      expect(result).toHaveLength(3);

      expect(result[0].type).toBe(QuestionType.MULTI_SELECT);
      expect(result[0].options[0].is_correct).toBe(true);
      expect(result[0].options[2].is_correct).toBe(true);

      expect(result[1].type).toBe(QuestionType.TRUE_FALSE);
      expect(result[1].options).toHaveLength(2);
      expect(result[1].options[0].is_correct).toBe(true);

      expect(result[2].type).toBe(QuestionType.MATCHING);
      expect(result[2].options).toHaveLength(2);
    });

    it('should correctly normalize "PILIHAN GANDA KOMPLEKS" in Tipe Soal column to MULTI_SELECT', () => {
      const data = [
        ['No', 'Tipe Soal', 'Soal', 'Opsi A', 'Opsi B', 'Opsi C', 'Kunci Jawaban'],
        [1, 'Pilihan Ganda Kompleks', 'Browser based lang:', 'JS', 'WASM', 'C', 'A, B'],
      ];

      const ws = xlsx.utils.aoa_to_sheet(data);
      const wb = xlsx.utils.book_new();
      xlsx.utils.book_append_sheet(wb, ws, 'Soal');
      const buffer = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });

      const result = service.parse(buffer);
      expect(result).toHaveLength(1);
      expect(result[0].type).toBe(QuestionType.MULTI_SELECT);
      expect(result[0].options[0].is_correct).toBe(true);
      expect(result[0].options[1].is_correct).toBe(true);
      expect(result[0].options[2].is_correct).toBe(false);
    });

    it('should parse TRUE_FALSE with explicit Benar (A) and Salah (B) options without false positives', () => {
      const data = [
        ['No', 'Tipe Soal', 'Soal', 'Opsi A', 'Opsi B', 'Kunci Jawaban'],
        [1, 'BENAR_SALAH', 'Bumi berputar mengelilingi matahari', 'Benar', 'Salah', 'B'],
      ];

      const ws = xlsx.utils.aoa_to_sheet(data);
      const wb = xlsx.utils.book_new();
      xlsx.utils.book_append_sheet(wb, ws, 'Soal');
      const buffer = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });

      const result = service.parse(buffer);
      expect(result).toHaveLength(1);
      expect(result[0].type).toBe(QuestionType.TRUE_FALSE);
      expect(result[0].options[0].is_correct).toBe(false);
      expect(result[0].options[1].is_correct).toBe(true);
    });

    it('should parse MATCHING with unicode arrow → in options', () => {
      const data = [
        ['No', 'Tipe Soal', 'Soal', 'Opsi A', 'Opsi B', 'Kunci Jawaban'],
        [1, 'MENJODOHKAN', 'Pasangan:', 'Kucing → Mamalia', 'Elang → Aves', ''],
      ];

      const ws = xlsx.utils.aoa_to_sheet(data);
      const wb = xlsx.utils.book_new();
      xlsx.utils.book_append_sheet(wb, ws, 'Soal');
      const buffer = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });

      const result = service.parse(buffer);
      expect(result).toHaveLength(1);
      expect(result[0].type).toBe(QuestionType.MATCHING);
      expect(result[0].options).toHaveLength(2);
      const p1 = JSON.parse(result[0].options[0].content);
      expect(p1.left).toBe('Kucing');
      expect(p1.right).toBe('Mamalia');
    });

    it('should auto-detect ESSAY in legacy format when options and key are empty', () => {
      const data = [
        ['No', 'Soal', 'Opsi A', 'Opsi B', 'Opsi C', 'Kunci Jawaban'],
        [1, 'Jelaskan dampak pemanasan global terhadap ekosistem kutub!', '', '', '', ''],
      ];

      const ws = xlsx.utils.aoa_to_sheet(data);
      const wb = xlsx.utils.book_new();
      xlsx.utils.book_append_sheet(wb, ws, 'Soal');
      const buffer = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });

      const result = service.parse(buffer);
      expect(result).toHaveLength(1);
      expect(result[0].type).toBe(QuestionType.ESSAY);
      expect(result[0].options).toHaveLength(0);
      expect(result[0].valid).toBe(true);
    });

    it('should not treat math equations or code snippets with = as MATCHING questions', () => {
      const data = [
        ['No', 'Soal', 'Opsi A', 'Opsi B', 'Opsi C', 'Opsi D', 'Kunci Jawaban'],
        ['1', 'Tentukan fungsi turunan yang benar:', 'f(x) = 2x + 1', 'f(x) = x^2 - 4', 'f(x) = 3x - 5', 'f(x) = 4', 'A'],
      ];

      const ws = xlsx.utils.aoa_to_sheet(data);
      const wb = xlsx.utils.book_new();
      xlsx.utils.book_append_sheet(wb, ws, 'Soal');
      const buffer = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });

      const result = service.parse(buffer);
      expect(result).toHaveLength(1);
      expect(result[0].type).toBe(QuestionType.MULTIPLE_CHOICE);
      expect(result[0].options[0].content).toBe('f(x) = 2x + 1');
      expect(result[0].options[0].is_correct).toBe(true);
      expect(result[0].options[1].content).toBe('f(x) = x^2 - 4');
      expect(result[0].options[1].is_correct).toBe(false);
    });

    it('should not treat code snippets with = as MATCHING in MULTI_SELECT questions', () => {
      const data = [
        ['No', 'Soal', 'Opsi A', 'Opsi B', 'Opsi C', 'Kunci Jawaban'],
        ['1', 'Pilihlah deklarasi variabel JavaScript yang valid:', 'const x = 10;', 'let count = 0;', 'val y = 20;', 'A, B'],
      ];

      const ws = xlsx.utils.aoa_to_sheet(data);
      const wb = xlsx.utils.book_new();
      xlsx.utils.book_append_sheet(wb, ws, 'Soal');
      const buffer = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });

      const result = service.parse(buffer);
      expect(result).toHaveLength(1);
      expect(result[0].type).toBe(QuestionType.MULTI_SELECT);
      expect(result[0].options[0].content).toBe('const x = 10;');
      expect(result[0].options[0].is_correct).toBe(true);
      expect(result[0].options[1].content).toBe('let count = 0;');
      expect(result[0].options[1].is_correct).toBe(true);
      expect(result[0].options[2].content).toBe('val y = 20;');
      expect(result[0].options[2].is_correct).toBe(false);
    });
  });
});
