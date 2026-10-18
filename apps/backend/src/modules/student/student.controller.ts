import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, Res } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { Response } from 'express';
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

  @Get('export/excel')
  @Roles(UserRole.ADMIN, UserRole.OPERATOR, UserRole.TEACHER)
  @ApiOperation({ summary: 'Export student credentials to Excel (.xlsx)' })
  async exportExcelGet(
    @Res() res: Response,
    @Query('class_id') classId?: string,
  ) {
    const buffer = await this.studentService.generateExcelExport({ class_id: classId });
    const filename = `Data_Siswa_${classId ? classId.substring(0, 8) : 'Semua'}.xlsx`;
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
  }

  @Post('export/excel')
  @Roles(UserRole.ADMIN, UserRole.OPERATOR, UserRole.TEACHER)
  @ApiOperation({ summary: 'Export filtered student credentials to Excel (.xlsx)' })
  async exportExcelPost(
    @Res() res: Response,
    @Body() body: { class_id?: string; student_ids?: string[] },
  ) {
    const buffer = await this.studentService.generateExcelExport(body);
    const filename = `Data_Siswa_Ekspor.xlsx`;
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
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

  @Post('batch-generate-passwords')
  @Roles(UserRole.ADMIN, UserRole.OPERATOR)
  @ApiOperation({ summary: 'Batch generate class-prefixed passwords for students' })
  async batchGeneratePasswords(@Body() body: { class_id?: string; student_ids?: string[] }) {
    const data = await this.studentService.batchGeneratePasswords(body);
    return { success: true, message: 'Passwords generated successfully', data };
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
