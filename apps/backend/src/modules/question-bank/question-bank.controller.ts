import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { z } from 'zod';
import { QuestionBankService } from './question-bank.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard, Roles } from '../../common/guards/roles.guard';
import { UserRole, createQuestionSchema, updateQuestionSchema, createQuestionBankSchema, PaginationQuery, QuestionType } from '@secure-cbt/shared';
import type { AuthenticatedRequest } from '../../common/types';

type CreateQuestionDto = z.infer<typeof createQuestionSchema>;
type UpdateQuestionDto = z.infer<typeof updateQuestionSchema>;
type CreateQuestionBankDto = z.infer<typeof createQuestionBankSchema>;

@ApiTags('questions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('questions')
export class QuestionBankController {
  constructor(private readonly questionBankService: QuestionBankService) {}

  @Get('banks')
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  async getBanks(@Req() req: AuthenticatedRequest, @Query('subject_id') subjectId?: string) {
    const data = await this.questionBankService.getBanks(req.user.sub, subjectId);
    return { success: true, message: 'Question banks retrieved', data };
  }

  @Post('banks')
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  async createBank(@Req() req: AuthenticatedRequest, @Body() body: CreateQuestionBankDto) {
    const data = await this.questionBankService.createBank(body, req.user.sub);
    return { success: true, message: 'Question bank created', data };
  }

  @Delete('banks/:id')
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  async deleteBank(@Param('id') id: string) {
    await this.questionBankService.deleteBank(id);
    return { success: true, message: 'Question bank deleted', data: null };
  }

  @Get()
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  async findAll(@Query() query: PaginationQuery & { bank_id?: string; type?: QuestionType; subject_id?: string }) {
    const result = await this.questionBankService.findAll(query);
    return { success: true, message: 'Questions retrieved', ...result };
  }

  @Get(':id')
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  async findOne(@Param('id') id: string) {
    const data = await this.questionBankService.findById(id);
    return { success: true, message: 'Question retrieved', data };
  }

  @Post()
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  async create(@Body() body: CreateQuestionDto) {
    const data = await this.questionBankService.create(body);
    return { success: true, message: 'Question created', data };
  }

  @Patch(':id')
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  async update(@Param('id') id: string, @Body() body: UpdateQuestionDto) {
    const data = await this.questionBankService.update(id, body);
    return { success: true, message: 'Question updated', data };
  }

  @Delete(':id')
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  async remove(@Param('id') id: string) {
    const data = await this.questionBankService.remove(id);
    return { success: true, message: 'Question deleted', data };
  }

  @Post(':id/duplicate')
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  async duplicate(@Param('id') id: string) {
    const data = await this.questionBankService.duplicate(id);
    return { success: true, message: 'Question duplicated', data };
  }
}
