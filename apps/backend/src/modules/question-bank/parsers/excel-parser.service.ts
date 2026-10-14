import { Injectable } from '@nestjs/common';
import * as xlsx from 'xlsx';
import {
  QuestionType,
  DifficultyLevel,
  ImportQuestionItemInput,
  ImportQuestionOptionInput,
} from '@secure-cbt/shared';

@Injectable()
export class ExcelParserService {
  parse(buffer: Buffer): ImportQuestionItemInput[] {
    const workbook = xlsx.read(buffer, { type: 'buffer' });
    if (!workbook.SheetNames.length) {
      return [];
    }

    // 1. Intelligent Sheet Ranking & Selection
    // Prioritize 'Input Soal', then other question sheets, deprioritizing 'Contoh' or 'Panduan'
    const isInput = (name: string) => /input/i.test(name);
    const isContoh = (name: string) => /contoh|sample|panduan/i.test(name);
    const isSoal = (name: string) => /soal|lembar|pertanyaan|question/i.test(name);

    const sheetCandidates = [...workbook.SheetNames].sort((a, b) => {
      if (isInput(a) && !isInput(b)) return -1;
      if (!isInput(a) && isInput(b)) return 1;
      if (!isContoh(a) && isContoh(b)) return -1;
      if (isContoh(a) && !isContoh(b)) return 1;
      if (isSoal(a) && !isSoal(b)) return -1;
      if (!isSoal(a) && isSoal(b)) return 1;
      return 0;
    });

    for (const sheetName of sheetCandidates) {
      const sheet = workbook.Sheets[sheetName];
      if (!sheet) continue;

      const rows: any[][] = xlsx.utils.sheet_to_json(sheet, { header: 1 });
      if (!rows || rows.length < 2) continue;

      const questions = this.parseRows(rows);
      if (questions.length > 0) {
        return questions;
      }
    }

    return [];
  }

  private normalizeType(typeStr?: string | null): QuestionType | null {
    if (!typeStr) return null;
    const clean = typeStr.toUpperCase().replace(/[\s\-_]+/g, '');
    // Check complex / multi-select first to avoid matching "PILIHANGANDA" in "PILIHANGANDAKOMPLEKS"
    if (clean.includes('PGKOMPLEKS') || clean.includes('MULTISELECT') || clean.includes('KOMPLEKS')) {
      return QuestionType.MULTI_SELECT;
    }
    if (clean.includes('PILIHANGANDA') || clean === 'MCQ' || clean === 'MULTIPLECHOICE' || clean === 'PG') {
      return QuestionType.MULTIPLE_CHOICE;
    }
    if (clean.includes('BENARSALAH') || clean.includes('TRUEFALSE') || clean === 'TF' || clean === 'BS') {
      return QuestionType.TRUE_FALSE;
    }
    if (clean.includes('ISIANSINGKAT') || clean.includes('SHORTANSWER') || clean === 'ISIAN') {
      return QuestionType.SHORT_ANSWER;
    }
    if (clean.includes('MENJODOHKAN') || clean.includes('MATCHING') || clean === 'JODOHKAN') {
      return QuestionType.MATCHING;
    }
    if (clean.includes('ESAI') || clean.includes('ESSAY') || clean.includes('URAIAN')) {
      return QuestionType.ESSAY;
    }
    return null;
  }

  private inferQuestionType(
    explicitType: QuestionType | null,
    keyText: string,
    rawOptions: Array<{ label: string; text: string }>,
  ): QuestionType {
    if (explicitType) {
      return explicitType;
    }
    const cleanKey = (keyText || '').trim().toUpperCase();

    // 1. Check if options contain matching syntax (e.g. "A -> B", "A → B", or "A = B")
    if (
      rawOptions.length > 0 &&
      rawOptions.some((o) => /(?:->|→|➔|➜|➡|⇒|=)/.test(o.text))
    ) {
      return QuestionType.MATCHING;
    }

    // 2. Check if key is True/False (explicit words only to avoid collision with MCQ Option B)
    if (/^(?:BENAR|SALAH|TRUE|FALSE)$/i.test(cleanKey) && rawOptions.length <= 2) {
      return QuestionType.TRUE_FALSE;
    }

    // 3. Check if key is comma/separator-separated letters e.g. "A, B", "A dan C", or "A, B, D"
    const isMultiKey = /\b[A-E]\b(?:[\s,;]+(?:DAN\s+)?\b[A-E]\b)+/i.test(cleanKey);
    if (isMultiKey) {
      return QuestionType.MULTI_SELECT;
    }

    // 4. If options are empty but key exists
    if (rawOptions.length === 0 && cleanKey.length > 0) {
      return QuestionType.SHORT_ANSWER;
    }

    // 5. If options and key are both empty
    if (rawOptions.length === 0 && cleanKey.length === 0) {
      return QuestionType.ESSAY;
    }

    // 6. Default
    return QuestionType.MULTIPLE_CHOICE;
  }

  private parseRows(rows: any[][]): ImportQuestionItemInput[] {
    if (!rows || rows.length < 2) return [];

    let detectedHeaderRowIdx = -1;
    let colType = -1;
    let colQuestion = -1;
    let colA = -1;
    let colB = -1;
    let colC = -1;
    let colD = -1;
    let colE = -1;
    let colKey = -1;
    let colExplanation = -1;
    let colDifficulty = -1;

    // Scan first 10 rows for header
    for (let r = 0; r < Math.min(rows.length, 10); r++) {
      const row = rows[r];
      if (!row || !Array.isArray(row)) continue;

      let foundQuestionHeader = false;
      for (let c = 0; c < row.length; c++) {
        const val = String(row[c] || '').toLowerCase().trim();
        if (
          val === 'soal' ||
          val === 'pertanyaan' ||
          val === 'question' ||
          val.includes('pertanyaan')
        ) {
          colQuestion = c;
          detectedHeaderRowIdx = r;
          foundQuestionHeader = true;
          break;
        }
      }

      if (foundQuestionHeader) {
        const headerRow = rows[detectedHeaderRowIdx];
        if (headerRow) {
          for (let c = 0; c < headerRow.length; c++) {
            const val = String(headerRow[c] || '').toLowerCase().trim();
            if (
              val === 'tipe soal' ||
              val === 'tipe' ||
              val === 'type' ||
              val === 'jenis soal'
            ) {
              colType = c;
            } else if (val === 'opsi a' || val === 'pilihan a' || val === 'option a' || val === 'a') {
              colA = c;
            } else if (val === 'opsi b' || val === 'pilihan b' || val === 'option b' || val === 'b') {
              colB = c;
            } else if (val === 'opsi c' || val === 'pilihan c' || val === 'option c' || val === 'c') {
              colC = c;
            } else if (val === 'opsi d' || val === 'pilihan d' || val === 'option d' || val === 'd') {
              colD = c;
            } else if (val === 'opsi e' || val === 'pilihan e' || val === 'option e' || val === 'e') {
              colE = c;
            } else if (
              val === 'kunci' ||
              val === 'kunci jawaban' ||
              val === 'jawaban' ||
              val === 'key' ||
              val === 'answer'
            ) {
              colKey = c;
            } else if (
              val === 'pembahasan' ||
              val === 'pembahasan (opsional)' ||
              val === 'explanation'
            ) {
              colExplanation = c;
            } else if (
              val === 'kesulitan' ||
              val === 'tingkat' ||
              val === 'tingkat kesulitan' ||
              val === 'difficulty'
            ) {
              colDifficulty = c;
            }
          }
        }
        break;
      }
    }

    // Require detected header and question column
    if (detectedHeaderRowIdx === -1 || colQuestion === -1) {
      return [];
    }

    const questions: ImportQuestionItemInput[] = [];

    for (let r = detectedHeaderRowIdx + 1; r < targetRowsLength(rows); r++) {
      const row = rows[r];
      if (!row || !Array.isArray(row) || !row.length) continue;

      const rawType = colType !== -1 ? String(row[colType] || '').trim() : '';
      const explicitType = this.normalizeType(rawType);

      const questionContent = String(row[colQuestion] || '').trim();
      const optA = colA !== -1 ? String(row[colA] || '').trim() : '';
      const optB = colB !== -1 ? String(row[colB] || '').trim() : '';
      const optC = colC !== -1 ? String(row[colC] || '').trim() : '';
      const optD = colD !== -1 ? String(row[colD] || '').trim() : '';
      const optE = colE !== -1 ? String(row[colE] || '').trim() : '';
      const keyRaw = colKey !== -1 ? String(row[colKey] || '').trim() : '';
      const explanation =
        colExplanation !== -1 ? String(row[colExplanation] || '').trim() || null : null;

      // Skip completely empty rows
      if (!questionContent && !optA && !optB && !keyRaw && !rawType) {
        continue;
      }

      // Determine difficulty
      let difficulty = DifficultyLevel.MEDIUM;
      if (colDifficulty !== -1 && row[colDifficulty]) {
        const diffText = String(row[colDifficulty]).toUpperCase().trim();
        if (diffText.includes('MUDAH') || diffText.includes('EASY')) {
          difficulty = DifficultyLevel.EASY;
        } else if (diffText.includes('SULIT') || diffText.includes('HARD')) {
          difficulty = DifficultyLevel.HARD;
        }
      }

      // Build raw options
      const rawOptions: { label: string; text: string }[] = [];
      if (optA) rawOptions.push({ label: 'A', text: optA });
      if (optB) rawOptions.push({ label: 'B', text: optB });
      if (optC) rawOptions.push({ label: 'C', text: optC });
      if (optD) rawOptions.push({ label: 'D', text: optD });
      if (optE) rawOptions.push({ label: 'E', text: optE });

      const questionType = this.inferQuestionType(explicitType, keyRaw, rawOptions);

      let options: ImportQuestionOptionInput[] = [];
      let isValid = true;
      let error: string | null = null;

      if (!questionContent) {
        isValid = false;
        error = 'Pertanyaan tidak boleh kosong';
      }

      if (questionType === QuestionType.ESSAY) {
        options = [];
        if (!questionContent) {
          isValid = false;
          error = 'Pertanyaan tidak boleh kosong';
        }
      } else if (questionType === QuestionType.SHORT_ANSWER) {
        if (rawOptions.length > 0) {
          options = rawOptions.map((opt, idx) => ({
            order: idx + 1,
            content: opt.text,
            image_url: null,
            is_correct: true,
          }));
        } else {
          const answers = keyRaw
            .split(/[,;\n]+/)
            .map((s) => s.trim())
            .filter(Boolean);
          const effectiveAnswers =
            answers.length > 0 ? answers : keyRaw.trim() ? [keyRaw.trim()] : [];

          options = effectiveAnswers.map((ans, idx) => ({
            order: idx + 1,
            content: ans,
            image_url: null,
            is_correct: true,
          }));
        }

        if (options.length === 0) {
          isValid = false;
          error = 'Kunci jawaban isian singkat wajib diisi';
        }
      } else if (questionType === QuestionType.TRUE_FALSE) {
        if (rawOptions.length === 0) {
          const keyUpper = keyRaw.trim().toUpperCase();
          const isTrue = keyUpper === 'BENAR' || keyUpper === 'TRUE' || keyUpper === 'B';
          const isFalse = keyUpper === 'SALAH' || keyUpper === 'FALSE' || keyUpper === 'S';

          options = [
            { order: 1, content: 'Benar', image_url: null, is_correct: isTrue },
            { order: 2, content: 'Salah', image_url: null, is_correct: isFalse },
          ];
        } else {
          const keyUpper = keyRaw.trim().toUpperCase();
          const isSingleLetter = /^[A-E]$/.test(keyUpper);

          options = rawOptions.map((opt, idx) => {
            const optTextUpper = opt.text.trim().toUpperCase();
            let isCorrect = false;

            if (isSingleLetter) {
              isCorrect = opt.label === keyUpper;
            } else {
              const isOptBenar =
                optTextUpper.startsWith('BENAR') ||
                optTextUpper === 'B' ||
                optTextUpper === 'TRUE';
              const isOptSalah =
                optTextUpper.startsWith('SALAH') ||
                optTextUpper === 'S' ||
                optTextUpper === 'FALSE';
              const keyIsBenar = keyUpper === 'BENAR' || keyUpper === 'TRUE';
              const keyIsSalah = keyUpper === 'SALAH' || keyUpper === 'FALSE';

              isCorrect = (keyIsBenar && isOptBenar) || (keyIsSalah && isOptSalah);
            }

            return {
              order: idx + 1,
              content: opt.text,
              image_url: null,
              is_correct: isCorrect,
            };
          });
        }

        if (!options.some((o) => o.is_correct)) {
          isValid = false;
          error = `Kunci jawaban '${keyRaw || '-'}' tidak valid untuk Benar / Salah`;
        }
      } else if (questionType === QuestionType.MATCHING) {
        options = rawOptions.map((opt, idx) => {
          const rawText = opt.text || '';
          const delimiterMatch = rawText.match(/->|→|➔|➜|➡|⇒|=/);
          const delimiter = delimiterMatch ? delimiterMatch[0] : '';
          let left = rawText;
          let right = '';
          if (delimiter) {
            const parts = rawText.split(delimiter);
            left = (parts[0] || '').trim();
            right = (parts.slice(1).join(delimiter) || '').trim();
          }

          return {
            order: idx + 1,
            content: JSON.stringify({ left, right }),
            image_url: null,
            is_correct: true,
          };
        });

        if (options.length < 2) {
          isValid = false;
          error = 'Soal menjodohkan memerlukan minimal 2 pasangan';
        } else if (
          options.some((o) => {
            try {
              const p = JSON.parse(o.content);
              return !p.left || !p.right;
            } catch {
              return true;
            }
          })
        ) {
          isValid = false;
          error = 'Setiap pasangan menjodohkan harus memiliki pemisah tanda panah (->)';
        }
      } else if (questionType === QuestionType.MULTI_SELECT) {
        const targetKeys: string[] = keyRaw.toUpperCase().match(/\b[A-E]\b/g) || [];
        options = rawOptions.map((opt, idx) => ({
          order: idx + 1,
          content: opt.text,
          image_url: null,
          is_correct: targetKeys.includes(opt.label),
        }));

        if (options.length < 2) {
          isValid = false;
          error = 'Minimal harus memiliki 2 opsi jawaban';
        } else if (!options.some((o) => o.is_correct)) {
          isValid = false;
          error = `Kunci jawaban '${keyRaw || '-'}' tidak ditemukan di opsi`;
        }
      } else {
        // MULTIPLE_CHOICE
        const sanitizedKey = keyRaw
          .replace(/^(?:KUNCI(?:\s*JAWABAN)?|JAWABAN|KEY|ANSWER)[\s\:\=\-]*/i, '')
          .trim();
        const correctKeyMatch =
          sanitizedKey.match(/^[A-E]\b/i) ||
          keyRaw.match(/(?:^|[\s\:\=\-\(\[])([A-E])(?:\b|[\.\)\]]|$)/i);
        const correctKey = correctKeyMatch
          ? (correctKeyMatch[1] || correctKeyMatch[0]).toUpperCase()
          : sanitizedKey;

        options = rawOptions.map((opt, idx) => ({
          order: idx + 1,
          content: opt.text,
          image_url: null,
          is_correct: opt.label === correctKey,
        }));

        if (options.length < 2) {
          isValid = false;
          error = 'Minimal harus memiliki 2 opsi jawaban';
        } else if (!options.some((o) => o.is_correct)) {
          isValid = false;
          error = `Kunci jawaban '${correctKey || '-'}' tidak ditemukan di opsi`;
        }
      }

      questions.push({
        number: questions.length + 1,
        content: questionContent,
        image_url: null,
        type: questionType,
        difficulty,
        explanation,
        options,
        valid: isValid,
        error,
      });
    }

    return questions;
  }
}

function targetRowsLength(rows: any[][]): number {
  return rows.length;
}
