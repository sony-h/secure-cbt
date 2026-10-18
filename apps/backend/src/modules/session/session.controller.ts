import { Controller, Get, Post, Body, Param, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { z } from 'zod';
import { SessionService } from './session.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard, Roles } from '../../common/guards/roles.guard';
import { UserRole, startSessionSchema, submitSessionSchema, ResumeSessionInput, SyncTimeInput } from '@secure-cbt/shared';
import type { AuthenticatedRequest } from '../../common/types';

type StartSessionDto = z.infer<typeof startSessionSchema>;
type SubmitSessionDto = z.infer<typeof submitSessionSchema>;

@ApiTags('sessions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('sessions')
export class SessionController {
  constructor(private readonly sessionService: SessionService) {}

  @Post('start')
  @Roles(UserRole.STUDENT)
  @ApiOperation({ summary: 'Start an exam session' })
  async start(@Req() req: AuthenticatedRequest, @Body() body: StartSessionDto) {
    const data = await this.sessionService.start(body, req.user.sub);
    return { success: true, message: 'Session started', data };
  }

  @Post('resume')
  @Roles(UserRole.STUDENT)
  @ApiOperation({ summary: 'Resume an exam session' })
  async resume(@Req() req: AuthenticatedRequest, @Body() body: ResumeSessionInput) {
    const data = await this.sessionService.resume(body, req.user.sub);
    return { success: true, message: 'Session resumed', data };
  }

  @Post('sync-time')
  @Roles(UserRole.STUDENT)
  @ApiOperation({ summary: 'Sync session remaining time' })
  async syncTime(@Req() req: AuthenticatedRequest, @Body() body: SyncTimeInput) {
    const data = await this.sessionService.syncTime(body, req.user.sub);
    return { success: true, message: 'Time synced', data };
  }

  @Post('submit')
  @Roles(UserRole.STUDENT)
  @ApiOperation({ summary: 'Submit exam answers' })
  async submit(@Req() req: AuthenticatedRequest, @Body() body: SubmitSessionDto) {
    const data = await this.sessionService.submit(body, req.user.sub);
    return { success: true, message: 'Exam submitted', data };
  }

  @Get('history')
  @Roles(UserRole.STUDENT)
  @ApiOperation({ summary: 'Get student exam history' })
  async getHistory(@Req() req: AuthenticatedRequest) {
    const data = await this.sessionService.getHistory(req.user.sub);
    return { success: true, message: 'History retrieved', data };
  }

  @Get(':id/review')
  @Roles(UserRole.STUDENT)
  @ApiOperation({ summary: 'Get exam review and explanations (only when exam is finished)' })
  async getReview(@Req() req: AuthenticatedRequest, @Param('id') sessionId: string) {
    const data = await this.sessionService.getReview(sessionId, req.user.sub);
    return { success: true, message: 'Review data retrieved', data };
  }

  @Post(':id/force-submit')
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Force submit a student exam session' })
  async forceSubmit(@Req() req: AuthenticatedRequest, @Param('id') sessionId: string) {
    const data = await this.sessionService.forceSubmit(sessionId, req.user.sub, req.user.role);
    return { success: true, message: 'Session forcefully submitted', data };
  }

  @Post(':id/reset-warnings')
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Reset session warnings to zero' })
  async resetWarnings(@Req() req: AuthenticatedRequest, @Param('id') sessionId: string) {
    const data = await this.sessionService.resetWarnings(sessionId, req.user.sub, req.user.role);
    return { success: true, message: 'Warnings reset to 0', data };
  }

  @Post(':id/extend-time')
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Extend session remaining time' })
  async extendTime(
    @Req() req: AuthenticatedRequest,
    @Param('id') sessionId: string,
    @Body() body: { additional_minutes: number },
  ) {
    const data = await this.sessionService.extendTime(sessionId, body.additional_minutes, req.user.sub, req.user.role);
    return { success: true, message: 'Session time extended', data };
  }

  @Post(':id/unlock')
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Unlock a locked exam session' })
  async unlockSession(@Req() req: AuthenticatedRequest, @Param('id') sessionId: string) {
    const data = await this.sessionService.unlockSession(sessionId, req.user.sub, req.user.role);
    return { success: true, message: 'Session unlocked', data };
  }
}
