import { Injectable, UnauthorizedException, BadRequestException, NotFoundException, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { randomUUID, randomBytes, createHash } from 'node:crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import {
  LoginInput,
  RefreshTokenInput,
  ChangePasswordInput,
  RegisterTeacherInput,
  VerifyEmailInput,
  ResendVerificationInput,
  ForgotPasswordInput,
  ResetPasswordInput,
  loginSchema,
  refreshTokenSchema,
  changePasswordSchema,
  registerTeacherSchema,
  verifyEmailSchema,
  resendVerificationSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  passwordSchema,
  UserRole,
} from '@secure-cbt/shared';

@Injectable()
export class AuthService {
  constructor(
    @Inject(PrismaService)
    private readonly prisma: PrismaService,
    @Inject(JwtService)
    private readonly jwtService: JwtService,
    @Inject(ConfigService)
    private readonly config: ConfigService,
    @Inject(EmailService)
    private readonly emailService: EmailService,
  ) {}

  private async verifyTurnstileToken(token?: string): Promise<boolean> {
    const secretKey = this.config.get<string>('TURNSTILE_SECRET_KEY');
    if (!secretKey || !secretKey.trim()) {
      // In dev/test environments without a secret, allow bypass
      return true;
    }
    if (!token) return false;

    try {
      const formData = new URLSearchParams();
      formData.append('secret', secretKey.trim());
      formData.append('response', token);

      const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
        method: 'POST',
        body: formData,
      });
      const outcome: any = await res.json();
      return outcome.success === true;
    } catch {
      return false;
    }
  }

  async login(dto: LoginInput) {
    const { username, password, device_id } = loginSchema.parse(dto);

    const user = await this.prisma.user.findFirst({
      where: {
        OR: [{ username }, { email: username }],
        deleted_at: null,
      },
    });

    if (!user || !user.is_active) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (user.role === UserRole.TEACHER && !user.email_verified_at) {
      throw new UnauthorizedException('Email Anda belum diverifikasi. Silakan periksa inbox email Anda.');
    }

    const valid = await argon2.verify(user.password_hash, password);
    if (!valid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const profile = await this.resolveProfileData(user);
    const payload = { sub: user.id, username: user.username, role: user.role };
    const access_token = this.jwtService.sign(payload);
    const refresh_token = this.jwtService.sign(payload, {
      secret: process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret',
      expiresIn: '7d',
      jwtid: randomUUID(),
    });

    return await this.prisma.$transaction(async (tx) => {
      await tx.refreshToken.deleteMany({
        where: { user_id: user.id, device_id },
      });

      await tx.refreshToken.create({
        data: {
          user_id: user.id,
          token: refresh_token,
          device_id,
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
      });

      return {
        access_token,
        refresh_token,
        expires_in: 900,
        user: { id: user.id, username: user.username, email: user.email, role: user.role, ...profile },
      };
    });
  }

  async refresh(dto: RefreshTokenInput) {
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
      jwtid: randomUUID(),
    });

    // Rotate refresh token — atomic compare-and-swap: only the request that still
    // holds the current token can rotate it; concurrent losers get a clean 401.
    const rotated = await this.prisma.refreshToken.updateMany({
      where: { id: stored.id, token: refresh_token },
      data: { token: new_refresh_token, expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) },
    });
    if (rotated.count !== 1) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const profile = await this.resolveProfileData(user);

    return {
      access_token,
      refresh_token: new_refresh_token,
      expires_in: 900,
      user: { id: user.id, username: user.username, role: user.role, ...profile },
    };
  }

  async logout(userId: string, refreshToken?: string): Promise<void> {
    if (refreshToken) {
      await this.prisma.refreshToken.deleteMany({ where: { token: refreshToken } });
    } else {
      await this.prisma.refreshToken.deleteMany({ where: { user_id: userId } });
    }
  }

  async changePassword(userId: string, dto: ChangePasswordInput): Promise<void> {
    const { old_password, new_password } = changePasswordSchema.parse(dto);
    passwordSchema.parse(new_password);

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

  private async resolveProfileData(user: { id: string; role: string; username: string }) {
    let full_name = user.username;
    let nis: string | undefined;
    let class_name: string | undefined;

    if (user.role === UserRole.STUDENT) {
      const student = await this.prisma.student.findUnique({
        where: { user_id: user.id },
        include: { class: true },
      });
      if (student) {
        full_name = student.full_name;
        nis = student.nis;
        class_name = student.class?.name;
      }
    } else if (user.role === UserRole.TEACHER) {
      const teacher = await this.prisma.teacher.findUnique({ where: { user_id: user.id } });
      if (teacher) full_name = teacher.full_name;
    } else if (user.role === UserRole.ADMIN) {
      full_name = 'Administrator';
    } else if (user.role === UserRole.OPERATOR) {
      full_name = 'Operator';
    }

    return { full_name, nis, class_name };
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

    const { password_hash, teacher, student, ...safeUser } = user;
    const profile = await this.resolveProfileData(user);

    return { ...safeUser, ...profile, teacher, student };
  }

  async getInviteInfo(token: string) {
    if (!token) throw new BadRequestException('Token undangan tidak valid');
    const token_hash = createHash('sha256').update(token.trim()).digest('hex');

    const invite = await this.prisma.teacherInvite.findFirst({
      where: {
        token_hash,
        expires_at: { gt: new Date() },
        accepted_at: null,
      },
    });

    if (!invite) {
      throw new NotFoundException('Undangan tidak valid atau sudah kedaluwarsa');
    }

    return {
      email: invite.email,
      expires_at: invite.expires_at,
    };
  }

  async registerTeacher(dto: RegisterTeacherInput) {
    const data = registerTeacherSchema.parse(dto);

    // 1. Anti-bot validation
    const isAntiBotValid = await this.verifyTurnstileToken(data.turnstile_token);
    if (!isAntiBotValid) {
      throw new BadRequestException('Verifikasi anti-bot gagal. Silakan coba lagi.');
    }

    // 2. Check email uniqueness (active vs soft-deleted)
    const existingUser = await this.prisma.user.findFirst({
      where: { email: data.email.toLowerCase() },
    });
    if (existingUser && !existingUser.deleted_at) {
      throw new BadRequestException('Alamat email sudah terdaftar');
    }

    // 3. Check NIP uniqueness if provided (active vs soft-deleted)
    let existingTeacher: any = null;
    if (data.nip) {
      existingTeacher = await this.prisma.teacher.findFirst({
        where: { nip: data.nip },
      });
      if (existingTeacher && !existingTeacher.deleted_at) {
        throw new BadRequestException('NIP/NIY sudah terdaftar');
      }
    }

    // 4. Check invite token if supplied
    let invite: any = null;
    if (data.invite_token && data.invite_token.trim()) {
      const inviteHash = createHash('sha256').update(data.invite_token.trim()).digest('hex');
      invite = await this.prisma.teacherInvite.findFirst({
        where: {
          token_hash: inviteHash,
          email: data.email.toLowerCase(),
          expires_at: { gt: new Date() },
          accepted_at: null,
        },
      });

      if (!invite) {
        throw new BadRequestException('Tautan undangan tidak valid atau sudah kedaluwarsa');
      }
    }

    // 5. Generate credentials
    const cleanEmail = data.email.toLowerCase().trim();
    const cleanName = data.full_name
      .toLowerCase()
      .replace(/^(drs|dra|ir|prof|h|hj)\.?\s*/i, '')
      .replace(/[^a-z0-9]/g, '')
      .slice(0, 10);
    const randSuffix = Math.random().toString(36).slice(2, 6);
    let username = data.nip ? data.nip : `guru_${cleanName || 'cbt'}_${randSuffix}`;
    const password_hash = await argon2.hash(data.password);
    const isInvite = !!invite;

    const result = await this.prisma.$transaction(async (tx) => {
      // Free unique constraints from previously soft-deleted account if any
      if (existingUser && existingUser.deleted_at) {
        const suffix = `deleted_${Date.now()}`;
        await tx.user.update({
          where: { id: existingUser.id },
          data: {
            email: `${existingUser.email}.${suffix}`,
            username: `${existingUser.username}.${suffix}`,
          },
        });
      }

      if (existingTeacher && existingTeacher.deleted_at && existingTeacher.nip) {
        const suffix = `deleted_${Date.now()}`;
        await tx.teacher.update({
          where: { id: existingTeacher.id },
          data: {
            nip: `${existingTeacher.nip}.${suffix}`,
          },
        });
      }

      // Check username collision
      const userWithUsername = await tx.user.findFirst({
        where: { username },
      });
      if (userWithUsername) {
        if (userWithUsername.deleted_at) {
          await tx.user.update({
            where: { id: userWithUsername.id },
            data: { username: `${userWithUsername.username}.deleted_${Date.now()}` },
          });
        } else {
          username = `${username}_${Math.random().toString(36).slice(2, 6)}`;
        }
      }

      const user = await tx.user.create({
        data: {
          username,
          email: cleanEmail,
          password_hash,
          role: 'TEACHER',
          is_active: true,
          email_verified_at: isInvite ? new Date() : null,
        },
      });

      const teacher = await tx.teacher.create({
        data: {
          user_id: user.id,
          nip: data.nip || null,
          full_name: data.full_name,
          can_monitor_all_subjects: isInvite ? (invite?.can_monitor_all_subjects ?? false) : false,
        },
      });

      // Connect subjects if invite had pre-selected subjects
      if (isInvite) {
        if (invite.subject_ids && Array.isArray(invite.subject_ids)) {
          for (const sid of invite.subject_ids as string[]) {
            await tx.teacherSubject.create({
              data: { teacher_id: teacher.id, subject_id: sid },
            });
          }
        }
        await tx.teacherInvite.update({
          where: { id: invite.id },
          data: { accepted_at: new Date() },
        });
      }

      // If not invite, create email verification token
      let verificationTokenPlain: string | null = null;
      if (!isInvite) {
        const rawToken = randomBytes(32).toString('hex');
        const tokenHash = createHash('sha256').update(rawToken).digest('hex');
        verificationTokenPlain = rawToken;

        await tx.verificationToken.create({
          data: {
            identifier: user.id,
            token_hash: tokenHash,
            type: 'EMAIL_VERIFICATION',
            expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
          },
        });
      }

      return { user, teacher, verificationTokenPlain, isInvite };
    });

    // Send verification email outside transaction
    if (!result.isInvite && result.verificationTokenPlain) {
      await this.emailService.sendVerificationEmail(
        cleanEmail,
        data.full_name,
        result.verificationTokenPlain,
      );
    }

    return {
      message: result.isInvite
        ? 'Pendaftaran berhasil. Akun Anda telah aktif dan terverifikasi.'
        : 'Pendaftaran berhasil. Silakan periksa inbox email Anda untuk verifikasi.',
      is_verified: result.isInvite,
      email: cleanEmail,
    };
  }

  async verifyEmail(dto: VerifyEmailInput) {
    const { token } = verifyEmailSchema.parse(dto);
    const tokenHash = createHash('sha256').update(token.trim()).digest('hex');

    const verificationRecord = await this.prisma.verificationToken.findFirst({
      where: {
        token_hash: tokenHash,
        type: 'EMAIL_VERIFICATION',
        expires_at: { gt: new Date() },
      },
    });

    if (!verificationRecord) {
      throw new BadRequestException('Tautan verifikasi tidak valid atau sudah kedaluwarsa');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: verificationRecord.identifier },
    });

    if (!user) {
      throw new NotFoundException('Pengguna tidak ditemukan');
    }

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: user.id },
        data: { email_verified_at: new Date() },
      }),
      this.prisma.verificationToken.delete({
        where: { id: verificationRecord.id },
      }),
    ]);

    // Issue tokens immediately
    const profile = await this.resolveProfileData(user);
    const payload = { sub: user.id, username: user.username, role: user.role };
    const access_token = this.jwtService.sign(payload);
    const refresh_token = this.jwtService.sign(payload, {
      secret: process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret',
      expiresIn: '7d',
      jwtid: randomUUID(),
    });

    await this.prisma.refreshToken.create({
      data: {
        user_id: user.id,
        token: refresh_token,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    return {
      access_token,
      refresh_token,
      expires_in: 900,
      user: { id: user.id, username: user.username, email: user.email, role: user.role, ...profile },
    };
  }

  async resendVerification(dto: ResendVerificationInput) {
    const { email } = resendVerificationSchema.parse(dto);
    const cleanEmail = email.toLowerCase().trim();

    const user = await this.prisma.user.findFirst({
      where: { email: cleanEmail, deleted_at: null },
      include: { teacher: true },
    });

    if (!user) {
      return { message: 'Jika email terdaftar, tautan verifikasi telah dikirim.' };
    }

    if (user.email_verified_at) {
      throw new BadRequestException('Email sudah terverifikasi. Silakan masuk.');
    }

    // Invalidate previous tokens
    await this.prisma.verificationToken.deleteMany({
      where: { identifier: user.id, type: 'EMAIL_VERIFICATION' },
    });

    const rawToken = randomBytes(32).toString('hex');
    const tokenHash = createHash('sha256').update(rawToken).digest('hex');

    await this.prisma.verificationToken.create({
      data: {
        identifier: user.id,
        token_hash: tokenHash,
        type: 'EMAIL_VERIFICATION',
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    });

    await this.emailService.sendVerificationEmail(
      cleanEmail,
      user.teacher?.full_name || user.username,
      rawToken,
    );

    return { message: 'Tautan verifikasi baru telah dikirim ke email Anda.' };
  }

  async forgotPassword(dto: ForgotPasswordInput) {
    const { email } = forgotPasswordSchema.parse(dto);
    const cleanEmail = email.toLowerCase().trim();

    const user = await this.prisma.user.findFirst({
      where: { email: cleanEmail, deleted_at: null },
      include: { teacher: true, student: true },
    });

    // Anti-enumeration: return success message even if email not found
    if (!user || !user.is_active) {
      return { message: 'Jika email terdaftar, tautan atur ulang kata sandi telah dikirim.' };
    }

    // Invalidate previous reset tokens for this user
    await this.prisma.verificationToken.deleteMany({
      where: { identifier: user.id, type: 'PASSWORD_RESET' },
    });

    const rawToken = randomBytes(32).toString('hex');
    const tokenHash = createHash('sha256').update(rawToken).digest('hex');

    await this.prisma.verificationToken.create({
      data: {
        identifier: user.id,
        token_hash: tokenHash,
        type: 'PASSWORD_RESET',
        expires_at: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
      },
    });

    const displayName = user.teacher?.full_name || user.student?.full_name || user.username;

    await this.emailService.sendPasswordResetEmail(cleanEmail, displayName, rawToken);

    return { message: 'Jika email terdaftar, tautan atur ulang kata sandi telah dikirim.' };
  }

  async resetPassword(dto: ResetPasswordInput) {
    const { token, password } = resetPasswordSchema.parse(dto);
    const tokenHash = createHash('sha256').update(token.trim()).digest('hex');

    const verificationRecord = await this.prisma.verificationToken.findFirst({
      where: {
        token_hash: tokenHash,
        type: 'PASSWORD_RESET',
        expires_at: { gt: new Date() },
      },
    });

    if (!verificationRecord) {
      throw new BadRequestException('Tautan atur ulang kata sandi tidak valid atau sudah kedaluwarsa');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: verificationRecord.identifier },
    });

    if (!user || !user.is_active || user.deleted_at) {
      throw new BadRequestException('Pengguna tidak valid atau akun dinonaktifkan');
    }

    const new_hash = await argon2.hash(password);

    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: user.id },
        data: { password_hash: new_hash },
      });

      // Delete the used token
      await tx.verificationToken.delete({
        where: { id: verificationRecord.id },
      });

      // Invalidate all active refresh tokens for security
      await tx.refreshToken.deleteMany({
        where: { user_id: user.id },
      });
    });

    return { message: 'Kata sandi berhasil diatur ulang. Silakan masuk dengan kata sandi baru Anda.' };
  }
}
