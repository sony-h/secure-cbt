import { StudentStatus } from '../enums';

// ============================================================
// Student DTOs
// ============================================================

export interface CreateStudentDto {
  nis: string;
  full_name: string;
  class_id: string;
}

export interface UpdateStudentDto {
  nis?: string;
  full_name?: string;
  class_id?: string;
  status?: StudentStatus;
}

export interface StudentResponseDto {
  id: string;
  user_id: string;
  nis: string;
  full_name: string;
  class_id: string;
  class_name?: string;
  status: StudentStatus;
  created_at: string;
  updated_at: string;
}

export interface StudentImportRow {
  nis: string;
  full_name: string;
  class_name: string;
  username?: string;
  password?: string;
}

export interface StudentImportResultDto {
  total: number;
  success: number;
  failed: number;
  errors: string[];
}
