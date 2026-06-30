import { Controller, Post, Get, Body, Param, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { z } from 'zod';
import { AnswerService } from './answer.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard, Roles } from '../../common/guards/roles.guard';
import { UserRole, saveAnswerSchema, batchSyncAnswerSchema } from '@secure-cbt/shared';
import type { AuthenticatedRequest } from '../../common/types';

type SaveAnswerDto = z.infer<typeof saveAnswerSchema>;
type BatchSyncDto = z.infer<typeof batchSyncAnswerSchema>;

@ApiTags('answers')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('answers')
export class AnswerController {
  constructor(private readonly answerService: AnswerService) {}

  @Post('save')
  @Roles(UserRole.STUDENT)
  @ApiOperation({ summary: 'Save a single answer (autosave)' })
  async save(@Req() req: AuthenticatedRequest, @Body() body: SaveAnswerDto) {
    const data = await this.answerService.save(body, req.user.sub);
    return { success: true, message: 'Answer saved', data };
  }

  @Post('sync')
  @Roles(UserRole.STUDENT)
  @ApiOperation({ summary: 'Batch sync answers from offline storage' })
  async batchSync(@Req() req: AuthenticatedRequest, @Body() body: BatchSyncDto) {
    const data = await this.answerService.batchSync(body, req.user.sub);
    return { success: true, message: 'Answers synced', data };
  }

  @Get('status/:sessionId')
  @Roles(UserRole.STUDENT)
  @ApiOperation({ summary: 'Get sync status for a session' })
  async getSyncStatus(@Req() req: AuthenticatedRequest, @Param('sessionId') sessionId: string) {
    const data = await this.answerService.getSyncStatus(sessionId, req.user.sub);
    return { success: true, message: 'Sync status retrieved', data };
  }
}
