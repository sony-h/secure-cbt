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

    // 1. Intelligent Sheet Selection
    // Prioritize sheets named 'Input Soal', 'Soal', 'Questions', etc.
    const priorityNames = workbook.SheetNames.filter((name) =>
      /input|soal|lembar|pertanyaan|question/i.test(name),
    );

    const sheetCandidates = [
      ...priorityNames,
      ...workbook.SheetNames.filter((name) => !priorityNames.includes(name)),
    ];

    let targetRows: any[][] = [];
    let detectedHeaderRowIdx = -1;
    let colQuestion = -1;
    let colA = -1;
    let colB = -1;
    let colC = -1;
    let colD = -1;
    let colE = -1;
    let colKey = -1;
    let colExplanation = -1;
    let colDifficulty = -1;

    for (const sheetName of sheetCandidates) {
      const sheet = workbook.Sheets[sheetName];
      if (!sheet) continue;

      const rows: any[][] = xlsx.utils.sheet_to_json(sheet, { header: 1 });
      if (!rows || rows.length < 2) continue;

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
          for (let c = 0; c < headerRow.length; c++) {
            const val = String(headerRow[c] || '').toLowerCase().trim();
            if (val === 'opsi a' || val === 'pilihan a' || val === 'a') colA = c;
            else if (val === 'opsi b' || val === 'pilihan b' || val === 'b') colB = c;
            else if (val === 'opsi c' || val === 'pilihan c' || val === 'c') colC = c;
            else if (val === 'opsi d' || val === 'pilihan d' || val === 'd') colD = c;
            else if (val === 'opsi e' || val === 'pilihan e' || val === 'e') colE = c;
            else if (
              val === 'kunci' ||
              val === 'kunci jawaban' ||
              val === 'jawaban' ||
              val === 'key' ||
              val === 'answer'
            ) {
              colKey = c;
            } else if (val === 'pembahasan' || val === 'pembahasan (opsional)' || val === 'explanation') {
              colExplanation = c;
            } else if (val === 'kesulitan' || val === 'tingkat' || val === 'tingkat kesulitan' || val === 'difficulty') {
              colDifficulty = c;
            }
          }

          targetRows = rows;
          break;
        }
      }

      if (detectedHeaderRowIdx !== -1) {
        break; // Successfully located question sheet
      }
    }

    // Fallback to first sheet if no sheet matched header keywords
    if (detectedHeaderRowIdx === -1) {
      const firstSheetName = workbook.SheetNames[0];
      if (!firstSheetName) return [];
      const firstSheet = workbook.Sheets[firstSheetName];
      if (!firstSheet) return [];
      targetRows = xlsx.utils.sheet_to_json(firstSheet, { header: 1 });
      detectedHeaderRowIdx = 0;
      colQuestion = 1;
      colA = 2;
      colB = 3;
      colC = 4;
      colD = 5;
      colE = 6;
      colKey = 7;
      colExplanation = 8;
    }

    const questions: ImportQuestionItemInput[] = [];

    for (let r = detectedHeaderRowIdx + 1; r < targetRows.length; r++) {
      const row = targetRows[r];
      if (!row || !Array.isArray(row) || !row.length) continue;

      const questionContent = String(row[colQuestion] || '').trim();
      const optA = colA !== -1 ? String(row[colA] || '').trim() : '';
      const optB = colB !== -1 ? String(row[colB] || '').trim() : '';
      const optC = colC !== -1 ? String(row[colC] || '').trim() : '';
      const optD = colD !== -1 ? String(row[colD] || '').trim() : '';
      const optE = colE !== -1 ? String(row[colE] || '').trim() : '';
      const keyRaw = colKey !== -1 ? String(row[colKey] || '').toUpperCase().trim() : '';
      const explanation = colExplanation !== -1 ? String(row[colExplanation] || '').trim() || null : null;

      // Skip completely empty rows
      if (!questionContent && !optA && !optB && !keyRaw) {
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

      // Build options
      const rawOptions: { label: string; text: string }[] = [];
      if (optA) rawOptions.push({ label: 'A', text: optA });
      if (optB) rawOptions.push({ label: 'B', text: optB });
      if (optC) rawOptions.push({ label: 'C', text: optC });
      if (optD) rawOptions.push({ label: 'D', text: optD });
      if (optE) rawOptions.push({ label: 'E', text: optE });

      const correctKeyMatch = keyRaw.match(/[A-E]/i);
      const correctKey = correctKeyMatch ? correctKeyMatch[0].toUpperCase() : keyRaw;

      const options: ImportQuestionOptionInput[] = rawOptions.map((opt, idx) => ({
        order: idx + 1,
        content: opt.text,
        image_url: null,
        is_correct: opt.label === correctKey,
      }));

      const hasCorrect = options.some((o) => o.is_correct);
      let isValid = true;
      let error: string | null = null;

      if (!questionContent) {
        isValid = false;
        error = 'Pertanyaan tidak boleh kosong';
      } else if (options.length < 2) {
        isValid = false;
        error = 'Minimal harus memiliki 2 opsi jawaban';
      } else if (!hasCorrect) {
        isValid = false;
        error = `Kunci jawaban '${correctKey || '-'}' tidak ditemukan di opsi`;
      }

      questions.push({
        number: questions.length + 1,
        content: questionContent,
        image_url: null,
        type: QuestionType.MULTIPLE_CHOICE,
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
