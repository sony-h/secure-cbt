import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { MonitoringService } from './monitoring.service';
import { MonitoringGateway } from './monitoring.gateway';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard, Roles } from '../../common/guards/roles.guard';
import { ApiResponse, UserRole } from '@secure-cbt/shared';

@ApiTags('monitoring')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('monitoring')
export class MonitoringController {
  constructor(
    private readonly monitoringService: MonitoringService,
    private readonly monitoringGateway: MonitoringGateway,
  ) {}

  @Get('exams/:id')
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Get real-time exam monitoring data' })
  async getExamMonitoring(@Param('id') id: string) {
    const data = await this.monitoringService.getExamMonitoring(id);
    const students = data.students.map((s) => ({
      ...s,
      is_connected: this.monitoringGateway.isStudentConnected(s.student_user_id),
    }));
    const enrichedData = {
      ...data,
      online_count: students.filter((s) => s.is_connected).length,
      students,
    };
    return { success: true, message: 'Monitoring data retrieved', data: enrichedData };
  }

  @Get('sessions/:id')
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Get session activity logs' })
  async getSessionLogs(@Param('id') id: string) {
    const data = await this.monitoringService.getSessionLogs(id);
    return { success: true, message: 'Session logs retrieved', data };
  }
}
