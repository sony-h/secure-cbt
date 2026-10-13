import {
  Controller,
  Get,
  Patch,
  Post,
  Delete,
  Body,
  UseGuards,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiConsumes } from '@nestjs/swagger';
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

  @Post('templates/word')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Upload custom master Word template (.docx)' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file'))
  async uploadWordTemplate(@UploadedFile() file: Express.Multer.File) {
    const data = await this.settingsService.uploadMasterTemplate(file, 'word');
    return { success: true, message: 'Master template Word berhasil diperbarui', data };
  }

  @Post('templates/excel')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Upload custom master Excel template (.xlsx)' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file'))
  async uploadExcelTemplate(@UploadedFile() file: Express.Multer.File) {
    const data = await this.settingsService.uploadMasterTemplate(file, 'excel');
    return { success: true, message: 'Master template Excel berhasil diperbarui', data };
  }

  @Delete('templates/word')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Reset master Word template to system default' })
  async resetWordTemplate() {
    const data = await this.settingsService.resetMasterTemplate('word');
    return { success: true, message: 'Template Word dikembalikan ke bawaan sistem', data };
  }

  @Delete('templates/excel')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Reset master Excel template to system default' })
  async resetExcelTemplate() {
    const data = await this.settingsService.resetMasterTemplate('excel');
    return { success: true, message: 'Template Excel dikembalikan ke bawaan sistem', data };
  }
}
