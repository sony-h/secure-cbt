import { z } from 'zod';

// ============================================================
// Auth DTOs
// ============================================================

export interface LoginRequestDto {
  username: string;
  password: string;
  device_id?: string;
}

export interface LoginResponseDto {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  user: {
    id: string;
    username: string;
    role: string;
    full_name: string;
    nis?: string;
    class_name?: string;
  };
}

export interface RefreshTokenRequestDto {
  refresh_token: string;
}

export interface ChangePasswordRequestDto {
  old_password: string;
  new_password: string;
}
