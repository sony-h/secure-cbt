import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateUserDto,
  UpdateUserDto,
  createUserSchema,
  updateUserSchema,
  UserRole,
  PaginationQuery,
} from '@secure-cbt/shared';
import * as argon2 from 'argon2';
import { parsePagination, buildMeta } from '../../common/helpers/pagination.helper';

@Injectable()
export class UserService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: PaginationQuery) {
    const { skip, page, perPage } = parsePagination(query);
    const { search, sort_by = 'created_at', sort_order = 'desc' } = query;
    const where: any = { deleted_at: null };
    if (search) {
      where.OR = [
        { username: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: perPage,
        orderBy: { [sort_by]: sort_order },
        select: { id: true, username: true, email: true, role: true, is_active: true, created_at: true, updated_at: true },
      }),
      this.prisma.user.count({ where }),
    ]);

    return { data, meta: buildMeta(total, { page, perPage, skip }) };
  }

  async findById(id: string) {
    const user = await this.prisma.user.findFirst({
      where: { id, deleted_at: null },
      select: { id: true, username: true, email: true, role: true, is_active: true, created_at: true, updated_at: true },
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async create(dto: CreateUserDto) {
    const data = createUserSchema.parse(dto);
    const existing = await this.prisma.user.findFirst({
      where: { OR: [{ username: data.username }, { email: data.email }] },
    });
    if (existing) throw new BadRequestException('Username or email already exists');

    const password_hash = await argon2.hash(data.password);
    const user = await this.prisma.user.create({
      data: { ...data, password_hash },
    });

    return { id: user.id, username: user.username, email: user.email, role: user.role, is_active: user.is_active };
  }

  async update(id: string, dto: UpdateUserDto) {
    const data = updateUserSchema.parse(dto);
    await this.findById(id); // Ensure exists

    const user = await this.prisma.user.update({
      where: { id },
      data,
      select: { id: true, username: true, email: true, role: true, is_active: true, created_at: true, updated_at: true },
    });
    return user;
  }

  async remove(id: string) {
    await this.findById(id);
    await this.prisma.user.update({ where: { id }, data: { deleted_at: new Date() } });
    return { deleted: true };
  }
}
