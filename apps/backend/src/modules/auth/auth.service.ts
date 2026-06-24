import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { PrismaService } from '../../prisma/prisma.service';
import {
  LoginRequestDto,
  LoginResponseDto,
  RefreshTokenRequestDto,
  ChangePasswordRequestDto,
  loginSchema,
  refreshTokenSchema,
  changePasswordSchema,
  UserRole,
} from '@secure-cbt/shared';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async login(dto: LoginRequestDto): Promise<LoginResponseDto> {
    const { username, password, device_id } = loginSchema.parse(dto);

    const user = await this.prisma.user.findFirst({
      where: { username, deleted_at: null },
    });

    if (!user || !user.is_active) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const valid = await argon2.verify(user.password_hash, password);
    if (!valid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload = { sub: user.id, username: user.username, role: user.role };
    const access_token = this.jwtService.sign(payload);
    const refresh_token = this.jwtService.sign(payload, {
      secret: process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret',
      expiresIn: '7d',
    });

    // Store refresh token
    await this.prisma.refreshToken.create({
      data: {
        user_id: user.id,
        token: refresh_token,
        device_id,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    // Invalidate old tokens for this device
    await this.prisma.refreshToken.deleteMany({
      where: {
        user_id: user.id,
        device_id,
        token: { not: refresh_token },
      },
    });

    // Determine full name from role
    let full_name = username;
    if (user.role === UserRole.STUDENT) {
      const student = await this.prisma.student.findUnique({ where: { user_id: user.id } });
      if (student) full_name = student.full_name;
    } else if (user.role === UserRole.TEACHER) {
      const teacher = await this.prisma.teacher.findUnique({ where: { user_id: user.id } });
      if (teacher) full_name = teacher.full_name;
    }

    return {
      access_token,
      refresh_token,
      expires_in: 900,
      user: { id: user.id, username: user.username, role: user.role, full_name },
    };
  }

  async refresh(dto: RefreshTokenRequestDto): Promise<LoginResponseDto> {
    const { refresh_token } = refreshTokenSchema.parse(dto);

    const stored = await this.prisma.refreshToken.findUnique({
      where: { token: refresh_token },
      include: { user: true },
    });

    if (!stored || stored.expires_at < new Date() || !stored.user.is_active) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const user = stored.user;
    const payload = { sub: user.id, username: user.username, role: user.role };
    const access_token = this.jwtService.sign(payload);
    const new_refresh_token = this.jwtService.sign(payload, {
      secret: process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret',
      expiresIn: '7d',
    });

    // Rotate refresh token
    await this.prisma.refreshToken.update({
      where: { id: stored.id },
      data: { token: new_refresh_token, expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) },
    });

    let full_name = user.username;
    if (user.role === UserRole.STUDENT) {
      const student = await this.prisma.student.findUnique({ where: { user_id: user.id } });
      if (student) full_name = student.full_name;
    } else if (user.role === UserRole.TEACHER) {
      const teacher = await this.prisma.teacher.findUnique({ where: { user_id: user.id } });
      if (teacher) full_name = teacher.full_name;
    }

    return {
      access_token,
      refresh_token: new_refresh_token,
      expires_in: 900,
      user: { id: user.id, username: user.username, role: user.role, full_name },
    };
  }

  async logout(userId: string, refreshToken?: string): Promise<void> {
    if (refreshToken) {
      await this.prisma.refreshToken.deleteMany({ where: { token: refreshToken } });
    } else {
      await this.prisma.refreshToken.deleteMany({ where: { user_id: userId } });
    }
  }

  async changePassword(userId: string, dto: ChangePasswordRequestDto): Promise<void> {
    const { old_password, new_password } = changePasswordSchema.parse(dto);

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException('User not found');

    const valid = await argon2.verify(user.password_hash, old_password);
    if (!valid) throw new UnauthorizedException('Invalid current password');

    const new_hash = await argon2.hash(new_password);
    await this.prisma.user.update({
      where: { id: userId },
      data: { password_hash: new_hash },
    });

    // Invalidate all refresh tokens
    await this.prisma.refreshToken.deleteMany({ where: { user_id: userId } });
  }

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        student: { include: { class: { include: { major: true } } } },
        teacher: { include: { teacher_subjects: { include: { subject: true } } } },
      },
    });

    if (!user) throw new UnauthorizedException('User not found');
    const { password_hash, ...safeUser } = user;
    return safeUser;
  }
}
