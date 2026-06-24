import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { StudentService } from './student.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard, Roles } from '../../common/guards/roles.guard';
import { ApiResponse, UserRole } from '@secure-cbt/shared';

@ApiTags('students')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('students')
export class StudentController {
  constructor(private readonly studentService: StudentService) {}

  @Get()
  @Roles(UserRole.ADMIN, UserRole.OPERATOR)
  @ApiOperation({ summary: 'List all students' })
  async findAll(@Query() query: any) {
    const result = await this.studentService.findAll(query);
    return { success: true, message: 'Students retrieved', ...result } satisfies ApiResponse;
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.OPERATOR, UserRole.TEACHER)
  async findOne(@Param('id') id: string) {
    const data = await this.studentService.findById(id);
    return { success: true, message: 'Student retrieved', data };
  }

  @Post()
  @Roles(UserRole.ADMIN, UserRole.OPERATOR)
  async create(@Body() body: any) {
    const data = await this.studentService.create(body);
    return { success: true, message: 'Student created', data };
  }

  @Post('import')
  @Roles(UserRole.ADMIN, UserRole.OPERATOR)
  @ApiOperation({ summary: 'Import students from Excel' })
  async importStudents(@Body() body: { students: any[] }) {
    const data = await this.studentService.importStudents(body.students);
    return { success: true, message: 'Import completed', data };
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.OPERATOR)
  async update(@Param('id') id: string, @Body() body: any) {
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
