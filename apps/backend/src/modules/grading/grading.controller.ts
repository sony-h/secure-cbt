import { Controller, Post, Get, Body, Param, Query, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { z } from 'zod';
import { GradingService } from './grading.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard, Roles } from '../../common/guards/roles.guard';
import { UserRole, gradeEssaySchema } from '@secure-cbt/shared';
import type { AuthenticatedRequest } from '../../common/types';

type GradeEssayDto = z.infer<typeof gradeEssaySchema>;

@ApiTags('grading')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('grading')
export class GradingController {
  constructor(private readonly gradingService: GradingService) {}

  @Post('essay')
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Grade an essay answer' })
  async gradeEssay(@Req() req: AuthenticatedRequest, @Body() body: GradeEssayDto) {
    const data = await this.gradingService.gradeEssay(body, req.user.sub, req.user.role);
    return { success: true, message: 'Essay graded', data };
  }

  @Get('result/:sessionId')
  @Roles(UserRole.TEACHER, UserRole.ADMIN, UserRole.STUDENT)
  @ApiOperation({ summary: 'Get grading result for a session' })
  async getResult(@Req() req: AuthenticatedRequest, @Param('sessionId') sessionId: string) {
    const data = await this.gradingService.getResult(sessionId, req.user?.sub, req.user?.role);
    return { success: true, message: 'Result retrieved', data };
  }

  @Get('class/:classId/exam/:examId')
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Get class score summary' })
  async getClassScore(
    @Req() req: AuthenticatedRequest,
    @Param('classId') classId: string,
    @Param('examId') examId: string,
  ) {
    const data = await this.gradingService.getClassScore(classId, examId, req.user?.sub, req.user?.role);
    return { success: true, message: 'Class score retrieved', data };
  }

  @Get('pending/:examId')
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Get sessions with essays (filtered by status)' })
  async getPendingEssays(
    @Req() req: AuthenticatedRequest,
    @Param('examId') examId: string,
    @Query('class_id') classId?: string,
    @Query('status') status?: 'pending' | 'completed' | 'all',
  ) {
    const data = await this.gradingService.getPendingEssays(examId, classId, status, req.user?.sub, req.user?.role);
    return { success: true, message: 'Essays retrieved', data };
  }

  @Get('session/:sessionId/question/:questionId/history')
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Get revision history for an essay question' })
  async getEssayHistory(
    @Req() req: AuthenticatedRequest,
    @Param('sessionId') sessionId: string,
    @Param('questionId') questionId: string,
  ) {
    const data = await this.gradingService.getEssayHistory(sessionId, questionId, req.user?.sub, req.user?.role);
    return { success: true, message: 'Essay history retrieved', data };
  }

  @Get('session/:sessionId/essays')
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Get essay answers for a session' })
  async getSessionEssays(
    @Req() req: AuthenticatedRequest,
    @Param('sessionId') sessionId: string,
  ) {
    const data = await this.gradingService.getSessionEssays(sessionId, req.user?.sub, req.user?.role);
    return { success: true, message: 'Session essays retrieved', data };
  }

  @Post('exam/:id/regrade')
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Regrade all submitted sessions for an exam' })
  async regradeExam(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    const data = await this.gradingService.regradeExam(id, req.user.sub, req.user.role);
    return { success: true, message: 'Exam regrading completed', data };
  }

  @Post('session/:id/regrade')
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Regrade a single session' })
  async regradeSession(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    const data = await this.gradingService.regradeSession(id, req.user.sub, req.user.role);
    return { success: true, message: 'Session regrading completed', data };
  }
}
