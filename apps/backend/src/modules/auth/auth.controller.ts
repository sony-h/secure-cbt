import { Controller, Post, Body, Get, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { ApiResponse } from '@secure-cbt/shared';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @ApiOperation({ summary: 'Login with username and password' })
  async login(@Body() body: { username: string; password: string; device_id?: string }) {
    const result = await this.authService.login(body);
    return { success: true, message: 'Login successful', data: result } satisfies ApiResponse;
  }

  @Post('refresh')
  @ApiOperation({ summary: 'Refresh access token' })
  async refresh(@Body() body: { refresh_token: string }) {
    const result = await this.authService.refresh(body);
    return { success: true, message: 'Token refreshed', data: result } satisfies ApiResponse;
  }

  @Post('logout')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Logout and invalidate tokens' })
  async logout(@Req() req: any, @Body() body?: { refresh_token?: string }) {
    await this.authService.logout(req.user.sub, body?.refresh_token);
    return { success: true, message: 'Logged out successfully', data: null };
  }

  @Post('change-password')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Change password' })
  async changePassword(@Req() req: any, @Body() body: { old_password: string; new_password: string }) {
    await this.authService.changePassword(req.user.sub, body);
    return { success: true, message: 'Password changed successfully', data: null };
  }

  @Get('me')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get current user profile' })
  async getProfile(@Req() req: any) {
    const data = await this.authService.getProfile(req.user.sub);
    return { success: true, message: 'Profile retrieved', data };
  }
}
