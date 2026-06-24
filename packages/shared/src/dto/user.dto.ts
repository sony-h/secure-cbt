import { UserRole } from '../enums';

// ============================================================
// User DTOs
// ============================================================

export interface CreateUserDto {
  username: string;
  email: string;
  password: string;
  role: UserRole;
}

export interface UpdateUserDto {
  email?: string;
  is_active?: boolean;
}

export interface UserResponseDto {
  id: string;
  username: string;
  email: string;
  role: UserRole;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}
