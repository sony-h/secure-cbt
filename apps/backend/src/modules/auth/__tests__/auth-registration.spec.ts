import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AuthService } from '../auth.service';
import { BadRequestException } from '@nestjs/common';
import * as argon2 from 'argon2';
import { createHash } from 'node:crypto';

describe('AuthService - Teacher Registration & Verification', () => {
  let authService: AuthService;
  let mockPrisma: any;
  let mockJwtService: any;
  let mockConfigService: any;
  let mockEmailService: any;

  beforeEach(() => {
    mockPrisma = {
      user: {
        findFirst: vi.fn(),
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
      },
      teacher: {
        findFirst: vi.fn(),
        findUnique: vi.fn(),
        create: vi.fn(),
      },
      teacherInvite: {
        findFirst: vi.fn(),
        update: vi.fn(),
        deleteMany: vi.fn(),
        create: vi.fn(),
      },
      verificationToken: {
        findFirst: vi.fn(),
        create: vi.fn(),
        delete: vi.fn(),
        deleteMany: vi.fn(),
      },
      refreshToken: {
        create: vi.fn(),
        deleteMany: vi.fn(),
      },
      teacherSubject: {
        create: vi.fn(),
      },
      $transaction: vi.fn((arg) => (typeof arg === 'function' ? arg(mockPrisma) : Promise.all(arg))),
    };

    mockJwtService = {
      sign: vi.fn().mockReturnValue('mock-jwt-token'),
    };

    mockConfigService = {
      get: vi.fn((key: string) => {
        if (key === 'TURNSTILE_SECRET_KEY') return ''; // dev bypass
        return null;
      }),
    };

    mockEmailService = {
      sendVerificationEmail: vi.fn().mockResolvedValue(true),
      sendTeacherInviteEmail: vi.fn().mockResolvedValue(true),
      sendPasswordResetEmail: vi.fn().mockResolvedValue(true),
    };

    authService = new AuthService(
      mockPrisma,
      mockJwtService,
      mockConfigService,
      mockEmailService,
    );
  });

  describe('registerTeacher', () => {
    it('successfully registers teacher and dispatches verification email', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(null);
      mockPrisma.teacher.findFirst.mockResolvedValue(null);
      mockPrisma.user.create.mockResolvedValue({ id: 'user-123', email: 'guru@test.id' });
      mockPrisma.teacher.create.mockResolvedValue({ id: 'teacher-123' });
      mockPrisma.verificationToken.create.mockResolvedValue({ id: 'token-123' });

      const res = await authService.registerTeacher({
        full_name: 'Budi Santoso',
        email: 'guru@test.id',
        password: 'password123',
        nip: '198501012010011001',
      });

      expect(res.is_verified).toBe(false);
      expect(mockEmailService.sendVerificationEmail).toHaveBeenCalledWith(
        'guru@test.id',
        'Budi Santoso',
        expect.any(String),
      );
      expect(mockPrisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            email: 'guru@test.id',
            role: 'TEACHER',
            email_verified_at: null,
          }),
        }),
      );
    });

    it('rejects registration if email already exists', async () => {
      mockPrisma.user.findFirst.mockResolvedValue({ id: 'existing-id' });

      await expect(
        authService.registerTeacher({
          full_name: 'Budi Santoso',
          email: 'duplicate@test.id',
          password: 'password123',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('allows re-registration if email belonged to a soft-deleted user', async () => {
      mockPrisma.user.findFirst
        .mockResolvedValueOnce({
          id: 'old-deleted-user',
          email: 'reused@test.id',
          username: 'guru_old',
          deleted_at: new Date(),
        })
        .mockResolvedValueOnce(null); // username check

      mockPrisma.user.create.mockResolvedValue({ id: 'new-user', email: 'reused@test.id' });
      mockPrisma.teacher.create.mockResolvedValue({ id: 'new-teacher' });
      mockPrisma.verificationToken.create.mockResolvedValue({ id: 'token-new' });

      const res = await authService.registerTeacher({
        full_name: 'Guru Baru',
        email: 'reused@test.id',
        password: 'password123',
      });

      expect(res.is_verified).toBe(false);
      expect(mockPrisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'old-deleted-user' },
          data: expect.objectContaining({
            email: expect.stringContaining('reused@test.id.deleted_'),
          }),
        }),
      );
      expect(mockPrisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            email: 'reused@test.id',
          }),
        }),
      );
    });

    it('registers and immediately verifies teacher when registering with valid invite token', async () => {
      const inviteToken = 'sample-invite-token';
      const inviteHash = createHash('sha256').update(inviteToken).digest('hex');

      mockPrisma.user.findFirst.mockResolvedValue(null);
      mockPrisma.teacherInvite.findFirst.mockResolvedValue({
        id: 'invite-1',
        email: 'invited@test.id',
        token_hash: inviteHash,
        subject_ids: ['subj-uuid-1'],
        expires_at: new Date(Date.now() + 100000),
        accepted_at: null,
      });
      mockPrisma.user.create.mockResolvedValue({ id: 'user-1' });
      mockPrisma.teacher.create.mockResolvedValue({ id: 'teacher-1' });

      const res = await authService.registerTeacher({
        full_name: 'Guru Diundang',
        email: 'invited@test.id',
        password: 'password123',
        invite_token: inviteToken,
      });

      expect(res.is_verified).toBe(true);
      expect(mockEmailService.sendVerificationEmail).not.toHaveBeenCalled();
      expect(mockPrisma.teacherSubject.create).toHaveBeenCalledWith({
        data: { teacher_id: 'teacher-1', subject_id: 'subj-uuid-1' },
      });
      expect(mockPrisma.teacherInvite.update).toHaveBeenCalledWith({
        where: { id: 'invite-1' },
        data: { accepted_at: expect.any(Date) },
      });
    });
  });

  describe('verifyEmail', () => {
    it('verifies email, clears token, and returns auth session', async () => {
      const token = 'my-verification-token';
      const tokenHash = createHash('sha256').update(token).digest('hex');

      mockPrisma.verificationToken.findFirst.mockResolvedValue({
        id: 'vtoken-1',
        identifier: 'user-99',
        token_hash: tokenHash,
        type: 'EMAIL_VERIFICATION',
        expires_at: new Date(Date.now() + 50000),
      });

      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-99',
        username: 'guru_budi',
        role: 'TEACHER',
      });
      mockPrisma.teacher.findUnique.mockResolvedValue({
        full_name: 'Budi Santoso',
      });

      const res = await authService.verifyEmail({ token });

      expect(res.access_token).toBe('mock-jwt-token');
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-99' },
        data: { email_verified_at: expect.any(Date) },
      });
      expect(mockPrisma.verificationToken.delete).toHaveBeenCalledWith({
        where: { id: 'vtoken-1' },
      });
    });

    it('rejects invalid or expired token', async () => {
      mockPrisma.verificationToken.findFirst.mockResolvedValue(null);

      await expect(
        authService.verifyEmail({ token: 'invalid-token' }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('login verification check', () => {
    it('blocks teacher login if email is not verified', async () => {
      mockPrisma.user.findFirst.mockResolvedValue({
        id: 'u-1',
        username: 'unverified_teacher',
        email: 'unverified@test.id',
        role: 'TEACHER',
        is_active: true,
        email_verified_at: null,
      });

      await expect(
        authService.login({
          username: 'unverified@test.id',
          password: 'password123',
        }),
      ).rejects.toThrow('Email Anda belum diverifikasi');
    });

    it('allows teacher login if email is verified', async () => {
      const hash = await argon2.hash('password123');
      mockPrisma.user.findFirst.mockResolvedValue({
        id: 'u-2',
        username: 'verified_teacher',
        email: 'verified@test.id',
        password_hash: hash,
        role: 'TEACHER',
        is_active: true,
        email_verified_at: new Date(),
      });
      mockPrisma.teacher.findUnique.mockResolvedValue({ full_name: 'Guru Terverifikasi' });
      mockPrisma.refreshToken.create.mockResolvedValue({});

      const res = await authService.login({
        username: 'verified@test.id',
        password: 'password123',
      });

      expect(res.access_token).toBe('mock-jwt-token');
      expect(res.user.email).toBe('verified@test.id');
    });
  });

  describe('resendVerification', () => {
    it('re-generates token and resends verification email', async () => {
      mockPrisma.user.findFirst.mockResolvedValue({
        id: 'u-3',
        username: 'guru_resend',
        email: 'resend@test.id',
        role: 'TEACHER',
        email_verified_at: null,
        teacher: { full_name: 'Guru Resend' },
      });

      const res = await authService.resendVerification({ email: 'resend@test.id' });

      expect(res.message).toContain('dikirim');
      expect(mockPrisma.verificationToken.deleteMany).toHaveBeenCalledWith({
        where: { identifier: 'u-3', type: 'EMAIL_VERIFICATION' },
      });
      expect(mockEmailService.sendVerificationEmail).toHaveBeenCalledWith(
        'resend@test.id',
        'Guru Resend',
        expect.any(String),
      );
    });
  });

  describe('forgotPassword & resetPassword', () => {
    it('dispatches password reset email when user exists', async () => {
      mockPrisma.user.findFirst.mockResolvedValue({
        id: 'u-4',
        username: 'guru_forgot',
        email: 'forgot@test.id',
        is_active: true,
        teacher: { full_name: 'Guru Lupa' },
      });

      const res = await authService.forgotPassword({ email: 'forgot@test.id' });

      expect(res.message).toContain('dikirim');
      expect(mockPrisma.verificationToken.deleteMany).toHaveBeenCalledWith({
        where: { identifier: 'u-4', type: 'PASSWORD_RESET' },
      });
      expect(mockPrisma.verificationToken.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            identifier: 'u-4',
            type: 'PASSWORD_RESET',
          }),
        }),
      );
      expect(mockEmailService.sendPasswordResetEmail).toHaveBeenCalledWith(
        'forgot@test.id',
        'Guru Lupa',
        expect.any(String),
      );
    });

    it('returns generic message without sending email if user not found', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(null);

      const res = await authService.forgotPassword({ email: 'notfound@test.id' });

      expect(res.message).toContain('dikirim');
      expect(mockEmailService.sendPasswordResetEmail).not.toHaveBeenCalled();
    });

    it('resets password, deletes token, and invalidates sessions', async () => {
      const resetToken = 'secret-reset-token';
      const tokenHash = createHash('sha256').update(resetToken).digest('hex');

      mockPrisma.verificationToken.findFirst.mockResolvedValue({
        id: 'token-rec-1',
        identifier: 'u-4',
        token_hash: tokenHash,
        type: 'PASSWORD_RESET',
        expires_at: new Date(Date.now() + 100000),
      });

      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'u-4',
        username: 'guru_forgot',
        is_active: true,
        deleted_at: null,
      });

      const res = await authService.resetPassword({
        token: resetToken,
        password: 'newPassword123',
      });

      expect(res.message).toContain('berhasil');
      expect(mockPrisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'u-4' },
          data: expect.objectContaining({
            password_hash: expect.any(String),
          }),
        }),
      );
      expect(mockPrisma.verificationToken.delete).toHaveBeenCalledWith({
        where: { id: 'token-rec-1' },
      });
      expect(mockPrisma.refreshToken.deleteMany).toHaveBeenCalledWith({
        where: { user_id: 'u-4' },
      });
    });

    it('rejects invalid or expired reset token', async () => {
      mockPrisma.verificationToken.findFirst.mockResolvedValue(null);

      await expect(
        authService.resetPassword({
          token: 'expired-or-invalid',
          password: 'newPassword123',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
