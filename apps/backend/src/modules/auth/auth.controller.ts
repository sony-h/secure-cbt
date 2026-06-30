import { Controller, Post, Body, Get, UseGuards, Req, Inject } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { z } from 'zod';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { loginSchema, refreshTokenSchema, changePasswordSchema } from '@secure-cbt/shared';
import type { AuthenticatedRequest } from '../../common/types';

type LoginDto = z.infer<typeof loginSchema>;
type RefreshTokenDto = z.infer<typeof refreshTokenSchema>;

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    @Inject(AuthService)
    private readonly authService: AuthService
  ) {}

  @Post('login')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @ApiOperation({ summary: 'Login with username and password' })
  async login(@Body() body: LoginDto) {
    const result = await this.authService.login(body);
    return { success: true, message: 'Login successful', data: result };
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
