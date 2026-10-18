import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { PrismaService } from '../../prisma/prisma.service';
import { WordParserService } from './parsers/word-parser.service';
import { ExcelParserService } from './parsers/excel-parser.service';
import { SettingsService } from '../settings/settings.service';
import {
  PreviewImportQuestionsResponse,
  ConfirmImportQuestionsInput,
  ImportQuestionItemInput,
  UserRole,
} from '@secure-cbt/shared';
import { getTeacherScope, assertTeacherSubjectAccess } from '../../common/helpers/teacher-access.helper';

@Injectable()
export class QuestionImportService {
  private readonly logger = new Logger(QuestionImportService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly wordParser: WordParserService,
    private readonly excelParser: ExcelParserService,
    private readonly settingsService: SettingsService,
  ) {}

  async preview(
    file: Express.Multer.File,
    bankId?: string,
    userId?: string,
    userRole?: string,
  ): Promise<PreviewImportQuestionsResponse> {
    if (!file || !file.buffer) {
      throw new BadRequestException('File soal wajib diunggah');
    }

    if (bankId) {
      const bank = await this.prisma.questionBank.findUnique({
        where: { id: bankId },
      });
      if (!bank) {
        throw new NotFoundException('Bank soal tidak ditemukan');
      }
      if (userRole === UserRole.TEACHER && userId) {
        const scope = await getTeacherScope(this.prisma, userId);
        assertTeacherSubjectAccess(
          scope,
          bank.subject_id,
          'Anda tidak memiliki hak akses untuk mengimpor soal ke bank ini',
        );
      }
    }

    const filename = file.originalname.toLowerCase();
    let questions: ImportQuestionItemInput[] = [];

    if (filename.endsWith('.docx') || file.mimetype.includes('wordprocessingml')) {
      questions = await this.wordParser.parse(file.buffer);
    } else if (
      filename.endsWith('.xlsx') ||
      filename.endsWith('.xls') ||
      file.mimetype.includes('spreadsheet') ||
      file.mimetype.includes('excel')
    ) {
      questions = this.excelParser.parse(file.buffer);
    } else {
      throw new BadRequestException(
        'Format file tidak didukung. Harap unggah file Word (.docx) atau Excel (.xlsx)',
      );
    }

    if (questions.length === 0) {
      throw new BadRequestException(
        'Tidak ada butir soal yang berhasil dibaca. Pastikan format dokumen sesuai template.',
      );
    }

    const validCount = questions.filter((q) => q.valid).length;
    const invalidCount = questions.length - validCount;

    return {
      total_questions: questions.length,
      valid_count: validCount,
      invalid_count: invalidCount,
      questions,
    };
  }

  async confirm(
    dto: ConfirmImportQuestionsInput,
    userId?: string,
    userRole?: string,
  ): Promise<{ imported_count: number }> {
    const bank = await this.prisma.questionBank.findUnique({
      where: { id: dto.bank_id },
    });
    if (!bank) {
      throw new NotFoundException('Bank soal tidak ditemukan');
    }

    if (userRole === UserRole.TEACHER && userId) {
      const scope = await getTeacherScope(this.prisma, userId);
      assertTeacherSubjectAccess(
        scope,
        bank.subject_id,
        'Anda tidak memiliki hak akses untuk mengimpor soal ke bank ini',
      );
    }

    if (!dto.questions || dto.questions.length === 0) {
      throw new BadRequestException('Tidak ada butir soal untuk diimpor');
    }

    // Execute in atomic transaction
    await this.prisma.$transaction(async (tx) => {
      for (const q of dto.questions) {
        const createdQuestion = await tx.question.create({
          data: {
            question_bank_id: dto.bank_id,
            content: q.content,
            image_url: q.image_url || null,
            type: q.type,
            difficulty: q.difficulty,
            explanation: q.explanation || null,
          },
        });

        if (q.options && q.options.length > 0) {
          await tx.questionOption.createMany({
            data: q.options.map((opt, idx) => ({
              question_id: createdQuestion.id,
              order: opt.order || idx + 1,
              content: opt.content,
              image_url: opt.image_url || null,
              is_correct: opt.is_correct,
            })),
          });
        }
      }
    });

    this.logger.log(`Successfully imported ${dto.questions.length} questions into bank ${dto.bank_id}`);
    return { imported_count: dto.questions.length };
  }

  async getTemplateFile(type: 'word' | 'excel'): Promise<{
    buffer: Buffer;
    filename: string;
    mimeType: string;
  }> {
    const settings = await this.settingsService.get();

    if (type === 'word') {
      const mimeType =
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
      const filename = 'Template_Soal_Assessia.docx';

      if (settings.template_docx_url) {
        const customBuffer = await this.resolveStoredFileBuffer(settings.template_docx_url);
        if (customBuffer) {
          return { buffer: customBuffer, filename, mimeType };
        }
      }

      // Default fallback
      const defaultPath = path.join(__dirname, 'templates', 'default-template-soal.docx');
      if (fs.existsSync(defaultPath)) {
        return { buffer: await fs.promises.readFile(defaultPath), filename, mimeType };
      }
    } else {
      const mimeType =
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      const filename = 'Template_Soal_Assessia.xlsx';

      if (settings.template_xlsx_url) {
        const customBuffer = await this.resolveStoredFileBuffer(settings.template_xlsx_url);
        if (customBuffer) {
          return { buffer: customBuffer, filename, mimeType };
        }
      }

      // Default fallback
      const defaultPath = path.join(__dirname, 'templates', 'default-template-soal.xlsx');
      if (fs.existsSync(defaultPath)) {
        return { buffer: await fs.promises.readFile(defaultPath), filename, mimeType };
      }
    }

    throw new NotFoundException(`Template file untuk format ${type} tidak ditemukan`);
  }

  private async resolveStoredFileBuffer(fileUrl: string): Promise<Buffer | null> {
    try {
      const match = fileUrl.match(/\/uploads\/(.+)$/);
      if (match && match[1]) {
        const filePath = path.join(process.cwd(), 'storage', 'uploads', match[1]);
        if (fs.existsSync(filePath)) {
          return await fs.promises.readFile(filePath);
        }
      }
    } catch (err) {
      this.logger.warn(`Failed to read stored template buffer for ${fileUrl}: ${err}`);
    }
    return null;
  }
}
