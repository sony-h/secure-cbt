import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { MonitoringService } from './monitoring.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard, Roles } from '../../common/guards/roles.guard';
import { ApiResponse, UserRole } from '@secure-cbt/shared';

@ApiTags('monitoring')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('monitoring')
export class MonitoringController {
  constructor(private readonly monitoringService: MonitoringService) {}

  @Get('exams/:id')
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Get real-time exam monitoring data' })
  async getExamMonitoring(@Param('id') id: string) {
    const data = await this.monitoringService.getExamMonitoring(id);
    return { success: true, message: 'Monitoring data retrieved', data };
  }

  @Get('sessions/:id')
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Get session activity logs' })
  async getSessionLogs(@Param('id') id: string) {
    const data = await this.monitoringService.getSessionLogs(id);
    return { success: true, message: 'Session logs retrieved', data };
  }
}
