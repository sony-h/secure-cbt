import { Controller, Get, Post, Body, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { z } from 'zod';
import { SessionService } from './session.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard, Roles } from '../../common/guards/roles.guard';
import { UserRole, startSessionSchema, submitSessionSchema } from '@secure-cbt/shared';
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
  async resume(@Req() req: AuthenticatedRequest, @Body() body: { session_id: string }) {
    const data = await this.sessionService.resume(body, req.user.sub);
    return { success: true, message: 'Session resumed', data };
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
}
