import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateAcademicYearDto, UpdateAcademicYearDto, CreateMajorDto, CreateClassDto, CreateSubjectDto,
  createAcademicYearSchema, updateAcademicYearSchema, createMajorSchema, createClassSchema, createSubjectSchema,
  PaginationQuery,
} from '@secure-cbt/shared';

@Injectable()
export class AcademicService {
  constructor(private readonly prisma: PrismaService) {}

  // Academic Years
  async getAcademicYears() {
    return this.prisma.academicYear.findMany({ orderBy: { created_at: 'desc' } });
  }

  async createAcademicYear(dto: CreateAcademicYearDto) {
    const data = createAcademicYearSchema.parse(dto);
    if (data.is_active) {
      await this.prisma.academicYear.updateMany({ where: { is_active: true }, data: { is_active: false } });
    }
    return this.prisma.academicYear.create({ data });
  }

  async updateAcademicYear(id: string, dto: UpdateAcademicYearDto) {
    const data = updateAcademicYearSchema.parse(dto);
    const year = await this.prisma.academicYear.findUnique({ where: { id } });
    if (!year) throw new NotFoundException('Academic year not found');
    if (data.is_active) {
      await this.prisma.academicYear.updateMany({ where: { id: { not: id }, is_active: true }, data: { is_active: false } });
    }
    return this.prisma.academicYear.update({ where: { id }, data });
  }

  async deleteAcademicYear(id: string) {
    await this.prisma.academicYear.findUniqueOrThrow({ where: { id } });
    return this.prisma.academicYear.delete({ where: { id } });
  }

  // Majors
  async getMajors() {
    return this.prisma.major.findMany({ orderBy: { name: 'asc' } });
  }

  async createMajor(dto: CreateMajorDto) {
    const data = createMajorSchema.parse(dto);
    return this.prisma.major.create({ data });
  }

  async deleteMajor(id: string) {
    await this.prisma.major.findUniqueOrThrow({ where: { id } });
    return this.prisma.major.delete({ where: { id } });
  }

  // Classes
  async getClasses(query: PaginationQuery & { major_id?: string; academic_year_id?: string }) {
    const where: any = {};
    if (query.major_id) where.major_id = query.major_id;
    if (query.academic_year_id) where.academic_year_id = query.academic_year_id;
    return this.prisma.class.findMany({
      where,
      include: { major: true, academic_year: true },
      orderBy: { name: 'asc' },
    });
  }

  async createClass(dto: CreateClassDto) {
    const data = createClassSchema.parse(dto);
    return this.prisma.class.create({ data, include: { major: true, academic_year: true } });
  }

  async deleteClass(id: string) {
    await this.prisma.class.findUniqueOrThrow({ where: { id } });
    return this.prisma.class.delete({ where: { id } });
  }

  // Subjects
  async getSubjects(query: { major_id?: string }) {
    const where: any = {};
    if (query.major_id) where.major_id = query.major_id;
    return this.prisma.subject.findMany({
      where,
      include: { major: true },
      orderBy: { name: 'asc' },
    });
  }

  async createSubject(dto: CreateSubjectDto) {
    const data = createSubjectSchema.parse(dto);
    return this.prisma.subject.create({ data, include: { major: true } });
  }

  async deleteSubject(id: string) {
    await this.prisma.subject.findUniqueOrThrow({ where: { id } });
    return this.prisma.subject.delete({ where: { id } });
  }
}
