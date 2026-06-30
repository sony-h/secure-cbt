import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, Req, Inject } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { z } from 'zod';
import { ExamService } from './exam.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard, Roles } from '../../common/guards/roles.guard';
import { UserRole, createExamSchema, updateExamSchema, PaginationQuery, ExamStatus } from '@secure-cbt/shared';
import type { AuthenticatedRequest } from '../../common/types';

type CreateExamDto = z.infer<typeof createExamSchema>;
type UpdateExamDto = z.infer<typeof updateExamSchema>;

@ApiTags('exams')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('exams')
export class ExamController {
  constructor(
    @Inject(ExamService)
    private readonly examService: ExamService
  ) {}

  @Get()
  @Roles(UserRole.TEACHER, UserRole.ADMIN, UserRole.OPERATOR)
  async findAll(@Query() query: PaginationQuery & { status?: ExamStatus; subject_id?: string }) {
    const result = await this.examService.findAll(query);
    return { success: true, message: 'Exams retrieved', ...result };
  }

  @Get('student')
  @Roles(UserRole.STUDENT)
  async getForStudent(@Req() req: AuthenticatedRequest) {
    const data = await this.examService.getExamsForStudent(req.user.sub);
    return { success: true, message: 'Exams retrieved', data };
  }

  @Get(':id')
  @Roles(UserRole.TEACHER, UserRole.ADMIN, UserRole.OPERATOR)
  async findOne(@Param('id') id: string) {
    const data = await this.examService.findById(id);
    return { success: true, message: 'Exam retrieved', data };
  }

  @Post()
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  async create(@Req() req: AuthenticatedRequest, @Body() body: CreateExamDto) {
    const data = await this.examService.create(body, req.user.sub);
    return { success: true, message: 'Exam created', data };
  }

  @Patch(':id')
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  async update(@Param('id') id: string, @Body() body: UpdateExamDto) {
    const data = await this.examService.update(id, body);
    return { success: true, message: 'Exam updated', data };
  }

  @Delete(':id')
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  async remove(@Param('id') id: string) {
    const data = await this.examService.remove(id);
    return { success: true, message: 'Exam deleted', data };
  }

  @Post(':id/token')
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  async generateToken(@Param('id') id: string) {
    const data = await this.examService.generateToken(id);
    return { success: true, message: 'Token generated', data };
  }
}
