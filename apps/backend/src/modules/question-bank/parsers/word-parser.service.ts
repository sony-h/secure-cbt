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
    rawOptions: Array<{ content: string; label?: string }>,
  ): QuestionType {
    if (explicitType) {
      return explicitType;
    }
    const cleanKey = (keyText || '').trim().toUpperCase();

    // 1. Check if options contain matching syntax (e.g. "A -> B" or "A → B")
    if (
      rawOptions.length > 0 &&
      rawOptions.some((o) => /(?:->|→|➔|➜|➡|⇒)/.test(o.content))
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

    // 5. If options and key are both empty -> ESSAY
    if (rawOptions.length === 0 && cleanKey.length === 0) {
      return QuestionType.ESSAY;
    }

    // 6. Default
    return QuestionType.MULTIPLE_CHOICE;
  }

  private buildQuestionItem(params: {
    number: number;
    explicitType: QuestionType | null;
    content: string;
    imageUrl: string | null;
    options: { label: string; content: string; imageUrl?: string | null }[];
    correctKey: string;
    explanation: string | null;
    difficulty: DifficultyLevel;
  }): ImportQuestionItemInput {
    const {
      number,
      explicitType,
      content: rawContent,
      imageUrl,
      options: rawOptions,
      correctKey,
      explanation,
      difficulty,
    } = params;

    const questionType = this.inferQuestionType(explicitType, correctKey, rawOptions);
    const content = rawContent || (imageUrl ? 'Perhatikan gambar berikut:' : '');

    let options: ImportQuestionOptionInput[] = [];
    let isValid = true;
    let error: string | null = null;

    if (!content && !imageUrl) {
      isValid = false;
      error = 'Pertanyaan tidak boleh kosong';
    }

    if (questionType === QuestionType.ESSAY) {
      options = [];
      if (!content && !imageUrl) {
        isValid = false;
        error = 'Pertanyaan tidak boleh kosong';
      }
    } else if (questionType === QuestionType.SHORT_ANSWER) {
      if (rawOptions.length > 0) {
        options = rawOptions.map((opt, idx) => ({
          order: idx + 1,
          content: opt.content,
          image_url: opt.imageUrl || null,
          is_correct: true,
        }));
      } else {
        const answers = correctKey
          .split(/[,;\n]+/)
          .map((s) => s.trim())
          .filter(Boolean);
        const effectiveAnswers =
          answers.length > 0 ? answers : correctKey.trim() ? [correctKey.trim()] : [];

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
        const keyUpper = correctKey.trim().toUpperCase();
        const isTrue = keyUpper === 'BENAR' || keyUpper === 'TRUE' || keyUpper === 'B';
        const isFalse = keyUpper === 'SALAH' || keyUpper === 'FALSE' || keyUpper === 'S';

        options = [
          { order: 1, content: 'Benar', image_url: null, is_correct: isTrue },
          { order: 2, content: 'Salah', image_url: null, is_correct: isFalse },
        ];
      } else {
        const keyUpper = correctKey.trim().toUpperCase();
        const isSingleLetter = /^[A-E]$/.test(keyUpper);

        options = rawOptions.map((opt, idx) => {
          const optContentUpper = opt.content.trim().toUpperCase();
          let isCorrect = false;

          if (isSingleLetter) {
            isCorrect = opt.label === keyUpper;
          } else {
            const isOptBenar =
              optContentUpper.startsWith('BENAR') ||
              optContentUpper === 'B' ||
              optContentUpper === 'TRUE';
            const isOptSalah =
              optContentUpper.startsWith('SALAH') ||
              optContentUpper === 'S' ||
              optContentUpper === 'FALSE';
            const keyIsBenar = keyUpper === 'BENAR' || keyUpper === 'TRUE';
            const keyIsSalah = keyUpper === 'SALAH' || keyUpper === 'FALSE';

            isCorrect = (keyIsBenar && isOptBenar) || (keyIsSalah && isOptSalah);
          }

          return {
            order: idx + 1,
            content: opt.content || `Opsi ${opt.label}`,
            image_url: opt.imageUrl || null,
            is_correct: isCorrect,
          };
        });
      }

      if (!options.some((o) => o.is_correct)) {
        isValid = false;
        error = `Kunci jawaban '${correctKey || '-'}' tidak valid untuk Benar / Salah`;
      }
    } else if (questionType === QuestionType.MATCHING) {
      options = rawOptions.map((opt, idx) => {
        const rawText = opt.content || '';
        const delimiterMatch = rawText.match(/->|→|➔|➜|➡|⇒/);
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
          image_url: opt.imageUrl || null,
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
      const targetKeys: string[] = correctKey.toUpperCase().match(/\b[A-E]\b/g) || [];
      options = rawOptions.map((opt, idx) => ({
        order: idx + 1,
        content: opt.content || `Opsi ${opt.label}`,
        image_url: opt.imageUrl || null,
        is_correct: targetKeys.includes(opt.label),
      }));

      if (options.length < 2) {
        isValid = false;
        error = 'Minimal harus memiliki 2 opsi jawaban';
      } else if (!options.some((o) => o.is_correct)) {
        isValid = false;
        error = `Kunci jawaban '${correctKey || '-'}' tidak ditemukan di opsi`;
      }
    } else {
      // MULTIPLE_CHOICE
      const keyMatch = correctKey.toUpperCase().match(/[A-E]/);
      const targetKey = keyMatch ? keyMatch[0] : correctKey.toUpperCase().trim();

      options = rawOptions.map((opt, idx) => ({
        order: idx + 1,
        content: opt.content || `Opsi ${opt.label}`,
        image_url: opt.imageUrl || null,
        is_correct: opt.label === targetKey,
      }));

      if (options.length < 2) {
        isValid = false;
        error = 'Minimal harus memiliki 2 opsi jawaban';
      } else if (!options.some((o) => o.is_correct)) {
        isValid = false;
        error = `Kunci jawaban '${correctKey || '-'}' tidak ditemukan di opsi`;
      }
    }

    return {
      number,
      content,
      image_url: imageUrl,
      type: questionType,
      difficulty,
      explanation,
      options,
      valid: isValid,
      error,
    };
  }

  private parseFromTables($: cheerio.CheerioAPI, tables: cheerio.Cheerio<any>): ImportQuestionItemInput[] {
    const questions: ImportQuestionItemInput[] = [];

    tables.each((_, tableElem) => {
      const rows = $(tableElem).find('tr');
      if (rows.length < 2) return;

      let explicitType: QuestionType | null = null;
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
          leftNormalized === 'TIPE' ||
          leftNormalized === 'TIPE SOAL' ||
          leftNormalized === 'TYPE'
        ) {
          explicitType = this.normalizeType(cellText);
        } else if (
          leftNormalized === 'KUNCI' ||
          leftNormalized === 'KUNCI JAWABAN' ||
          leftNormalized === 'JAWABAN' ||
          leftNormalized === 'KEY' ||
          leftNormalized === 'ANSWER'
        ) {
          correctKey = rightCell.text().trim();
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
        } else if (
          explicitType === QuestionType.MATCHING &&
          leftNormalized &&
          cellText &&
          !leftNormalized.startsWith('NO') &&
          !leftNormalized.startsWith('SOAL') &&
          leftNormalized !== 'PREMIS' &&
          leftNormalized !== 'PERNYATAAN'
        ) {
          rawOptions.push({
            label: String(rawOptions.length + 1),
            content: `${rawLeft} -> ${cellText}`,
            imageUrl: cellImageUrl,
          });
        } else if (/^\d+$/.test(leftNormalized) || leftNormalized.startsWith('SOAL') || leftNormalized.startsWith('NO')) {
          questionContent = cellText;
          if (cellImageUrl) {
            questionImageUrl = cellImageUrl;
          }
        } else if (!questionContent && rawOptions.length === 0) {
          if (leftNormalized !== 'NO' && leftNormalized !== 'NOMOR') {
            questionContent = cellText || rawLeft;
            if (cellImageUrl) {
              questionImageUrl = cellImageUrl;
            }
          }
        }
      });

      // Avoid non-question administrative tables
      const isEssayOrShort =
        explicitType === QuestionType.ESSAY ||
        explicitType === QuestionType.SHORT_ANSWER ||
        explicitType === QuestionType.TRUE_FALSE;
      if (rawOptions.length < 2 && !isEssayOrShort && !correctKey) {
        return;
      }

      questions.push(
        this.buildQuestionItem({
          number: questions.length + 1,
          explicitType,
          content: questionContent,
          imageUrl: questionImageUrl,
          options: rawOptions,
          correctKey,
          explanation,
          difficulty,
        }),
      );
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
      explicitType: QuestionType | null;
      content: string;
      imageUrl: string | null;
      options: { label: string; content: string; imageUrl?: string | null }[];
      correctKey: string;
      explanation: string | null;
      difficulty: DifficultyLevel;
    }

    let currentQuestion: ActiveQuestion | null = null;

    const finalizeActiveQuestion = () => {
      if (!currentQuestion) return;
      const hasContent = currentQuestion.content.trim().length > 0;
      const hasOptions = currentQuestion.options.length > 0;
      const hasKey = currentQuestion.correctKey.trim().length > 0;
      const isEssay = currentQuestion.explicitType === QuestionType.ESSAY;

      if (hasContent || hasOptions || hasKey || isEssay) {
        questions.push(
          this.buildQuestionItem({
            number: questions.length + 1,
            explicitType: currentQuestion.explicitType,
            content: currentQuestion.content,
            imageUrl: currentQuestion.imageUrl,
            options: currentQuestion.options,
            correctKey: currentQuestion.correctKey,
            explanation: currentQuestion.explanation,
            difficulty: currentQuestion.difficulty,
          }),
        );
      }
      currentQuestion = null;
    };

    for (const b of blocks) {
      const text = b.text;

      if (/^(?:PETUNJUK|PANDUAN|INSTRUKSI|CARA PENULISAN)/i.test(text)) {
        continue;
      }

      const questionMatch = text.match(
        /^(?:\[(?:SOAL|NOMOR|NO)\s*(\d+)\]|(?:SOAL|NOMOR|NO)\.?\s*(\d+)[\.\:]?|(\d+)[\.\)])\s*(.*)/i,
      );
      const typeMatch = text.match(/^(?:TIPE(?:\s*SOAL)?|TYPE)[\s\:\=\-]+(.*)/i);
      const optionMatch = text.match(/^([A-E])\s*[\.\)\:]\s*(.*)/i);
      const keyMatch = text.match(/^(?:KUNCI(?:\s*JAWABAN)?|JAWABAN|KEY|ANSWER)[\s\:\=\-]+(.*)/i);
      const expMatch = text.match(/^(?:PEMBAHASAN|EXPLANATION)[\s\:\=\-]+(.*)/i);
      const diffMatch = text.match(/^(?:KESULITAN|TINGKAT(?:\s*KESULITAN)?|DIFFICULTY)[\s\:\=\-]+(.*)/i);

      if (questionMatch) {
        finalizeActiveQuestion();

        const remainingText = questionMatch[4] ? questionMatch[4].trim() : '';
        currentQuestion = {
          explicitType: null,
          content: remainingText,
          imageUrl: b.imageUrl || null,
          options: [],
          correctKey: '',
          explanation: null,
          difficulty: DifficultyLevel.MEDIUM,
        };
      } else if (typeMatch && typeMatch[1] && currentQuestion) {
        const parsedType = this.normalizeType(typeMatch[1].trim());
        if (parsedType) {
          currentQuestion.explicitType = parsedType;
        }
      } else if (optionMatch && optionMatch[1] && currentQuestion) {
        currentQuestion.options.push({
          label: optionMatch[1].toUpperCase(),
          content: optionMatch[2] ? optionMatch[2].trim() : '',
          imageUrl: b.imageUrl || null,
        });
      } else if (keyMatch && currentQuestion) {
        currentQuestion.correctKey = keyMatch[1] ? keyMatch[1].trim() : '';
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
        if (b.imageUrl && !currentQuestion.imageUrl) {
          currentQuestion.imageUrl = b.imageUrl;
        }

        if (text) {
          if (currentQuestion.explanation !== null) {
            currentQuestion.explanation = `${currentQuestion.explanation}\n${text}`;
          } else if (currentQuestion.options.length === 0) {
            currentQuestion.content = currentQuestion.content
              ? `${currentQuestion.content}\n${text}`
              : text;
          } else {
            const lastOpt = currentQuestion.options[currentQuestion.options.length - 1];
            if (lastOpt) {
              lastOpt.content = `${lastOpt.content}\n${text}`;
            }
          }
        }
      }
    }

    finalizeActiveQuestion();

    return questions;
  }
}
