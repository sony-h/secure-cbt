import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { Response } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiConsumes } from '@nestjs/swagger';
import { z } from 'zod';
import { QuestionBankService } from './question-bank.service';
import { QuestionImportService } from './question-import.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard, Roles } from '../../common/guards/roles.guard';
import {
  UserRole,
  createQuestionSchema,
  updateQuestionSchema,
  createQuestionBankSchema,
  confirmImportQuestionsSchema,
  bulkDeleteQuestionsSchema,
  bulkMoveQuestionsSchema,
  bulkDeleteBanksSchema,
  PaginationQuery,
  QuestionType,
} from '@secure-cbt/shared';
import type { AuthenticatedRequest } from '../../common/types';

type CreateQuestionDto = z.infer<typeof createQuestionSchema>;
type UpdateQuestionDto = z.infer<typeof updateQuestionSchema>;
type CreateQuestionBankDto = z.infer<typeof createQuestionBankSchema>;
type ConfirmImportQuestionsDto = z.infer<typeof confirmImportQuestionsSchema>;
type BulkDeleteQuestionsDto = z.infer<typeof bulkDeleteQuestionsSchema>;
type BulkMoveQuestionsDto = z.infer<typeof bulkMoveQuestionsSchema>;
type BulkDeleteBanksDto = z.infer<typeof bulkDeleteBanksSchema>;

@ApiTags('questions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('questions')
export class QuestionBankController {
  constructor(
    private readonly questionBankService: QuestionBankService,
    private readonly questionImportService: QuestionImportService,
  ) {}

  @Get('template/word')
  @Roles(UserRole.TEACHER, UserRole.ADMIN, UserRole.OPERATOR)
  @ApiOperation({ summary: 'Download Word question template' })
  async downloadTemplateWord(@Res() res: Response) {
    const file = await this.questionImportService.getTemplateFile('word');
    res.setHeader('Content-Type', file.mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${file.filename}"`);
    res.send(file.buffer);
  }

  @Get('template/excel')
  @Roles(UserRole.TEACHER, UserRole.ADMIN, UserRole.OPERATOR)
  @ApiOperation({ summary: 'Download Excel question template' })
  async downloadTemplateExcel(@Res() res: Response) {
    const file = await this.questionImportService.getTemplateFile('excel');
    res.setHeader('Content-Type', file.mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${file.filename}"`);
    res.send(file.buffer);
  }

  @Post('import/preview')
  @Roles(UserRole.TEACHER, UserRole.ADMIN, UserRole.OPERATOR)
  @ApiOperation({ summary: 'Preview and validate Word/Excel questions import' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file'))
  async previewImport(
    @Req() req: AuthenticatedRequest,
    @UploadedFile() file: Express.Multer.File,
    @Body('bank_id') bankId?: string,
  ) {
    const data = await this.questionImportService.preview(file, bankId, req.user?.sub, req.user?.role);
    return { success: true, message: 'File berhasil dianalisis', data };
  }

  @Post('import/confirm')
  @Roles(UserRole.TEACHER, UserRole.ADMIN, UserRole.OPERATOR)
  @ApiOperation({ summary: 'Confirm and insert parsed questions into bank' })
  async confirmImport(@Req() req: AuthenticatedRequest, @Body() body: ConfirmImportQuestionsDto) {
    const validated = confirmImportQuestionsSchema.parse(body);
    const data = await this.questionImportService.confirm(validated, req.user?.sub, req.user?.role);
    return { success: true, message: 'Soal berhasil diimpor ke bank soal', data };
  }

  @Get('banks')
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  async getBanks(@Req() req: AuthenticatedRequest, @Query('subject_id') subjectId?: string) {
    const data = await this.questionBankService.getBanks(req.user.sub, req.user.role, subjectId);
    return { success: true, message: 'Question banks retrieved', data };
  }

  @Post('banks')
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  async createBank(@Req() req: AuthenticatedRequest, @Body() body: CreateQuestionBankDto) {
    const data = await this.questionBankService.createBank(body, req.user.sub, req.user.role);
    return { success: true, message: 'Question bank created', data };
  }

  @Delete('banks/:id')
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  async deleteBank(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    await this.questionBankService.deleteBank(id, req.user.sub, req.user.role);
    return { success: true, message: 'Question bank deleted', data: null };
  }

  @Post('banks/bulk-delete')
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Bulk delete question banks and cascade delete questions' })
  async bulkDeleteBanks(@Req() req: AuthenticatedRequest, @Body() body: BulkDeleteBanksDto) {
    const validated = bulkDeleteBanksSchema.parse(body);
    const data = await this.questionBankService.bulkDeleteBanks(validated.ids, req.user.sub, req.user.role);
    return { success: true, message: 'Question banks deleted successfully', data };
  }

  @Post('bulk-delete')
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Bulk delete questions with exam guard' })
  async bulkDelete(@Req() req: AuthenticatedRequest, @Body() body: BulkDeleteQuestionsDto) {
    const validated = bulkDeleteQuestionsSchema.parse(body);
    const data = await this.questionBankService.bulkDelete(validated.ids, req.user.sub, req.user.role);
    return { success: true, message: 'Questions deleted successfully', data };
  }

  @Post('bulk-move')
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Bulk move questions to another question bank' })
  async bulkMove(@Req() req: AuthenticatedRequest, @Body() body: BulkMoveQuestionsDto) {
    const validated = bulkMoveQuestionsSchema.parse(body);
    const data = await this.questionBankService.bulkMove(validated.ids, validated.target_bank_id, req.user.sub, req.user.role);
    return { success: true, message: 'Questions moved successfully', data };
  }

  @Get()
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  async findAll(
    @Req() req: AuthenticatedRequest,
    @Query() query: PaginationQuery & { bank_id?: string; type?: QuestionType; subject_id?: string },
  ) {
    const result = await this.questionBankService.findAll(query, req.user?.sub, req.user?.role);
    return { success: true, message: 'Questions retrieved', ...result };
  }

  @Get(':id')
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  async findOne(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    const data = await this.questionBankService.findById(id, req.user?.sub, req.user?.role);
    return { success: true, message: 'Question retrieved', data };
  }

  @Post()
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  async create(@Req() req: AuthenticatedRequest, @Body() body: CreateQuestionDto) {
    const data = await this.questionBankService.create(body, req.user?.sub, req.user?.role);
    return { success: true, message: 'Question created', data };
  }

  @Patch(':id')
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  async update(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() body: UpdateQuestionDto,
  ) {
    const data = await this.questionBankService.update(id, body, req.user?.sub, req.user?.role);
    return { success: true, message: 'Question updated', data };
  }

  @Delete(':id')
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  async remove(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    const data = await this.questionBankService.remove(id, req.user?.sub, req.user?.role);
    return { success: true, message: 'Question deleted', data };
  }

  @Post(':id/duplicate')
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  async duplicate(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    const data = await this.questionBankService.duplicate(id, req.user?.sub, req.user?.role);
    return { success: true, message: 'Question duplicated', data };
  }
}
