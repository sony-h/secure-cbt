// ============================================================
// Shared TypeScript Types for Secure CBT Platform
// ============================================================

/** Standard API success response */
export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data: T;
}

/** Standard API error response */
export interface ApiErrorResponse {
  success: false;
  message: string;
  errors?: ValidationError[];
}

/** Single validation error detail */
export interface ValidationError {
  field: string;
  message: string;
}

/** Paginated response wrapper */
export interface PaginatedResponse<T> {
  data: T[];
  meta: PaginationMeta;
}

/** Pagination metadata */
export interface PaginationMeta {
  page: number;
  per_page: number;
  total: number;
  total_pages: number;
}

/** Common query parameters for list endpoints */
export interface PaginationQuery {
  page?: number;
  per_page?: number;
  search?: string;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
}

/** JWT token pair */
export interface TokenPair {
  access_token: string;
  refresh_token: string;
  expires_in: number;
}

/** Decoded JWT payload */
export interface JwtPayload {
  sub: string;
  username: string;
  role: UserRole;
  iat?: number;
  exp?: number;
}

// Re-import for self-contained types
import { UserRole } from '../enums';
