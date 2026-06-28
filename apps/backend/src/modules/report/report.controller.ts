import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { ReportService } from './report.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard, Roles } from '../../common/guards/roles.guard';
import { ApiResponse, UserRole } from '@secure-cbt/shared';

@ApiTags('reports')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('reports')
export class ReportController {
  constructor(private readonly reportService: ReportService) {}

  @Get('exam/:id')
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Get exam report' })
  async getExamReport(
    @Param('id') id: string,
    @Query('class_id') classId?: string,
    @Query('sort_by') sortBy?: string,
    @Query('sort_order') sortOrder?: 'asc' | 'desc',
  ) {
    const data = await this.reportService.getExamReport(id, classId, sortBy, sortOrder);
    return { success: true, message: 'Exam report retrieved', data };
  }

  @Get('class/:id')
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Get class report' })
  async getClassReport(@Param('id') id: string) {
    const data = await this.reportService.getClassReport(id);
    return { success: true, message: 'Class report retrieved', data };
  }
}
