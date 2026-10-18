import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import ExcelJS from 'exceljs';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateStudentInput,
  UpdateStudentInput,
  ImportStudentRowInput,
  createStudentSchema,
  updateStudentSchema,
  PaginationQuery,
  generateClassPassword,
} from '@secure-cbt/shared';
import * as argon2 from 'argon2';
import { parsePagination, buildMeta } from '../../common/helpers/pagination.helper';

@Injectable()
export class StudentService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: PaginationQuery & { class_id?: string; major_id?: string }) {
    const { skip, page, perPage } = parsePagination(query);
    const { search, class_id, major_id, sort_by = 'created_at', sort_order = 'desc' } = query;
    const where: any = { deleted_at: null };
    if (search) {
      where.OR = [
        { full_name: { contains: search, mode: 'insensitive' } },
        { nis: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (class_id) where.class_id = class_id;
    if (major_id) where.class = { major_id };

    const [data, total] = await Promise.all([
      this.prisma.student.findMany({
        where,
        skip,
        take: perPage,
        orderBy: { [sort_by]: sort_order },
        include: { class: { include: { major: true } } },
      }),
      this.prisma.student.count({ where }),
    ]);

    return { data, meta: buildMeta(total, { page, perPage, skip }) };
  }

  async findById(id: string) {
    const student = await this.prisma.student.findFirst({
      where: { id, deleted_at: null },
      include: { class: { include: { major: true } }, user: { select: { id: true, username: true, email: true, is_active: true } } },
    });
    if (!student) throw new NotFoundException('Student not found');
    return student;
  }

  async create(dto: CreateStudentInput) {
    const data = createStudentSchema.parse(dto);
    const existing = await this.prisma.student.findFirst({ where: { OR: [{ nis: data.nis }] } });
    if (existing) throw new BadRequestException('NIS already exists');

    const classRecord = await this.prisma.class.findUnique({ where: { id: data.class_id } });
    if (!classRecord) throw new BadRequestException('Class not found');

    // Generate username from NIS, password from dto or fallback to NIS
    const username = data.nis;
    const password = data.password && data.password.trim() ? data.password.trim() : data.nis;
    const password_hash = await argon2.hash(password);

    const result = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: { username, email: `${data.nis}@student.securecbt.id`, password_hash, role: 'STUDENT' },
      });
      const student = await tx.student.create({
        data: {
          user_id: user.id,
          nis: data.nis,
          full_name: data.full_name,
          class_id: data.class_id,
          plain_password: password,
        },
        include: { class: { include: { major: true } } },
      });
      return student;
    });

    return result;
  }

  async update(id: string, dto: UpdateStudentInput) {
    const data = updateStudentSchema.parse(dto);
    const existing = await this.findById(id);

    return this.prisma.$transaction(async (tx) => {
      const updateData: any = {
        nis: data.nis,
        full_name: data.full_name,
        class_id: data.class_id,
        status: data.status,
      };

      if (data.password && data.password.trim()) {
        const plain = data.password.trim();
        updateData.plain_password = plain;
        const password_hash = await argon2.hash(plain);
        await tx.user.update({
          where: { id: existing.user_id },
          data: { password_hash },
        });
      }

      return tx.student.update({
        where: { id },
        data: updateData,
        include: { class: { include: { major: true } } },
      });
    });
  }

  async remove(id: string) {
    await this.findById(id);
    const student = await this.prisma.student.update({
      where: { id },
      data: { deleted_at: new Date() },
    });
    // Also soft delete the user
    await this.prisma.user.update({ where: { id: student.user_id }, data: { deleted_at: new Date() } });
    return { deleted: true };
  }

  async importStudents(rows: ImportStudentRowInput[]) {
    const results = { total: rows.length, success: 0, failed: 0, errors: [] as string[] };

    for (const row of rows) {
      try {
        const cls = await this.prisma.class.findFirst({ where: { name: row.class_name } });
        if (!cls) {
          results.failed++;
          results.errors.push(`Class "${row.class_name}" not found for NIS ${row.nis}`);
          continue;
        }

        const username = row.username || row.nis;
        const password = row.password || row.nis;
        const password_hash = await argon2.hash(password);

        await this.prisma.$transaction(async (tx) => {
          const user = await tx.user.create({
            data: { username, email: `${row.nis}@student.securecbt.id`, password_hash, role: 'STUDENT' },
          });
          await tx.student.create({
            data: {
              user_id: user.id,
              nis: row.nis,
              full_name: row.full_name,
              class_id: cls.id,
              plain_password: password,
            },
          });
        });

        results.success++;
      } catch (err: any) {
        results.failed++;
        results.errors.push(`Failed to import NIS ${row.nis}: ${err.message}`);
      }
    }

    return results;
  }

  async batchGeneratePasswords(dto: { class_id?: string; student_ids?: string[] }) {
    const where: any = { deleted_at: null };
    if (dto.class_id) where.class_id = dto.class_id;
    if (dto.student_ids && dto.student_ids.length > 0) where.id = { in: dto.student_ids };

    const students = await this.prisma.student.findMany({
      where,
      include: { class: true },
    });

    const updatedStudents: Array<{
      id: string;
      nis: string;
      full_name: string;
      class_name: string;
      plain_password: string;
    }> = [];

    for (const student of students) {
      const newPassword = generateClassPassword(student.class?.name || 'CBT');
      const password_hash = await argon2.hash(newPassword);

      await this.prisma.$transaction(async (tx) => {
        await tx.student.update({
          where: { id: student.id },
          data: { plain_password: newPassword },
        });
        await tx.user.update({
          where: { id: student.user_id },
          data: { password_hash },
        });
      });

      updatedStudents.push({
        id: student.id,
        nis: student.nis,
        full_name: student.full_name,
        class_name: student.class?.name || '-',
        plain_password: newPassword,
      });
    }

    return {
      count: updatedStudents.length,
      students: updatedStudents,
    };
  }

  async generateExcelExport(query?: { class_id?: string; student_ids?: string[] }) {
    const where: any = { deleted_at: null };
    if (query?.class_id) where.class_id = query.class_id;
    if (query?.student_ids && query.student_ids.length > 0) {
      where.id = { in: query.student_ids };
    }

    const students = await this.prisma.student.findMany({
      where,
      include: { class: { include: { major: true } } },
      orderBy: [
        { class: { name: 'asc' } },
        { full_name: 'asc' },
      ],
    });

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Secure CBT System';
    const sheet = workbook.addWorksheet('Data Akun Siswa', {
      views: [{ showGridLines: true }],
    });

    // Title header
    sheet.mergeCells('A2:G2');
    const titleCell = sheet.getCell('A2');
    titleCell.value = 'DATA AKUN DAN KREDENSIAL PESERTA CBT';
    titleCell.font = { name: 'Arial', size: 14, bold: true, color: { argb: 'FFFFFF' } };
    titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '1E3A8A' } };
    titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
    sheet.getRow(2).height = 28;

    // Subtitle
    const exportDateStr = new Date().toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
    sheet.mergeCells('A3:G3');
    const subCell = sheet.getCell('A3');
    subCell.value = `Tanggal Ekspor: ${exportDateStr} | Total: ${students.length} Siswa`;
    subCell.font = { name: 'Arial', size: 10, italic: true, color: { argb: 'DBEAFE' } };
    subCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '1E3A8A' } };
    subCell.alignment = { vertical: 'middle', horizontal: 'center' };
    sheet.getRow(3).height = 20;

    // Header row at row 5
    const headers = ['No', 'NIS', 'Nama Lengkap Siswa', 'Kelas', 'Username', 'Password', 'Status'];
    const headerRow = sheet.getRow(5);
    headerRow.values = headers;
    headerRow.height = 24;
    headerRow.eachCell((cell) => {
      cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '2563EB' } };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
      cell.border = {
        top: { style: 'thin', color: { argb: '94A3B8' } },
        bottom: { style: 'thin', color: { argb: '94A3B8' } },
        left: { style: 'thin', color: { argb: '94A3B8' } },
        right: { style: 'thin', color: { argb: '94A3B8' } },
      };
    });

    // Column widths
    sheet.getColumn(1).width = 6;
    sheet.getColumn(2).width = 16;
    sheet.getColumn(3).width = 32;
    sheet.getColumn(4).width = 18;
    sheet.getColumn(5).width = 18;
    sheet.getColumn(6).width = 20;
    sheet.getColumn(7).width = 14;

    // Data rows
    let rowIndex = 6;
    for (let i = 0; i < students.length; i++) {
      const s = students[i]!;
      const row = sheet.getRow(rowIndex++);
      row.values = [
        i + 1,
        s.nis,
        s.full_name,
        s.class?.name || '-',
        s.nis,
        s.plain_password || s.nis,
        s.status === 'ACTIVE' ? 'Aktif' : s.status === 'GRADUATED' ? 'Lulus' : 'Nonaktif',
      ];
      row.height = 20;

      row.eachCell((cell, colNumber) => {
        cell.font = { name: 'Arial', size: 9 };
        cell.border = {
          top: { style: 'thin', color: { argb: 'CBD5E1' } },
          bottom: { style: 'thin', color: { argb: 'CBD5E1' } },
          left: { style: 'thin', color: { argb: 'CBD5E1' } },
          right: { style: 'thin', color: { argb: 'CBD5E1' } },
        };
        if (colNumber === 1 || colNumber === 2 || colNumber === 5 || colNumber === 7) {
          cell.alignment = { vertical: 'middle', horizontal: 'center' };
        } else if (colNumber === 6) {
          cell.alignment = { vertical: 'middle', horizontal: 'center' };
          cell.font = { name: 'Courier New', size: 10, bold: true };
        } else {
          cell.alignment = { vertical: 'middle', horizontal: 'left' };
        }
      });
    }

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }
}
