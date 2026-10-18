import { Injectable, BadRequestException, NotFoundException, Inject } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import {
  CreateTeacherInput,
  UpdateTeacherInput,
  InviteTeacherInput,
  ToggleTeacherStatusInput,
  createTeacherSchema,
  updateTeacherSchema,
  inviteTeacherSchema,
  toggleTeacherStatusSchema,
  PaginationQuery,
} from '@secure-cbt/shared';
import * as argon2 from 'argon2';
import { randomBytes, createHash } from 'node:crypto';
import { parsePagination, buildMeta } from '../../common/helpers/pagination.helper';

@Injectable()
export class TeacherService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(EmailService) private readonly emailService: EmailService,
  ) {}

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
        include: {
          teacher_subjects: { include: { subject: true } },
          user: { select: { id: true, username: true, email: true, is_active: true, email_verified_at: true } },
        },
      }),
      this.prisma.teacher.count({ where }),
    ]);
    return { data, meta: buildMeta(total, { page, perPage, skip }) };
  }

  async findById(id: string) {
    const teacher = await this.prisma.teacher.findFirst({
      where: { id, deleted_at: null },
      include: {
        teacher_subjects: { include: { subject: true } },
        user: { select: { id: true, username: true, email: true, is_active: true, email_verified_at: true } },
      },
    });
    if (!teacher) throw new NotFoundException('Teacher not found');
    return teacher;
  }

  async create(dto: CreateTeacherInput) {
    const data = createTeacherSchema.parse(dto);
    const nip = data.nip ? data.nip.trim() : null;
    if (nip) {
      const existingNip = await this.prisma.teacher.findFirst({ where: { nip } });
      if (existingNip) throw new BadRequestException('NIP already exists');
    }

    const cleanName = data.full_name
      .toLowerCase()
      .replace(/^(drs|dra|ir|prof|h|hj)\.?\s*/i, '')
      .replace(/[^a-z0-9]/g, '')
      .slice(0, 10);
    const randSuffix = Math.random().toString(36).slice(2, 6);

    const username = nip ? nip : `guru_${cleanName || 'cbt'}_${randSuffix}`;
    const email = `${username}@teacher.securecbt.id`;
    const password = nip ? nip : 'guru123';
    const password_hash = await argon2.hash(password);

    const result = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: { username, email, password_hash, role: 'TEACHER', email_verified_at: new Date() },
      });
      const teacher = await tx.teacher.create({
        data: {
          user_id: user.id,
          nip,
          full_name: data.full_name,
          can_monitor_all_subjects: data.can_monitor_all_subjects ?? false,
        },
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

  async update(id: string, dto: UpdateTeacherInput) {
    const data = updateTeacherSchema.parse(dto);
    const existing = await this.findById(id);

    const nip = data.nip !== undefined ? (data.nip ? data.nip.trim() : null) : undefined;
    if (nip && nip !== existing.nip) {
      const existingNip = await this.prisma.teacher.findFirst({ where: { nip } });
      if (existingNip) throw new BadRequestException('NIP already exists');
    }

    return this.prisma.$transaction(async (tx) => {
      const updateData: any = { full_name: data.full_name };
      if (nip !== undefined) updateData.nip = nip;
      if (data.can_monitor_all_subjects !== undefined) {
        updateData.can_monitor_all_subjects = data.can_monitor_all_subjects;
      }

      const teacher = await tx.teacher.update({ where: { id }, data: updateData });
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
    const teacher = await this.prisma.teacher.findFirst({
      where: { id },
      include: { user: true },
    });
    if (!teacher) throw new NotFoundException('Teacher not found');

    const suffix = `deleted_${Date.now()}`;
    await this.prisma.$transaction(async (tx) => {
      await tx.teacher.update({
        where: { id },
        data: {
          deleted_at: new Date(),
          nip: teacher.nip ? `${teacher.nip}.${suffix}` : null,
        },
      });
      if (teacher.user) {
        await tx.user.update({
          where: { id: teacher.user_id },
          data: {
            deleted_at: new Date(),
            email: `${teacher.user.email}.${suffix}`,
            username: `${teacher.user.username}.${suffix}`,
          },
        });
      }
    });
    return { deleted: true };
  }

  async invite(dto: InviteTeacherInput, invitedById: string) {
    const data = inviteTeacherSchema.parse(dto);
    const cleanEmail = data.email.toLowerCase().trim();

    // Check if active user already exists
    const existing = await this.prisma.user.findFirst({
      where: { email: cleanEmail },
    });
    if (existing && !existing.deleted_at) {
      throw new BadRequestException('Pengguna dengan email ini sudah terdaftar');
    }

    // Invalidate existing pending invites
    await this.prisma.teacherInvite.deleteMany({
      where: { email: cleanEmail },
    });

    const rawToken = randomBytes(32).toString('hex');
    const tokenHash = createHash('sha256').update(rawToken).digest('hex');

    const inviter = await this.prisma.user.findUnique({
      where: { id: invitedById },
      include: { teacher: true },
    });
    const inviterName = inviter?.teacher?.full_name || inviter?.username || 'Administrator';

    const invite = await this.prisma.teacherInvite.create({
      data: {
        email: cleanEmail,
        token_hash: tokenHash,
        subject_ids: data.subject_ids || [],
        can_monitor_all_subjects: data.can_monitor_all_subjects ?? false,
        invited_by: invitedById,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      },
    });

    await this.emailService.sendTeacherInviteEmail(cleanEmail, rawToken, inviterName);

    return {
      id: invite.id,
      email: cleanEmail,
      expires_at: invite.expires_at,
    };
  }

  async toggleStatus(id: string, dto: ToggleTeacherStatusInput) {
    const { is_active } = toggleTeacherStatusSchema.parse(dto);
    const teacher = await this.findById(id);

    await this.prisma.user.update({
      where: { id: teacher.user_id },
      data: { is_active },
    });

    return { id, is_active };
  }
}
