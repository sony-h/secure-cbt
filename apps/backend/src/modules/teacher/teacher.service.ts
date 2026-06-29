import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateTeacherDto, UpdateTeacherDto, createTeacherSchema, updateTeacherSchema, PaginationQuery } from '@secure-cbt/shared';
import * as argon2 from 'argon2';
import { parsePagination, buildMeta } from '../../common/helpers/pagination.helper';

@Injectable()
export class TeacherService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: PaginationQuery) {
    const { skip, page, perPage } = parsePagination(query);
    const { search, sort_by = 'created_at', sort_order = 'desc' } = query;
    const where: any = { deleted_at: null };
    if (search) {
      where.OR = [
        { full_name: { contains: search, mode: 'insensitive' } },
        { nip: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.teacher.findMany({
        where,
        skip,
        take: perPage,
        orderBy: { [sort_by]: sort_order },
        include: { teacher_subjects: { include: { subject: true } } },
      }),
      this.prisma.teacher.count({ where }),
    ]);
    return { data, meta: buildMeta(total, { page, perPage, skip }) };
  }

  async findById(id: string) {
    const teacher = await this.prisma.teacher.findFirst({
      where: { id, deleted_at: null },
      include: { teacher_subjects: { include: { subject: true } }, user: { select: { id: true, username: true, email: true, is_active: true } } },
    });
    if (!teacher) throw new NotFoundException('Teacher not found');
    return teacher;
  }

  async create(dto: CreateTeacherDto) {
    const data = createTeacherSchema.parse(dto);
    const existingNip = await this.prisma.teacher.findFirst({ where: { nip: data.nip } });
    if (existingNip) throw new BadRequestException('NIP already exists');

    const username = data.nip;
    const password = data.nip;
    const password_hash = await argon2.hash(password);

    const result = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: { username, email: `${data.nip}@teacher.securecbt.id`, password_hash, role: 'TEACHER' },
      });
      const teacher = await tx.teacher.create({
        data: { user_id: user.id, nip: data.nip, full_name: data.full_name },
      });
      if (data.subject_ids?.length) {
        await tx.teacherSubject.createMany({
          data: data.subject_ids.map((sid: string) => ({ teacher_id: teacher.id, subject_id: sid })),
        });
      }
      return tx.teacher.findUnique({
        where: { id: teacher.id },
        include: { teacher_subjects: { include: { subject: true } } },
      });
    });
    return result;
  }

  async update(id: string, dto: UpdateTeacherDto) {
    const data = updateTeacherSchema.parse(dto);
    await this.findById(id);

    return this.prisma.$transaction(async (tx) => {
      const teacher = await tx.teacher.update({ where: { id }, data: { nip: data.nip, full_name: data.full_name } });
      if (data.subject_ids !== undefined) {
        await tx.teacherSubject.deleteMany({ where: { teacher_id: id } });
        if (data.subject_ids.length > 0) {
          await tx.teacherSubject.createMany({
            data: data.subject_ids.map((sid) => ({ teacher_id: id, subject_id: sid })),
          });
        }
      }
      return tx.teacher.findUnique({
        where: { id },
        include: { teacher_subjects: { include: { subject: true } } },
      });
    });
  }

  async remove(id: string) {
    await this.findById(id);
    const teacher = await this.prisma.teacher.update({ where: { id }, data: { deleted_at: new Date() } });
    await this.prisma.user.update({ where: { id: teacher.user_id }, data: { deleted_at: new Date() } });
    return { deleted: true };
  }
}
