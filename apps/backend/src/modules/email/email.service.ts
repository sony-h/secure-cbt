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
      this.config.get<string>('EMAIL_FROM') || 'Assessia <onboarding@resend.dev>';
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
    const subject = 'Verifikasi Alamat Email Anda - Assessia';

    const html = `
<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
  <style>
    body { margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; color: #1e293b; }
    .wrapper { width: 100%; background-color: #f1f5f9; padding: 36px 12px; box-sizing: border-box; }
    .container { max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 30px -5px rgba(15, 23, 42, 0.08), 0 0 1px 1px rgba(15, 23, 42, 0.04); border: 1px solid #e2e8f0; }
    .ribbon { height: 6px; background: linear-gradient(90deg, #7C3AED 0%, #2563EB 50%, #06B6D4 100%); }
    .header { padding: 36px 32px 20px 32px; text-align: center; background: #ffffff; }
    .content { padding: 0 36px 36px 36px; }
    .badge { display: inline-block; background: #f5f3ff; border: 1px solid #ddd6fe; border-radius: 9999px; padding: 5px 14px; font-size: 11px; font-weight: 700; color: #6d28d9; letter-spacing: 0.5px; text-transform: uppercase; margin-bottom: 18px; }
    .btn { display: inline-block; background: linear-gradient(135deg, #7C3AED 0%, #2563EB 60%, #06B6D4 100%); color: #ffffff !important; text-decoration: none; padding: 13px 36px; border-radius: 10px; font-size: 14.5px; font-weight: 700; box-shadow: 0 4px 14px rgba(37, 99, 235, 0.35); }
    .footer { background: #f8fafc; border-top: 1px solid #f1f5f9; padding: 24px 32px; text-align: center; }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b;">
  <div class="wrapper" style="width: 100%; background-color: #f1f5f9; padding: 36px 12px; box-sizing: border-box;">
    <div class="container" style="max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 30px -5px rgba(15, 23, 42, 0.08); border: 1px solid #e2e8f0;">
      <!-- Aurora Gradient Ribbon -->
      <div class="ribbon" style="height: 6px; background: linear-gradient(90deg, #7C3AED 0%, #2563EB 50%, #06B6D4 100%);"></div>

      <!-- Header -->
      <div class="header" style="padding: 36px 32px 20px 32px; text-align: center; background: #ffffff;">
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" style="margin: 0 auto;">
          <tr>
            <td style="vertical-align: middle; padding-right: 12px;">
              <img src="${this.appUrl}/logo-only-light.png" alt="Assessia" width="44" height="44" style="display: block; border: 0; outline: none; object-fit: contain;" />
            </td>
            <td style="vertical-align: middle; text-align: left;">
              <div style="font-size: 26px; font-weight: 900; letter-spacing: -0.5px; color: #0b132b; line-height: 1;">Assessia</div>
              <div style="font-size: 11px; font-weight: 600; color: #6366f1; letter-spacing: 0.5px; text-transform: uppercase; margin-top: 3px;">by Orivastra</div>
            </td>
          </tr>
        </table>
        <div style="font-size: 12px; font-style: italic; color: #64748b; margin-top: 10px;">
          &ldquo;Measure Learning. Empower Progress.&rdquo;
        </div>
        <div style="height: 1px; background: #f1f5f9; margin-top: 20px;"></div>
      </div>

      <!-- Main Content -->
      <div class="content" style="padding: 0 36px 36px 36px;">
        <div class="badge" style="display: inline-block; background: #f5f3ff; border: 1px solid #ddd6fe; border-radius: 9999px; padding: 5px 14px; font-size: 11px; font-weight: 700; color: #6d28d9; letter-spacing: 0.5px; text-transform: uppercase; margin-bottom: 18px;">
          <span style="display: inline-block; width: 6px; height: 6px; border-radius: 50%; background: #7C3AED; margin-right: 6px; vertical-align: middle;"></span>Aktivasi Akun Pendidik
        </div>

        <h1 style="margin: 0 0 12px 0; font-size: 22px; font-weight: 800; color: #0f172a; letter-spacing: -0.02em;">
          Selamat Datang, ${name}! 👋
        </h1>

        <p style="margin: 0 0 16px 0; font-size: 14.5px; line-height: 1.65; color: #475569;">
          Terima kasih telah mendaftar di <strong>Assessia</strong>. Silakan konfirmasi alamat email Anda untuk mengaktifkan akun dan mulai menyusun bank soal, ujian, serta analitik penilaian digital.
        </p>

        <!-- CTA Box -->
        <div style="background: #fafafa; border: 1px solid #f1f5f9; border-radius: 12px; padding: 24px; text-align: center; margin: 28px 0;">
          <div style="font-size: 13px; color: #64748b; margin-bottom: 16px; font-weight: 500;">
            Konfirmasi alamat email Anda dengan menekan tombol di bawah:
          </div>
          <a href="${verificationUrl}" class="btn" style="display: inline-block; background: linear-gradient(135deg, #7C3AED 0%, #2563EB 60%, #06B6D4 100%); color: #ffffff !important; text-decoration: none; padding: 13px 36px; border-radius: 10px; font-size: 14.5px; font-weight: 700; box-shadow: 0 4px 14px rgba(37, 99, 235, 0.35);">
            Verifikasi Email Saya &rarr;
          </a>
          <div style="font-size: 11.5px; color: #94a3b8; margin-top: 14px;">
            ⏱ Tautan ini berlaku selama <strong>24 jam</strong>
          </div>
        </div>

        <!-- Security / Fallback -->
        <div style="background: #f8fafc; border-left: 3px solid #6366f1; border-radius: 0 8px 8px 0; padding: 14px 18px; margin-top: 24px;">
          <div style="font-size: 12px; color: #475569; line-height: 1.6;">
            <strong>Catatan Keamanan:</strong> Jika tombol di atas tidak dapat diklik, salin dan buka tautan berikut pada peramban Anda:
            <div style="margin-top: 6px; font-family: ui-monospace, Menlo, Monaco, Consolas, monospace; font-size: 11px; color: #2563EB; word-break: break-all; background: #ffffff; padding: 8px 10px; border-radius: 6px; border: 1px solid #e2e8f0;">
              ${verificationUrl}
            </div>
          </div>
        </div>
      </div>

      <!-- Footer -->
      <div class="footer" style="background: #f8fafc; border-top: 1px solid #f1f5f9; padding: 24px 32px; text-align: center;">
        <div style="font-size: 12.5px; font-weight: 800; color: #1e293b; letter-spacing: 0.06em; text-transform: uppercase;">
          ASSESSIA
        </div>
        <div style="font-size: 11.5px; font-style: italic; color: #64748b; margin-top: 2px;">
          &ldquo;Measure Learning. Empower Progress.&rdquo;
        </div>
        <div style="height: 1px; width: 60px; background: #e2e8f0; margin: 12px auto;"></div>
        <div style="font-size: 11px; color: #94a3b8; line-height: 1.6;">
          Dikembangkan oleh <strong>Orivastra</strong> &bull; <em>&ldquo;From Origin to the Stars.&rdquo;</em><br>
          &copy; 2026 Assessia — Orivastra. Seluruh hak cipta dilindungi undang-undang.
        </div>
      </div>
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
    const subject = 'Undangan Bergabung sebagai Guru - Assessia';

    const html = `
<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
  <style>
    body { margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; color: #1e293b; }
    .wrapper { width: 100%; background-color: #f1f5f9; padding: 36px 12px; box-sizing: border-box; }
    .container { max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 30px -5px rgba(15, 23, 42, 0.08), 0 0 1px 1px rgba(15, 23, 42, 0.04); border: 1px solid #e2e8f0; }
    .ribbon { height: 6px; background: linear-gradient(90deg, #06B6D4 0%, #2563EB 50%, #7C3AED 100%); }
    .header { padding: 36px 32px 20px 32px; text-align: center; background: #ffffff; }
    .content { padding: 0 36px 36px 36px; }
    .badge { display: inline-block; background: #ecfeff; border: 1px solid #a5f3fc; border-radius: 9999px; padding: 5px 14px; font-size: 11px; font-weight: 700; color: #0891b2; letter-spacing: 0.5px; text-transform: uppercase; margin-bottom: 18px; }
    .btn { display: inline-block; background: linear-gradient(135deg, #0284c7 0%, #2563EB 60%, #7C3AED 100%); color: #ffffff !important; text-decoration: none; padding: 13px 36px; border-radius: 10px; font-size: 14.5px; font-weight: 700; box-shadow: 0 4px 14px rgba(2, 132, 199, 0.35); }
    .footer { background: #f8fafc; border-top: 1px solid #f1f5f9; padding: 24px 32px; text-align: center; }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b;">
  <div class="wrapper" style="width: 100%; background-color: #f1f5f9; padding: 36px 12px; box-sizing: border-box;">
    <div class="container" style="max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 30px -5px rgba(15, 23, 42, 0.08); border: 1px solid #e2e8f0;">
      <!-- Aurora Gradient Ribbon -->
      <div class="ribbon" style="height: 6px; background: linear-gradient(90deg, #06B6D4 0%, #2563EB 50%, #7C3AED 100%);"></div>

      <!-- Header -->
      <div class="header" style="padding: 36px 32px 20px 32px; text-align: center; background: #ffffff;">
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" style="margin: 0 auto;">
          <tr>
            <td style="vertical-align: middle; padding-right: 12px;">
              <img src="${this.appUrl}/logo-only-light.png" alt="Assessia" width="44" height="44" style="display: block; border: 0; outline: none; object-fit: contain;" />
            </td>
            <td style="vertical-align: middle; text-align: left;">
              <div style="font-size: 26px; font-weight: 900; letter-spacing: -0.5px; color: #0b132b; line-height: 1;">Assessia</div>
              <div style="font-size: 11px; font-weight: 600; color: #0891b2; letter-spacing: 0.5px; text-transform: uppercase; margin-top: 3px;">by Orivastra</div>
            </td>
          </tr>
        </table>
        <div style="font-size: 12px; font-style: italic; color: #64748b; margin-top: 10px;">
          &ldquo;Measure Learning. Empower Progress.&rdquo;
        </div>
        <div style="height: 1px; background: #f1f5f9; margin-top: 20px;"></div>
      </div>

      <!-- Main Content -->
      <div class="content" style="padding: 0 36px 36px 36px;">
        <div class="badge" style="display: inline-block; background: #ecfeff; border: 1px solid #a5f3fc; border-radius: 9999px; padding: 5px 14px; font-size: 11px; font-weight: 700; color: #0891b2; letter-spacing: 0.5px; text-transform: uppercase; margin-bottom: 18px;">
          <span style="display: inline-block; width: 6px; height: 6px; border-radius: 50%; background: #06B6D4; margin-right: 6px; vertical-align: middle;"></span>Undangan Kolaborasi Pengajar
        </div>

        <h1 style="margin: 0 0 12px 0; font-size: 22px; font-weight: 800; color: #0f172a; letter-spacing: -0.02em;">
          Undangan Bergabung sebagai Guru ✨
        </h1>

        <p style="margin: 0 0 16px 0; font-size: 14.5px; line-height: 1.65; color: #475569;">
          Anda telah diundang ${invitedByName ? `oleh <strong>${invitedByName}</strong> ` : ''}untuk bergabung sebagai Guru pada platform penilaian modern <strong>Assessia</strong>.
        </p>

        <p style="margin: 0 0 20px 0; font-size: 14.5px; line-height: 1.65; color: #475569;">
          Silakan klik tautan di bawah ini untuk menerima undangan, melengkapi profil pendidik, dan membuat kata sandi akun Anda.
        </p>

        <!-- CTA Box -->
        <div style="background: #fafafa; border: 1px solid #f1f5f9; border-radius: 12px; padding: 24px; text-align: center; margin: 24px 0;">
          <div style="font-size: 13px; color: #64748b; margin-bottom: 16px; font-weight: 500;">
            Tekan tautan di bawah untuk menerima undangan dan membuat kata sandi Anda:
          </div>
          <a href="${inviteUrl}" class="btn" style="display: inline-block; background: linear-gradient(135deg, #0284c7 0%, #2563EB 60%, #7C3AED 100%); color: #ffffff !important; text-decoration: none; padding: 13px 36px; border-radius: 10px; font-size: 14.5px; font-weight: 700; box-shadow: 0 4px 14px rgba(2, 132, 199, 0.35);">
            Terima Undangan &amp; Aktivasi Akun &rarr;
          </a>
          <div style="font-size: 11.5px; color: #94a3b8; margin-top: 14px;">
            ⏱ Undangan ini berlaku selama <strong>7 hari</strong>
          </div>
        </div>

        <!-- Security / Fallback -->
        <div style="background: #f8fafc; border-left: 3px solid #06b6d4; border-radius: 0 8px 8px 0; padding: 14px 18px; margin-top: 24px;">
          <div style="font-size: 12px; color: #475569; line-height: 1.6;">
            <strong>Tautan Alternatif:</strong> Jika Anda mengalami kendala saat menekan tombol, salin dan buka tautan peramban berikut:
            <div style="margin-top: 6px; font-family: ui-monospace, Menlo, Monaco, Consolas, monospace; font-size: 11px; color: #0284c7; word-break: break-all; background: #ffffff; padding: 8px 10px; border-radius: 6px; border: 1px solid #e2e8f0;">
              ${inviteUrl}
            </div>
          </div>
        </div>
      </div>

      <!-- Footer -->
      <div class="footer" style="background: #f8fafc; border-top: 1px solid #f1f5f9; padding: 24px 32px; text-align: center;">
        <div style="font-size: 12.5px; font-weight: 800; color: #1e293b; letter-spacing: 0.06em; text-transform: uppercase;">
          ASSESSIA
        </div>
        <div style="font-size: 11.5px; font-style: italic; color: #64748b; margin-top: 2px;">
          &ldquo;Measure Learning. Empower Progress.&rdquo;
        </div>
        <div style="height: 1px; width: 60px; background: #e2e8f0; margin: 12px auto;"></div>
        <div style="font-size: 11px; color: #94a3b8; line-height: 1.6;">
          Dikembangkan oleh <strong>Orivastra</strong> &bull; <em>&ldquo;From Origin to the Stars.&rdquo;</em><br>
          &copy; 2026 Assessia — Orivastra. Seluruh hak cipta dilindungi undang-undang.
        </div>
      </div>
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
    const subject = 'Atur Ulang Kata Sandi - Assessia';

    const html = `
<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
  <style>
    body { margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; color: #1e293b; }
    .wrapper { width: 100%; background-color: #f1f5f9; padding: 36px 12px; box-sizing: border-box; }
    .container { max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 30px -5px rgba(15, 23, 42, 0.08), 0 0 1px 1px rgba(15, 23, 42, 0.04); border: 1px solid #e2e8f0; }
    .ribbon { height: 6px; background: linear-gradient(90deg, #ec4899 0%, #7C3AED 50%, #2563EB 100%); }
    .header { padding: 36px 32px 20px 32px; text-align: center; background: #ffffff; }
    .content { padding: 0 36px 36px 36px; }
    .badge { display: inline-block; background: #fdf2f8; border: 1px solid #fbcfe8; border-radius: 9999px; padding: 5px 14px; font-size: 11px; font-weight: 700; color: #be185d; letter-spacing: 0.5px; text-transform: uppercase; margin-bottom: 18px; }
    .btn { display: inline-block; background: linear-gradient(135deg, #7C3AED 0%, #2563EB 100%); color: #ffffff !important; text-decoration: none; padding: 13px 36px; border-radius: 10px; font-size: 14.5px; font-weight: 700; box-shadow: 0 4px 14px rgba(124, 58, 237, 0.35); }
    .footer { background: #f8fafc; border-top: 1px solid #f1f5f9; padding: 24px 32px; text-align: center; }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b;">
  <div class="wrapper" style="width: 100%; background-color: #f1f5f9; padding: 36px 12px; box-sizing: border-box;">
    <div class="container" style="max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 30px -5px rgba(15, 23, 42, 0.08); border: 1px solid #e2e8f0;">
      <!-- Aurora Gradient Ribbon -->
      <div class="ribbon" style="height: 6px; background: linear-gradient(90deg, #ec4899 0%, #7C3AED 50%, #2563EB 100%);"></div>

      <!-- Header -->
      <div class="header" style="padding: 36px 32px 20px 32px; text-align: center; background: #ffffff;">
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" style="margin: 0 auto;">
          <tr>
            <td style="vertical-align: middle; padding-right: 12px;">
              <img src="${this.appUrl}/logo-only-light.png" alt="Assessia" width="44" height="44" style="display: block; border: 0; outline: none; object-fit: contain;" />
            </td>
            <td style="vertical-align: middle; text-align: left;">
              <div style="font-size: 26px; font-weight: 900; letter-spacing: -0.5px; color: #0b132b; line-height: 1;">Assessia</div>
              <div style="font-size: 11px; font-weight: 600; color: #7c3aed; letter-spacing: 0.5px; text-transform: uppercase; margin-top: 3px;">by Orivastra</div>
            </td>
          </tr>
        </table>
        <div style="font-size: 12px; font-style: italic; color: #64748b; margin-top: 10px;">
          &ldquo;Measure Learning. Empower Progress.&rdquo;
        </div>
        <div style="height: 1px; background: #f1f5f9; margin-top: 20px;"></div>
      </div>

      <!-- Main Content -->
      <div class="content" style="padding: 0 36px 36px 36px;">
        <div class="badge" style="display: inline-block; background: #fdf2f8; border: 1px solid #fbcfe8; border-radius: 9999px; padding: 5px 14px; font-size: 11px; font-weight: 700; color: #be185d; letter-spacing: 0.5px; text-transform: uppercase; margin-bottom: 18px;">
          <span style="display: inline-block; width: 6px; height: 6px; border-radius: 50%; background: #ec4899; margin-right: 6px; vertical-align: middle;"></span>Keamanan Akun
        </div>

        <h1 style="margin: 0 0 12px 0; font-size: 22px; font-weight: 800; color: #0f172a; letter-spacing: -0.02em;">
          Atur Ulang Kata Sandi Akun 🔐
        </h1>

        <p style="margin: 0 0 16px 0; font-size: 14.5px; line-height: 1.65; color: #475569;">
          Halo ${name}, kami menerima permintaan pengaturan ulang kata sandi untuk akun pengajar Anda di <strong>Assessia</strong>.
        </p>

        <p style="margin: 0 0 20px 0; font-size: 14.5px; line-height: 1.65; color: #475569;">
          Silakan tekan tombol di bawah ini untuk membuat kata sandi baru akun Anda.
        </p>

        <!-- CTA Box -->
        <div style="background: #fafafa; border: 1px solid #f1f5f9; border-radius: 12px; padding: 24px; text-align: center; margin: 24px 0;">
          <div style="font-size: 13px; color: #64748b; margin-bottom: 16px; font-weight: 500;">
            Tekan tombol di bawah untuk membuat kata sandi baru:
          </div>
          <a href="${resetUrl}" class="btn" style="display: inline-block; background: linear-gradient(135deg, #7C3AED 0%, #2563EB 100%); color: #ffffff !important; text-decoration: none; padding: 13px 36px; border-radius: 10px; font-size: 14.5px; font-weight: 700; box-shadow: 0 4px 14px rgba(124, 58, 237, 0.35);">
            Atur Ulang Kata Sandi &rarr;
          </a>
          <div style="font-size: 11.5px; color: #94a3b8; margin-top: 14px;">
            ⏱ Tautan ini hanya berlaku selama <strong>60 menit</strong>
          </div>
        </div>

        <!-- Security Notice -->
        <div style="background: #fffbeb; border-left: 3px solid #f59e0b; border-radius: 0 8px 8px 0; padding: 14px 18px; margin-top: 24px;">
          <div style="font-size: 12px; color: #92400e; line-height: 1.6;">
            <strong>Bukan Anda yang meminta?</strong> Akun Anda tetap aman. Anda dapat mengabaikan email ini dengan aman atau hubungi administrator jika mencurigai aktivitas mencurigakan.
          </div>
        </div>
      </div>

      <!-- Footer -->
      <div class="footer" style="background: #f8fafc; border-top: 1px solid #f1f5f9; padding: 24px 32px; text-align: center;">
        <div style="font-size: 12.5px; font-weight: 800; color: #1e293b; letter-spacing: 0.06em; text-transform: uppercase;">
          ASSESSIA
        </div>
        <div style="font-size: 11.5px; font-style: italic; color: #64748b; margin-top: 2px;">
          &ldquo;Measure Learning. Empower Progress.&rdquo;
        </div>
        <div style="height: 1px; width: 60px; background: #e2e8f0; margin: 12px auto;"></div>
        <div style="font-size: 11px; color: #94a3b8; line-height: 1.6;">
          Dikembangkan oleh <strong>Orivastra</strong> &bull; <em>&ldquo;From Origin to the Stars.&rdquo;</em><br>
          &copy; 2026 Assessia — Orivastra. Seluruh hak cipta dilindungi undang-undang.
        </div>
      </div>
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
