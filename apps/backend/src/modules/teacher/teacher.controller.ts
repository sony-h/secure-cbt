import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { TeacherService } from './teacher.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard, Roles } from '../../common/guards/roles.guard';
import { ApiResponse, UserRole } from '@secure-cbt/shared';

@ApiTags('teachers')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('teachers')
export class TeacherController {
  constructor(private readonly teacherService: TeacherService) {}

  @Get()
  @Roles(UserRole.ADMIN, UserRole.OPERATOR, UserRole.TEACHER)
  async findAll(@Query() query: any) {
    const result = await this.teacherService.findAll(query);
    return { success: true, message: 'Teachers retrieved', ...result } satisfies ApiResponse;
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.OPERATOR)
  async findOne(@Param('id') id: string) {
    const data = await this.teacherService.findById(id);
    return { success: true, message: 'Teacher retrieved', data };
  }

  @Post()
  @Roles(UserRole.ADMIN, UserRole.OPERATOR)
  async create(@Body() body: any) {
    const data = await this.teacherService.create(body);
    return { success: true, message: 'Teacher created', data };
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.OPERATOR)
  async update(@Param('id') id: string, @Body() body: any) {
    const data = await this.teacherService.update(id, body);
    return { success: true, message: 'Teacher updated', data };
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.OPERATOR)
  async remove(@Param('id') id: string) {
    const data = await this.teacherService.remove(id);
    return { success: true, message: 'Teacher deleted', data };
  }
}
