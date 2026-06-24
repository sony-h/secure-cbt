import { Controller, Post, Get, Body, Param, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { GradingService } from './grading.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard, Roles } from '../../common/guards/roles.guard';
import { ApiResponse, UserRole } from '@secure-cbt/shared';

@ApiTags('grading')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('grading')
export class GradingController {
  constructor(private readonly gradingService: GradingService) {}

  @Post('essay')
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Grade an essay answer' })
  async gradeEssay(@Req() req: any, @Body() body: any) {
    const data = await this.gradingService.gradeEssay(body, req.user.sub);
    return { success: true, message: 'Essay graded', data };
  }

  @Get('result/:sessionId')
  @Roles(UserRole.TEACHER, UserRole.ADMIN, UserRole.STUDENT)
  @ApiOperation({ summary: 'Get grading result for a session' })
  async getResult(@Param('sessionId') sessionId: string) {
    const data = await this.gradingService.getResult(sessionId);
    return { success: true, message: 'Result retrieved', data };
  }

  @Get('class/:classId/exam/:examId')
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Get class score summary' })
  async getClassScore(@Param('classId') classId: string, @Param('examId') examId: string) {
    const data = await this.gradingService.getClassScore(classId, examId);
    return { success: true, message: 'Class score retrieved', data };
  }
}
