import { Controller, Get, Patch, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { z } from 'zod';
import { SettingsService } from './settings.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard, Roles } from '../../common/guards/roles.guard';
import { UserRole, updateSettingsSchema } from '@secure-cbt/shared';

type UpdateSettingsDto = z.infer<typeof updateSettingsSchema>;

@ApiTags('settings')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get()
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get system settings' })
  async get() {
    const data = await this.settingsService.get();
    return { success: true, message: 'Settings retrieved', data };
  }

  @Patch()
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Update system settings' })
  async update(@Body() body: UpdateSettingsDto) {
    const data = await this.settingsService.update(body);
    return { success: true, message: 'Settings updated', data };
  }
}
