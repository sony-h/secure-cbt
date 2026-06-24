import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AcademicService } from './academic.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard, Roles } from '../../common/guards/roles.guard';
import { ApiResponse, UserRole } from '@secure-cbt/shared';

@ApiTags('academic')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('academic')
export class AcademicController {
  constructor(private readonly academicService: AcademicService) {}

  // Academic Years
  @Get('years')
  @Roles(UserRole.ADMIN, UserRole.OPERATOR, UserRole.TEACHER)
  async getYears() {
    const data = await this.academicService.getAcademicYears();
    return { success: true, message: 'Academic years retrieved', data };
  }

  @Post('years')
  @Roles(UserRole.ADMIN)
  async createYear(@Body() body: any) {
    const data = await this.academicService.createAcademicYear(body);
    return { success: true, message: 'Academic year created', data };
  }

  @Patch('years/:id')
  @Roles(UserRole.ADMIN)
  async updateYear(@Param('id') id: string, @Body() body: any) {
    const data = await this.academicService.updateAcademicYear(id, body);
    return { success: true, message: 'Academic year updated', data };
  }

  @Delete('years/:id')
  @Roles(UserRole.ADMIN)
  async deleteYear(@Param('id') id: string) {
    await this.academicService.deleteAcademicYear(id);
    return { success: true, message: 'Academic year deleted', data: null };
  }

  // Majors
  @Get('majors')
  @Roles(UserRole.ADMIN, UserRole.OPERATOR, UserRole.TEACHER)
  async getMajors() {
    const data = await this.academicService.getMajors();
    return { success: true, message: 'Majors retrieved', data };
  }

  @Post('majors')
  @Roles(UserRole.ADMIN)
  async createMajor(@Body() body: any) {
    const data = await this.academicService.createMajor(body);
    return { success: true, message: 'Major created', data };
  }

  @Delete('majors/:id')
  @Roles(UserRole.ADMIN)
  async deleteMajor(@Param('id') id: string) {
    await this.academicService.deleteMajor(id);
    return { success: true, message: 'Major deleted', data: null };
  }

  // Classes
  @Get('classes')
  @Roles(UserRole.ADMIN, UserRole.OPERATOR, UserRole.TEACHER)
  async getClasses(@Query() query: any) {
    const data = await this.academicService.getClasses(query);
    return { success: true, message: 'Classes retrieved', data };
  }

  @Post('classes')
  @Roles(UserRole.ADMIN, UserRole.OPERATOR)
  async createClass(@Body() body: any) {
    const data = await this.academicService.createClass(body);
    return { success: true, message: 'Class created', data };
  }

  @Delete('classes/:id')
  @Roles(UserRole.ADMIN, UserRole.OPERATOR)
  async deleteClass(@Param('id') id: string) {
    await this.academicService.deleteClass(id);
    return { success: true, message: 'Class deleted', data: null };
  }

  // Subjects
  @Get('subjects')
  @Roles(UserRole.ADMIN, UserRole.OPERATOR, UserRole.TEACHER)
  async getSubjects(@Query() query: any) {
    const data = await this.academicService.getSubjects(query);
    return { success: true, message: 'Subjects retrieved', data };
  }

  @Post('subjects')
  @Roles(UserRole.ADMIN, UserRole.OPERATOR)
  async createSubject(@Body() body: any) {
    const data = await this.academicService.createSubject(body);
    return { success: true, message: 'Subject created', data };
  }

  @Delete('subjects/:id')
  @Roles(UserRole.ADMIN, UserRole.OPERATOR)
  async deleteSubject(@Param('id') id: string) {
    await this.academicService.deleteSubject(id);
    return { success: true, message: 'Subject deleted', data: null };
  }
}
