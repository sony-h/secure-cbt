import { Controller, Post, Body, Get, Query, UseGuards, Req, Inject } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { z } from 'zod';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import {
  loginSchema,
  refreshTokenSchema,
  changePasswordSchema,
  registerTeacherSchema,
  verifyEmailSchema,
  resendVerificationSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from '@secure-cbt/shared';
import type { AuthenticatedRequest } from '../../common/types';

type LoginDto = z.infer<typeof loginSchema>;
type RefreshTokenDto = z.infer<typeof refreshTokenSchema>;
type RegisterTeacherDto = z.infer<typeof registerTeacherSchema>;
type VerifyEmailDto = z.infer<typeof verifyEmailSchema>;
type ResendVerificationDto = z.infer<typeof resendVerificationSchema>;
type ForgotPasswordDto = z.infer<typeof forgotPasswordSchema>;
type ResetPasswordDto = z.infer<typeof resetPasswordSchema>;

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    @Inject(AuthService)
    private readonly authService: AuthService
  ) {}

  @Post('login')
  // NOTE: students on the school network share ONE public IP (NAT), so this per-IP
  // limit is effectively school-wide — keep it generous or logins will 429 during
  // exam starts. Tune via THROTTLE_LOGIN_LIMIT (default 600/min).
  @Throttle({ default: { limit: Number(process.env.THROTTLE_LOGIN_LIMIT) || 600, ttl: 60000 } })
  @ApiOperation({ summary: 'Login with username and password' })
  async login(@Body() body: LoginDto) {
    const result = await this.authService.login(body);
    return { success: true, message: 'Login successful', data: result };
  }

  @Post('register-teacher')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiOperation({ summary: 'Self-register teacher account' })
  async registerTeacher(@Body() body: RegisterTeacherDto) {
    const result = await this.authService.registerTeacher(body);
    return { success: true, message: result.message, data: result };
  }

  @Post('verify-email')
  @ApiOperation({ summary: 'Verify teacher email address' })
  async verifyEmail(@Body() body: VerifyEmailDto) {
    const result = await this.authService.verifyEmail(body);
    return { success: true, message: 'Email berhasil diverifikasi', data: result };
  }

  @Post('resend-verification')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @ApiOperation({ summary: 'Resend email verification link' })
  async resendVerification(@Body() body: ResendVerificationDto) {
    const result = await this.authService.resendVerification(body);
    return { success: true, message: result.message, data: null };
  }

  @Get('invite-info')
  @ApiOperation({ summary: 'Get invitation details by token' })
  async getInviteInfo(@Query('token') token: string) {
    const data = await this.authService.getInviteInfo(token);
    return { success: true, message: 'Informasi undangan valid', data };
  }

  @Post('forgot-password')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @ApiOperation({ summary: 'Request password reset email' })
  async forgotPassword(@Body() body: ForgotPasswordDto) {
    const result = await this.authService.forgotPassword(body);
    return { success: true, message: result.message, data: null };
  }

  @Post('reset-password')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @ApiOperation({ summary: 'Reset password with token' })
  async resetPassword(@Body() body: ResetPasswordDto) {
    const result = await this.authService.resetPassword(body);
    return { success: true, message: result.message, data: null };
  }

  @Post('refresh')
  @ApiOperation({ summary: 'Refresh access token' })
  async refresh(@Body() body: RefreshTokenDto) {
    const result = await this.authService.refresh(body);
    return { success: true, message: 'Token refreshed', data: result };
  }

  @Post('logout')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Logout and invalidate tokens' })
  async logout(@Req() req: AuthenticatedRequest, @Body() body?: { refresh_token?: string }) {
    await this.authService.logout(req.user.sub, body?.refresh_token);
    return { success: true, message: 'Logged out successfully', data: null };
  }

  @Post('change-password')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Change password' })
  async changePassword(@Req() req: AuthenticatedRequest, @Body() body: z.infer<typeof changePasswordSchema>) {
    await this.authService.changePassword(req.user.sub, body);
    return { success: true, message: 'Password changed successfully', data: null };
  }

  @Get('me')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get current user profile' })
  async getProfile(@Req() req: AuthenticatedRequest) {
    const data = await this.authService.getProfile(req.user.sub);
    return { success: true, message: 'Profile retrieved', data };
  }
}
