import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EmailService } from '../email.service';

const mockSend = vi.fn();

vi.mock('resend', () => ({
  Resend: vi.fn().mockImplementation(() => ({
    emails: {
      send: mockSend,
    },
  })),
}));

describe('EmailService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('configuration & url parsing', () => {
    it('initializes without Resend if RESEND_API_KEY is not set', async () => {
      const mockConfig: any = {
        get: vi.fn((key: string) => {
          if (key === 'RESEND_API_KEY') return '';
          if (key === 'FRONTEND_URL') return 'http://localhost:3001';
          return null;
        }),
      };

      const service = new EmailService(mockConfig);
      const result = await service.sendVerificationEmail('guru@test.id', 'Budi', 'token123');

      expect(result).toBe(true);
      expect(mockSend).not.toHaveBeenCalled();
    });

    it('defaults fromEmail to Assessia <onboarding@resend.dev> if EMAIL_FROM not provided', async () => {
      const mockConfig: any = {
        get: vi.fn((key: string) => {
          if (key === 'RESEND_API_KEY') return 're_test_key';
          if (key === 'FRONTEND_URL') return 'https://cbt.domain.com';
          return null;
        }),
      };

      mockSend.mockResolvedValueOnce({
        data: { id: 'msg_default_from' },
        error: null,
      });

      const service = new EmailService(mockConfig);
      await service.sendVerificationEmail('guru@test.id', 'Budi', 'token123');

      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          from: 'Assessia <onboarding@resend.dev>',
        }),
      );
    });

    it('sanitizes appUrl if CORS_ORIGIN contains multiple comma-separated domains', async () => {
      const mockConfig: any = {
        get: vi.fn((key: string) => {
          if (key === 'RESEND_API_KEY') return 're_test_key';
          if (key === 'CORS_ORIGIN') return 'https://cbt.domain.com,https://api.domain.com';
          return null;
        }),
      };

      mockSend.mockResolvedValueOnce({
        data: { id: 'msg_1' },
        error: null,
      });

      const service = new EmailService(mockConfig);
      await service.sendVerificationEmail('guru@test.id', 'Budi', 'token123');

      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          html: expect.stringContaining('https://cbt.domain.com/verify-email?token=token123'),
        }),
      );
      expect(mockSend).not.toHaveBeenCalledWith(
        expect.objectContaining({
          html: expect.stringContaining('https://cbt.domain.com,https://api.domain.com'),
        }),
      );
    });
  });

  describe('Assessia branding and template integrity', () => {
    it('sends verification email with Assessia branding, motto, and Orivastra footer', async () => {
      const mockConfig: any = {
        get: vi.fn((key: string) => {
          if (key === 'RESEND_API_KEY') return 're_test_key';
          if (key === 'FRONTEND_URL') return 'https://assessia.orivastra.id';
          return null;
        }),
      };

      mockSend.mockResolvedValueOnce({
        data: { id: 'msg_verify' },
        error: null,
      });

      const service = new EmailService(mockConfig);
      await service.sendVerificationEmail('guru@sekolah.id', 'Dr. Sarah', 'token_v_1');

      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          subject: 'Verifikasi Alamat Email Anda - Assessia',
          to: 'guru@sekolah.id',
          html: expect.stringMatching(/Assessia/i),
        }),
      );

      const html = mockSend.mock.calls[0][0].html;
      expect(html).toContain('by Orivastra');
      expect(html).toContain('Measure Learning. Empower Progress.');
      expect(html).toContain('From Origin to the Stars.');
      expect(html).toContain('2026 Assessia — Orivastra');
      expect(html).toContain('Dr. Sarah');
      expect(html).toContain('https://assessia.orivastra.id/verify-email?token=token_v_1');

      // Ensure deprecated branding is completely removed
      expect(html).not.toContain('Secure CBT');
      expect(html).not.toContain('SMK Informatika Wonosobo');
    });

    it('sends teacher invite email with Assessia branding and inviter attribution', async () => {
      const mockConfig: any = {
        get: vi.fn((key: string) => {
          if (key === 'RESEND_API_KEY') return 're_test_key';
          if (key === 'FRONTEND_URL') return 'https://assessia.orivastra.id';
          return null;
        }),
      };

      mockSend.mockResolvedValueOnce({
        data: { id: 'msg_invite' },
        error: null,
      });

      const service = new EmailService(mockConfig);
      await service.sendTeacherInviteEmail('calonguru@sekolah.id', 'token_inv_1', 'Bpk. Hendra');

      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          subject: 'Undangan Bergabung sebagai Guru - Assessia',
          to: 'calonguru@sekolah.id',
        }),
      );

      const html = mockSend.mock.calls[0][0].html;
      expect(html).toContain('by Orivastra');
      expect(html).toContain('Measure Learning. Empower Progress.');
      expect(html).toContain('2026 Assessia — Orivastra');
      expect(html).toContain('Bpk. Hendra');
      expect(html).toContain('https://assessia.orivastra.id/register?invite=token_inv_1');

      // Ensure deprecated branding is completely removed
      expect(html).not.toContain('Secure CBT');
      expect(html).not.toContain('SMK Informatika Wonosobo');
    });

    it('sends password reset email with Assessia branding and security notice', async () => {
      const mockConfig: any = {
        get: vi.fn((key: string) => {
          if (key === 'RESEND_API_KEY') return 're_test_key';
          if (key === 'FRONTEND_URL') return 'https://assessia.orivastra.id';
          return null;
        }),
      };

      mockSend.mockResolvedValueOnce({
        data: { id: 'msg_reset' },
        error: null,
      });

      const service = new EmailService(mockConfig);
      await service.sendPasswordResetEmail('guru@sekolah.id', 'Budi Santoso', 'token_pwd_1');

      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          subject: 'Atur Ulang Kata Sandi - Assessia',
          to: 'guru@sekolah.id',
        }),
      );

      const html = mockSend.mock.calls[0][0].html;
      expect(html).toContain('by Orivastra');
      expect(html).toContain('Measure Learning. Empower Progress.');
      expect(html).toContain('2026 Assessia — Orivastra');
      expect(html).toContain('Budi Santoso');
      expect(html).toContain('https://assessia.orivastra.id/reset-password?token=token_pwd_1');

      // Ensure deprecated branding is completely removed
      expect(html).not.toContain('Secure CBT');
      expect(html).not.toContain('SMK Informatika Wonosobo');
    });
  });

  describe('error handling on Resend SDK response', () => {
    it('detects Resend API error response when error object is returned without throwing', async () => {
      const mockConfig: any = {
        get: vi.fn((key: string) => {
          if (key === 'RESEND_API_KEY') return 're_test_key';
          if (key === 'FRONTEND_URL') return 'http://localhost:3001';
          return null;
        }),
      };

      // Resend SDK does NOT throw error, it returns { data: null, error: { message: ... } }
      mockSend.mockResolvedValueOnce({
        data: null,
        error: {
          name: 'validation_error',
          statusCode: 422,
          message: 'You can only send testing emails to your own email address.',
        },
      });

      const service = new EmailService(mockConfig);
      const loggerSpy = vi.spyOn((service as any).logger, 'error');

      const result = await service.sendVerificationEmail('other@domain.id', 'Guru Lain', 'tok456');

      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining('You can only send testing emails to your own email address'),
      );
      expect(result).toBe(true); // Should fallback gracefully to console log
    });

    it('detects Resend error on sendTeacherInviteEmail and logs error', async () => {
      const mockConfig: any = {
        get: vi.fn((key: string) => {
          if (key === 'RESEND_API_KEY') return 're_test_key';
          if (key === 'FRONTEND_URL') return 'http://localhost:3001';
          return null;
        }),
      };

      mockSend.mockResolvedValueOnce({
        data: null,
        error: { message: 'Invalid API key' },
      });

      const service = new EmailService(mockConfig);
      const loggerSpy = vi.spyOn((service as any).logger, 'error');

      await service.sendTeacherInviteEmail('invitee@test.id', 'inv-token', 'Admin');

      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining('Invalid API key'),
      );
    });

    it('detects Resend error on sendPasswordResetEmail and logs error', async () => {
      const mockConfig: any = {
        get: vi.fn((key: string) => {
          if (key === 'RESEND_API_KEY') return 're_test_key';
          if (key === 'FRONTEND_URL') return 'http://localhost:3001';
          return null;
        }),
      };

      mockSend.mockResolvedValueOnce({
        data: null,
        error: { message: 'Rate limit exceeded' },
      });

      const service = new EmailService(mockConfig);
      const loggerSpy = vi.spyOn((service as any).logger, 'error');

      await service.sendPasswordResetEmail('user@test.id', 'User', 'reset-token');

      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining('Rate limit exceeded'),
      );
    });
  });
});
