import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { z } from 'zod';
import { TeacherService } from './teacher.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard, Roles } from '../../common/guards/roles.guard';
import { UserRole, createTeacherSchema, updateTeacherSchema, PaginationQuery } from '@secure-cbt/shared';

type CreateTeacherDto = z.infer<typeof createTeacherSchema>;
type UpdateTeacherDto = z.infer<typeof updateTeacherSchema>;

@ApiTags('teachers')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('teachers')
export class TeacherController {
  constructor(private readonly teacherService: TeacherService) {}

  @Get()
  @Roles(UserRole.ADMIN, UserRole.OPERATOR, UserRole.TEACHER)
  async findAll(@Query() query: PaginationQuery) {
    const result = await this.teacherService.findAll(query);
    return { success: true, message: 'Teachers retrieved', ...result };
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.OPERATOR)
  async findOne(@Param('id') id: string) {
    const data = await this.teacherService.findById(id);
    return { success: true, message: 'Teacher retrieved', data };
  }

  @Post()
  @Roles(UserRole.ADMIN, UserRole.OPERATOR)
  async create(@Body() body: CreateTeacherDto) {
    const data = await this.teacherService.create(body);
    return { success: true, message: 'Teacher created', data };
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.OPERATOR)
  async update(@Param('id') id: string, @Body() body: UpdateTeacherDto) {
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
