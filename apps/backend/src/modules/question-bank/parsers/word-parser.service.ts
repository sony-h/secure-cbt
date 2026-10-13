import { Injectable, Optional, Inject } from '@nestjs/common';
import * as mammoth from 'mammoth';
import * as cheerio from 'cheerio';
import { v4 as uuidv4 } from 'uuid';
import {
  QuestionType,
  DifficultyLevel,
  ImportQuestionItemInput,
  ImportQuestionOptionInput,
} from '@secure-cbt/shared';
import { STORAGE_SERVICE, IStorageService } from '../../storage/storage.interface';

@Injectable()
export class WordParserService {
  constructor(
    @Optional()
    @Inject(STORAGE_SERVICE)
    private readonly storageService?: IStorageService,
  ) {}

  async parse(buffer: Buffer): Promise<ImportQuestionItemInput[]> {
    // 1. Convert Word .docx to HTML with custom image handler
    const conversionOptions: any = {
      convertImage: (mammoth as any).images.imgElement(async (image: any) => {
        const imageBuffer = await image.read();
        const contentType = image.contentType || 'image/png';
        const ext = contentType.includes('jpeg') || contentType.includes('jpg')
          ? 'jpg'
          : contentType.includes('webp')
          ? 'webp'
          : 'png';

        if (this.storageService) {
          const filename = `${uuidv4()}.${ext}`;
          try {
            const uploaded = await this.storageService.uploadFile(
              imageBuffer,
              filename,
              contentType,
              'questions',
            );
            return { src: uploaded.url };
          } catch {
            const base64 = imageBuffer.toString('base64');
            return { src: `data:${contentType};base64,${base64}` };
          }
        } else {
          const base64 = imageBuffer.toString('base64');
          return { src: `data:${contentType};base64,${base64}` };
        }
      }),
    };

    const result = await mammoth.convertToHtml({ buffer }, conversionOptions);
    const html = result.value;

    const $ = cheerio.load(html);
    const tables = $('table');

    // If tables exist, check if they are actual question tables
    if (tables.length > 0) {
      const tableQuestions = this.parseFromTables($, tables);
      if (tableQuestions.length > 0) {
        return tableQuestions;
      }
    }

    // Natural exam paper format (paragraphs & headers)
    return this.parseFromParagraphs($);
  }

  private parseFromTables($: cheerio.CheerioAPI, tables: cheerio.Cheerio<any>): ImportQuestionItemInput[] {
    const questions: ImportQuestionItemInput[] = [];

    tables.each((tableIdx, tableElem) => {
      const rows = $(tableElem).find('tr');
      if (rows.length < 2) return;

      let questionContent = '';
      let questionImageUrl: string | null = null;
      let explanation: string | null = null;
      let difficulty: DifficultyLevel = DifficultyLevel.MEDIUM;
      const rawOptions: { label: string; content: string; imageUrl?: string | null }[] = [];
      let correctKey = '';

      rows.each((_, rowElem) => {
        const cells = $(rowElem).find('td, th');
        if (cells.length < 2) return;

        const leftCell = $(cells[0]);
        const rightCell = $(cells[1]);

        const rawLeft = leftCell.text().trim();
        const leftNormalized = rawLeft.toUpperCase().replace(/[\.:\s]+$/g, '').trim();

        // Check image in right cell
        const img = rightCell.find('img').first();
        const cellImageUrl = img.length > 0 ? img.attr('src') || null : null;

        // Remove img tag from HTML text to get pure text content
        const clone = rightCell.clone();
        clone.find('img').remove();
        const cellText = clone.text().trim();

        // Identify row type
        if (
          leftNormalized === 'KUNCI' ||
          leftNormalized === 'KUNCI JAWABAN' ||
          leftNormalized === 'JAWABAN' ||
          leftNormalized === 'KEY' ||
          leftNormalized === 'ANSWER'
        ) {
          const keyMatch = rightCell.text().trim().toUpperCase().match(/[A-Z0-9]+/);
          if (keyMatch) {
            correctKey = keyMatch[0];
          }
        } else if (
          leftNormalized === 'PEMBAHASAN' ||
          leftNormalized === 'EXPLANATION'
        ) {
          explanation = cellText || null;
        } else if (
          leftNormalized === 'TINGKAT' ||
          leftNormalized === 'KESULITAN' ||
          leftNormalized === 'DIFFICULTY'
        ) {
          const diffText = cellText.toUpperCase();
          if (diffText.includes('MUDAH') || diffText.includes('EASY')) {
            difficulty = DifficultyLevel.EASY;
          } else if (diffText.includes('SULIT') || diffText.includes('HARD')) {
            difficulty = DifficultyLevel.HARD;
          } else {
            difficulty = DifficultyLevel.MEDIUM;
          }
        } else if (/^[A-E]$/.test(leftNormalized)) {
          rawOptions.push({
            label: leftNormalized,
            content: cellText,
            imageUrl: cellImageUrl,
          });
        } else if (/^\d+$/.test(leftNormalized) || leftNormalized.startsWith('SOAL') || leftNormalized.startsWith('NO')) {
          // Explicit question row
          questionContent = cellText;
          if (cellImageUrl) {
            questionImageUrl = cellImageUrl;
          }
        } else if (!questionContent && rawOptions.length === 0) {
          // Header row or first row treated as question
          if (leftNormalized !== 'NO' && leftNormalized !== 'NOMOR') {
            questionContent = cellText || rawLeft;
            if (cellImageUrl) {
              questionImageUrl = cellImageUrl;
            }
          }
        }
      });

      // Construct question item only if it has at least 2 valid options (avoids admin/note tables)
      if (rawOptions.length < 2) {
        return;
      }

      const options: ImportQuestionOptionInput[] = rawOptions.map((opt, idx) => ({
        order: idx + 1,
        content: opt.content || `Opsi ${opt.label}`,
        image_url: opt.imageUrl || null,
        is_correct: opt.label === correctKey,
      }));

      const hasCorrect = options.some((o) => o.is_correct);
      let isValid = true;
      let error: string | null = null;

      if (!questionContent && !questionImageUrl) {
        isValid = false;
        error = 'Pertanyaan tidak boleh kosong';
      } else if (!hasCorrect) {
        isValid = false;
        error = `Kunci jawaban '${correctKey || '-'}' tidak ditemukan di opsi`;
      }

      questions.push({
        number: questions.length + 1,
        content: questionContent || (questionImageUrl ? 'Perhatikan gambar berikut:' : ''),
        image_url: questionImageUrl,
        type: QuestionType.MULTIPLE_CHOICE,
        difficulty,
        explanation,
        options,
        valid: isValid,
        error,
      });
    });

    return questions;
  }

  private parseFromParagraphs($: cheerio.CheerioAPI): ImportQuestionItemInput[] {
    const questions: ImportQuestionItemInput[] = [];

    interface BlockItem {
      text: string;
      imageUrl: string | null;
    }
    const blocks: BlockItem[] = [];

    // Traverse paragraphs, headings, list items
    $('p, h1, h2, h3, h4, h5, h6, li').each((_, elem) => {
      const img = $(elem).find('img').first();
      const imageUrl = img.length > 0 ? img.attr('src') || null : null;

      const clone = $(elem).clone();
      clone.find('img').remove();
      const text = clone.text().trim();

      if (text || imageUrl) {
        blocks.push({ text, imageUrl });
      }
    });

    interface ActiveQuestion {
      content: string;
      imageUrl: string | null;
      options: { label: string; content: string; imageUrl?: string | null }[];
      correctKey: string;
      explanation: string | null;
      difficulty: DifficultyLevel;
    }

    let currentQuestion: ActiveQuestion | null = null;

    for (const b of blocks) {
      const text = b.text;

      // Ignore instruction/header banners
      if (/^(?:PETUNJUK|PANDUAN|INSTRUKSI|CARA PENULISAN)/i.test(text)) {
        continue;
      }

      // 1. Check Question Boundary:
      // Examples: [SOAL 1], [NOMOR 1], [NO 1], 1., 1), SOAL 1:, NO. 1
      const questionMatch = text.match(
        /^(?:\[(?:SOAL|NOMOR|NO)\s*(\d+)\]|(?:SOAL|NOMOR|NO)\.?\s*(\d+)[\.\:]?|(\d+)[\.\)])\s*(.*)/i,
      );

      // 2. Check Option Line:
      // Examples: A. Pilihan, B) Pilihan, C : Pilihan, a. Pilihan (requires punctuation to avoid 'A cat...')
      const optionMatch = text.match(/^([A-E])\s*[\.\)\:]\s*(.*)/i);

      // 3. Check Key Line:
      // Examples: KUNCI: B, KUNCI JAWABAN = C, KEY: A, ANSWER: D
      const keyMatch = text.match(/^(?:KUNCI(?:\s*JAWABAN)?|JAWABAN|KEY|ANSWER)[\s\:\=\-]+([A-E])/i);

      // 4. Check Explanation Line:
      // Examples: PEMBAHASAN: Penjelasan ..., EXPLANATION: ...
      const expMatch = text.match(/^(?:PEMBAHASAN|EXPLANATION)[\s\:\=\-]+(.*)/i);

      // 5. Check Difficulty Line:
      // Examples: KESULITAN: MUDAH, TINGKAT: SEDANG, DIFFICULTY: HARD
      const diffMatch = text.match(/^(?:KESULITAN|TINGKAT(?:\s*KESULITAN)?|DIFFICULTY)[\s\:\=\-]+(.*)/i);

      if (questionMatch) {
        // Finalize previous question if one was active and had options/key
        if (currentQuestion && (currentQuestion.options.length > 0 || currentQuestion.correctKey)) {
          questions.push(this.buildQuestionFromBlock(currentQuestion, questions.length + 1));
        }

        const remainingText = questionMatch[4] ? questionMatch[4].trim() : '';
        currentQuestion = {
          content: remainingText,
          imageUrl: b.imageUrl || null,
          options: [],
          correctKey: '',
          explanation: null,
          difficulty: DifficultyLevel.MEDIUM,
        };
      } else if (optionMatch && optionMatch[1] && currentQuestion) {
        currentQuestion.options.push({
          label: optionMatch[1].toUpperCase(),
          content: optionMatch[2] ? optionMatch[2].trim() : '',
          imageUrl: b.imageUrl || null,
        });
      } else if (keyMatch && keyMatch[1] && currentQuestion) {
        currentQuestion.correctKey = keyMatch[1].toUpperCase();
      } else if (expMatch && currentQuestion) {
        currentQuestion.explanation = expMatch[1] ? expMatch[1].trim() : null;
      } else if (diffMatch && currentQuestion) {
        const diffText = (diffMatch[1] || '').toUpperCase();
        if (diffText.includes('MUDAH') || diffText.includes('EASY')) {
          currentQuestion.difficulty = DifficultyLevel.EASY;
        } else if (diffText.includes('SULIT') || diffText.includes('HARD')) {
          currentQuestion.difficulty = DifficultyLevel.HARD;
        } else {
          currentQuestion.difficulty = DifficultyLevel.MEDIUM;
        }
      } else if (currentQuestion) {
        // Non-boundary content: could be stimulus paragraph, subsequent explanation paragraph, or image
        if (b.imageUrl && !currentQuestion.imageUrl) {
          currentQuestion.imageUrl = b.imageUrl;
        }

        if (text) {
          // If an explanation was previously declared, subsequent non-boundary text appends to explanation
          if (currentQuestion.explanation !== null) {
            currentQuestion.explanation = `${currentQuestion.explanation}\n${text}`;
          } else if (currentQuestion.options.length === 0) {
            // If no options have been recorded yet, this belongs to the question content
            currentQuestion.content = currentQuestion.content
              ? `${currentQuestion.content}\n${text}`
              : text;
          } else {
            // If options are already in progress, append to the last option
            const lastOpt = currentQuestion.options[currentQuestion.options.length - 1];
            if (lastOpt) {
              lastOpt.content = `${lastOpt.content}\n${text}`;
            }
          }
        }
      }
    }

    if (currentQuestion && (currentQuestion.options.length > 0 || currentQuestion.correctKey)) {
      questions.push(this.buildQuestionFromBlock(currentQuestion, questions.length + 1));
    }

    return questions;
  }

  private buildQuestionFromBlock(
    block: {
      content: string;
      imageUrl: string | null;
      options: { label: string; content: string; imageUrl?: string | null }[];
      correctKey: string;
      explanation: string | null;
      difficulty: DifficultyLevel;
    },
    number: number,
  ): ImportQuestionItemInput {
    const options: ImportQuestionOptionInput[] = block.options.map((opt, idx) => ({
      order: idx + 1,
      content: opt.content || `Opsi ${opt.label}`,
      image_url: opt.imageUrl || null,
      is_correct: opt.label === block.correctKey,
    }));

    const hasCorrect = options.some((o) => o.is_correct);
    let isValid = true;
    let error: string | null = null;

    const content = block.content || (block.imageUrl ? 'Perhatikan gambar berikut:' : '');

    if (!content && !block.imageUrl) {
      isValid = false;
      error = 'Pertanyaan tidak boleh kosong';
    } else if (options.length < 2) {
      isValid = false;
      error = 'Minimal harus memiliki 2 opsi jawaban';
    } else if (!hasCorrect) {
      isValid = false;
      error = `Kunci jawaban '${block.correctKey || '-'}' tidak ditemukan di opsi`;
    }

    return {
      number,
      content,
      image_url: block.imageUrl || null,
      type: QuestionType.MULTIPLE_CHOICE,
      difficulty: block.difficulty,
      explanation: block.explanation,
      options,
      valid: isValid,
      error,
    };
  }
}
