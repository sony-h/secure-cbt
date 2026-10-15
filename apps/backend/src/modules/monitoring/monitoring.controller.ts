import { Controller, Get, Post, Body, Param, UseGuards, Req, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { MonitoringService } from './monitoring.service';
import { MonitoringGateway } from './monitoring.gateway';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard, Roles } from '../../common/guards/roles.guard';
import { ApiResponse, UserRole } from '@secure-cbt/shared';
import type { AuthenticatedRequest } from '../../common/types';
import { randomUUID } from 'crypto';

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

  @Post('exams/:id/broadcast')
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Broadcast announcement to students in exam room' })
  async broadcastAnnouncement(
    @Req() req: AuthenticatedRequest,
    @Param('id') examId: string,
    @Body() body: { message: string; urgency?: 'low' | 'high' },
  ) {
    if (!body.message || !body.message.trim()) {
      throw new BadRequestException('Pesan pengumuman tidak boleh kosong');
    }
    const urgency: 'low' | 'high' = body.urgency === 'high' ? 'high' : 'low';
    const payload = {
      id: randomUUID(),
      message: body.message.trim(),
      urgency,
      sender: req.user?.username || 'Pengawas',
      timestamp: new Date().toISOString(),
    };
    this.monitoringGateway.broadcastToExam(examId, payload);
    return { success: true, message: 'Pengumuman berhasil disiarkan', data: payload };
  }
}
