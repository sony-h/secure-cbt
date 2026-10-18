import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly resend: Resend | null = null;
  private readonly fromEmail: string;
  private readonly appUrl: string;

  constructor(private readonly config: ConfigService) {
    const apiKey = this.config.get<string>('RESEND_API_KEY');
    if (apiKey && apiKey.trim()) {
      this.resend = new Resend(apiKey.trim());
      this.logger.log('📧 Resend email service initialized successfully');
    } else {
      this.logger.warn(
        '⚠️ RESEND_API_KEY not configured. Emails will be logged to console in dev mode.',
      );
    }

    this.fromEmail =
      this.config.get<string>('EMAIL_FROM') || 'Secure CBT <onboarding@resend.dev>';
    const rawUrl =
      this.config.get<string>('FRONTEND_URL') ||
      this.config.get<string>('DASHBOARD_URL') ||
      this.config.get<string>('CORS_ORIGIN') ||
      'http://localhost:3001';
    const primaryUrl = rawUrl.split(',')[0]?.trim().replace(/\/+$/, '');
    this.appUrl = primaryUrl || 'http://localhost:3001';
  }

  async sendVerificationEmail(to: string, name: string, token: string): Promise<boolean> {
    const verificationUrl = `${this.appUrl}/verify-email?token=${encodeURIComponent(token)}`;
    const subject = 'Verifikasi Alamat Email Anda - Secure CBT';

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #1e293b; }
    .container { max-width: 560px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); }
    .header { background: #0f172a; padding: 28px; text-align: center; color: #ffffff; }
    .header h1 { margin: 0; font-size: 22px; font-weight: 700; letter-spacing: -0.5px; }
    .header p { margin: 6px 0 0 0; color: #94a3b8; font-size: 13px; }
    .content { padding: 32px; }
    .greeting { font-size: 16px; font-weight: 600; margin-bottom: 12px; }
    .body-text { font-size: 14px; line-height: 1.6; color: #475569; margin-bottom: 24px; }
    .btn-container { text-align: center; margin: 32px 0; }
    .btn { display: inline-block; background-color: #2563eb; color: #ffffff !important; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-size: 14px; font-weight: 600; }
    .btn:hover { background-color: #1d4ed8; }
    .note { font-size: 12px; color: #64748b; line-height: 1.5; border-top: 1px solid #e2e8f0; padding-top: 20px; }
    .url-fallback { word-break: break-all; color: #2563eb; font-size: 12px; margin-top: 8px; }
    .footer { background: #f1f5f9; padding: 20px; text-align: center; font-size: 12px; color: #64748b; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Secure CBT</h1>
      <p>SMK Informatika Wonosobo</p>
    </div>
    <div class="content">
      <div class="greeting">Halo, ${name}!</div>
      <p class="body-text">
        Terima kasih telah mendaftar sebagai Guru pada platform Secure CBT. Silakan konfirmasi alamat email Anda untuk mengaktifkan akun dan mulai mengelola bank soal serta ujian.
      </p>
      <div class="btn-container">
        <a href="${verificationUrl}" class="btn">Verifikasi Email Saya</a>
      </div>
      <div class="note">
        Tautan verifikasi ini berlaku selama <strong>24 jam</strong>. Jika Anda tidak pernah mendaftar di Secure CBT, abaikan email ini.
        <div class="url-fallback">
          Atau salin tautan berikut ke browser:<br>
          ${verificationUrl}
        </div>
      </div>
    </div>
    <div class="footer">
      &copy; 2026 Secure CBT — SMK Informatika Wonosobo. All rights reserved.
    </div>
  </div>
</body>
</html>
    `.trim();

    if (this.resend) {
      try {
        const { data, error } = await this.resend.emails.send({
          from: this.fromEmail,
          to,
          subject,
          html,
        });
        if (error) {
          this.logger.error(`❌ Failed to send verification email to ${to}: ${error.message}`);
        } else {
          this.logger.log(`📧 Verification email sent to: ${to}${data?.id ? ` (id: ${data.id})` : ''}`);
          return true;
        }
      } catch (err: any) {
        this.logger.error(`❌ Failed to send verification email to ${to}: ${err.message}`);
      }
    }

    // Dev / Test console fallback
    this.logger.log('──────────────────────────────────────────────────────────');
    this.logger.log(`📬 [DEV EMAIL FALLBACK] Verification for: ${to}`);
    this.logger.log(`🔗 Verification URL: ${verificationUrl}`);
    this.logger.log('──────────────────────────────────────────────────────────');
    return true;
  }

  async sendTeacherInviteEmail(
    to: string,
    inviteToken: string,
    invitedByName?: string,
  ): Promise<boolean> {
    const inviteUrl = `${this.appUrl}/register?invite=${encodeURIComponent(inviteToken)}`;
    const subject = 'Undangan Bergabung sebagai Guru - Secure CBT';

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #1e293b; }
    .container { max-width: 560px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); }
    .header { background: #0f172a; padding: 28px; text-align: center; color: #ffffff; }
    .header h1 { margin: 0; font-size: 22px; font-weight: 700; letter-spacing: -0.5px; }
    .header p { margin: 6px 0 0 0; color: #94a3b8; font-size: 13px; }
    .content { padding: 32px; }
    .greeting { font-size: 16px; font-weight: 600; margin-bottom: 12px; }
    .body-text { font-size: 14px; line-height: 1.6; color: #475569; margin-bottom: 24px; }
    .btn-container { text-align: center; margin: 32px 0; }
    .btn { display: inline-block; background-color: #059669; color: #ffffff !important; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-size: 14px; font-weight: 600; }
    .btn:hover { background-color: #047857; }
    .note { font-size: 12px; color: #64748b; line-height: 1.5; border-top: 1px solid #e2e8f0; padding-top: 20px; }
    .url-fallback { word-break: break-all; color: #059669; font-size: 12px; margin-top: 8px; }
    .footer { background: #f1f5f9; padding: 20px; text-align: center; font-size: 12px; color: #64748b; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Secure CBT</h1>
      <p>SMK Informatika Wonosobo</p>
    </div>
    <div class="content">
      <div class="greeting">Undangan Bergabung</div>
      <p class="body-text">
        Anda telah diundang ${invitedByName ? `oleh <strong>${invitedByName}</strong> ` : ''}untuk bergabung sebagai Guru pada platform ujian <strong>Secure CBT SMK Informatika Wonosobo</strong>.
      </p>
      <p class="body-text">
        Silakan klik tombol di bawah ini untuk melengkapi data dan membuat kata sandi akun Anda.
      </p>
      <div class="btn-container">
        <a href="${inviteUrl}" class="btn">Terima Undangan & Buat Akun</a>
      </div>
      <div class="note">
        Undangan ini berlaku selama <strong>7 hari</strong>. Email Anda telah terverifikasi secara otomatis saat mendaftar melalui tautan ini.
        <div class="url-fallback">
          Atau salin tautan berikut ke browser:<br>
          ${inviteUrl}
        </div>
      </div>
    </div>
    <div class="footer">
      &copy; 2026 Secure CBT — SMK Informatika Wonosobo. All rights reserved.
    </div>
  </div>
</body>
</html>
    `.trim();

    if (this.resend) {
      try {
        const { data, error } = await this.resend.emails.send({
          from: this.fromEmail,
          to,
          subject,
          html,
        });
        if (error) {
          this.logger.error(`❌ Failed to send invite email to ${to}: ${error.message}`);
        } else {
          this.logger.log(`📧 Teacher invite email sent to: ${to}${data?.id ? ` (id: ${data.id})` : ''}`);
          return true;
        }
      } catch (err: any) {
        this.logger.error(`❌ Failed to send invite email to ${to}: ${err.message}`);
      }
    }

    // Dev / Test console fallback
    this.logger.log('──────────────────────────────────────────────────────────');
    this.logger.log(`📬 [DEV EMAIL FALLBACK] Teacher Invite for: ${to}`);
    this.logger.log(`🔗 Invite URL: ${inviteUrl}`);
    this.logger.log('──────────────────────────────────────────────────────────');
    return true;
  }

  async sendPasswordResetEmail(
    to: string,
    name: string,
    resetToken: string,
  ): Promise<boolean> {
    const resetUrl = `${this.appUrl}/reset-password?token=${encodeURIComponent(resetToken)}`;
    const subject = 'Atur Ulang Kata Sandi - Secure CBT';

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #1e293b; }
    .container { max-width: 560px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); }
    .header { background: #0f172a; padding: 28px; text-align: center; color: #ffffff; }
    .header h1 { margin: 0; font-size: 22px; font-weight: 700; letter-spacing: -0.5px; }
    .header p { margin: 6px 0 0 0; color: #94a3b8; font-size: 13px; }
    .content { padding: 32px; }
    .greeting { font-size: 16px; font-weight: 600; margin-bottom: 12px; }
    .body-text { font-size: 14px; line-height: 1.6; color: #475569; margin-bottom: 24px; }
    .btn-container { text-align: center; margin: 32px 0; }
    .btn { display: inline-block; background-color: #2563eb; color: #ffffff !important; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-size: 14px; font-weight: 600; }
    .btn:hover { background-color: #1d4ed8; }
    .note { font-size: 12px; color: #64748b; line-height: 1.5; border-top: 1px solid #e2e8f0; padding-top: 20px; }
    .url-fallback { word-break: break-all; color: #2563eb; font-size: 12px; margin-top: 8px; }
    .footer { background: #f1f5f9; padding: 20px; text-align: center; font-size: 12px; color: #64748b; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Secure CBT</h1>
      <p>SMK Informatika Wonosobo</p>
    </div>
    <div class="content">
      <div class="greeting">Halo, ${name}!</div>
      <p class="body-text">
        Kami menerima permintaan untuk mengatur ulang kata sandi akun Secure CBT Anda. Silakan klik tombol di bawah ini untuk membuat kata sandi baru.
      </p>
      <div class="btn-container">
        <a href="${resetUrl}" class="btn">Atur Ulang Kata Sandi</a>
      </div>
      <div class="note">
        Tautan reset kata sandi ini berlaku selama <strong>1 jam</strong>. Jika Anda tidak pernah meminta pengaturan ulang kata sandi, akun Anda tetap aman dan Anda dapat mengabaikan email ini.
        <div class="url-fallback">
          Atau salin tautan berikut ke browser:<br>
          ${resetUrl}
        </div>
      </div>
    </div>
    <div class="footer">
      &copy; 2026 Secure CBT — SMK Informatika Wonosobo. All rights reserved.
    </div>
  </div>
</body>
</html>
    `.trim();

    if (this.resend) {
      try {
        const { data, error } = await this.resend.emails.send({
          from: this.fromEmail,
          to,
          subject,
          html,
        });
        if (error) {
          this.logger.error(`❌ Failed to send password reset email to ${to}: ${error.message}`);
        } else {
          this.logger.log(`📧 Password reset email sent to: ${to}${data?.id ? ` (id: ${data.id})` : ''}`);
          return true;
        }
      } catch (err: any) {
        this.logger.error(`❌ Failed to send password reset email to ${to}: ${err.message}`);
      }
    }

    // Dev / Test console fallback
    this.logger.log('──────────────────────────────────────────────────────────');
    this.logger.log(`📬 [DEV EMAIL FALLBACK] Password Reset for: ${to}`);
    this.logger.log(`🔗 Reset URL: ${resetUrl}`);
    this.logger.log('──────────────────────────────────────────────────────────');
    return true;
  }
}
