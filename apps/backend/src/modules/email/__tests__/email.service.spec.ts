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
