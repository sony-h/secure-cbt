import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { z } from 'zod';
import { StudentService } from './student.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard, Roles } from '../../common/guards/roles.guard';
import { UserRole, createStudentSchema, updateStudentSchema, importStudentRowSchema, PaginationQuery } from '@secure-cbt/shared';

type CreateStudentDto = z.infer<typeof createStudentSchema>;
type UpdateStudentDto = z.infer<typeof updateStudentSchema>;
type ImportStudentRowDto = z.infer<typeof importStudentRowSchema>;

@ApiTags('students')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('students')
export class StudentController {
  constructor(private readonly studentService: StudentService) {}

  @Get()
  @Roles(UserRole.ADMIN, UserRole.OPERATOR, UserRole.TEACHER)
  @ApiOperation({ summary: 'List all students' })
  async findAll(@Query() query: PaginationQuery & { class_id?: string; status?: string }) {
    const result = await this.studentService.findAll(query);
    return { success: true, message: 'Students retrieved', ...result };
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.OPERATOR, UserRole.TEACHER)
  async findOne(@Param('id') id: string) {
    const data = await this.studentService.findById(id);
    return { success: true, message: 'Student retrieved', data };
  }

  @Post()
  @Roles(UserRole.ADMIN, UserRole.OPERATOR)
  async create(@Body() body: CreateStudentDto) {
    const data = await this.studentService.create(body);
    return { success: true, message: 'Student created', data };
  }

  @Post('import')
  @Roles(UserRole.ADMIN, UserRole.OPERATOR)
  @ApiOperation({ summary: 'Import students from Excel' })
  async importStudents(@Body() body: { students: ImportStudentRowDto[] }) {
    const data = await this.studentService.importStudents(body.students);
    return { success: true, message: 'Import completed', data };
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.OPERATOR)
  async update(@Param('id') id: string, @Body() body: UpdateStudentDto) {
    const data = await this.studentService.update(id, body);
    return { success: true, message: 'Student updated', data };
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.OPERATOR)
  async remove(@Param('id') id: string) {
    const data = await this.studentService.remove(id);
    return { success: true, message: 'Student deleted', data };
  }
}
