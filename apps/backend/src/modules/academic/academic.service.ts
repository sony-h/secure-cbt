import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateAcademicYearInput, UpdateAcademicYearInput, CreateMajorInput, UpdateMajorInput, CreateClassInput, CreateSubjectInput,
  UpdateClassInput, UpdateSubjectInput,
  createAcademicYearSchema, updateAcademicYearSchema, createMajorSchema, updateMajorSchema, createClassSchema, createSubjectSchema,
  updateClassSchema, updateSubjectSchema,
  PaginationQuery,
} from '@secure-cbt/shared';

@Injectable()
export class AcademicService {
  constructor(private readonly prisma: PrismaService) {}

  // Academic Years
  async getAcademicYears() {
    return this.prisma.academicYear.findMany({ where: { deleted_at: null }, orderBy: { created_at: 'desc' } });
  }

  async createAcademicYear(dto: CreateAcademicYearInput) {
    const data = createAcademicYearSchema.parse(dto);
    if (data.is_active) {
      await this.prisma.academicYear.updateMany({ where: { is_active: true }, data: { is_active: false } });
    }
    return this.prisma.academicYear.create({ data });
  }

  async updateAcademicYear(id: string, dto: UpdateAcademicYearInput) {
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
    return this.prisma.academicYear.update({ where: { id }, data: { deleted_at: new Date() } });
  }

  // Majors
  async getMajors() {
    return this.prisma.major.findMany({ where: { deleted_at: null }, orderBy: { name: 'asc' } });
  }

  async createMajor(dto: CreateMajorInput) {
    const data = createMajorSchema.parse(dto);
    return this.prisma.major.create({ data });
  }

  async deleteMajor(id: string) {
    await this.prisma.major.findUniqueOrThrow({ where: { id } });
    return this.prisma.major.update({ where: { id }, data: { deleted_at: new Date() } });
  }

  async updateMajor(id: string, dto: UpdateMajorInput) {
    const data = updateMajorSchema.parse(dto);
    const major = await this.prisma.major.findUnique({ where: { id } });
    if (!major) throw new NotFoundException('Major not found');
    return this.prisma.major.update({ where: { id }, data });
  }

  // Classes
  async getClasses(query: PaginationQuery & { major_id?: string; academic_year_id?: string }) {
    const where: any = {};
    if (query.major_id) where.major_id = query.major_id;
    if (query.academic_year_id) where.academic_year_id = query.academic_year_id;
    return this.prisma.class.findMany({
      where: { ...where, deleted_at: null },
      include: { major: true, academic_year: true },
      orderBy: { name: 'asc' },
    });
  }

  async createClass(dto: CreateClassInput) {
    const data = createClassSchema.parse(dto);
    return this.prisma.class.create({ data, include: { major: true, academic_year: true } });
  }

  async deleteClass(id: string) {
    await this.prisma.class.findUniqueOrThrow({ where: { id } });
    return this.prisma.class.update({ where: { id }, data: { deleted_at: new Date() } });
  }

  async updateClass(id: string, dto: UpdateClassInput) {
    const data = updateClassSchema.parse(dto);
    // Filter out null values to avoid Prisma type issues with nullable fields
    const cleanData = Object.fromEntries(Object.entries(data).filter(([_, v]) => v !== undefined));
    const cls = await this.prisma.class.findUnique({ where: { id } });
    if (!cls) throw new NotFoundException('Class not found');
    return this.prisma.class.update({ where: { id }, data: cleanData, include: { major: true, academic_year: true } });
  }

  // Subjects
  async getSubjects(query: { major_id?: string }) {
    const where: any = {};
    if (query.major_id) where.major_id = query.major_id;
    return this.prisma.subject.findMany({
      where: { ...where, deleted_at: null },
      include: { major: true },
      orderBy: { name: 'asc' },
    });
  }

  async createSubject(dto: CreateSubjectInput) {
    const data = createSubjectSchema.parse(dto);
    return this.prisma.subject.create({ data, include: { major: true } });
  }

  async deleteSubject(id: string) {
    await this.prisma.subject.findUniqueOrThrow({ where: { id } });
    return this.prisma.subject.update({ where: { id }, data: { deleted_at: new Date() } });
  }

  async updateSubject(id: string, dto: UpdateSubjectInput) {
    const data = updateSubjectSchema.parse(dto);
    const subj = await this.prisma.subject.findUnique({ where: { id } });
    if (!subj) throw new NotFoundException('Subject not found');
    return this.prisma.subject.update({ where: { id }, data, include: { major: true } });
  }
}
