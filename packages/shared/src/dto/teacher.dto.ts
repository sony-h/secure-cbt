// ============================================================
// Teacher DTOs
// ============================================================

export interface CreateTeacherDto {
  nip: string;
  full_name: string;
  subject_ids?: string[];
}

export interface UpdateTeacherDto {
  nip?: string;
  full_name?: string;
  subject_ids?: string[];
}

export interface TeacherResponseDto {
  id: string;
  user_id: string;
  nip: string;
  full_name: string;
  subjects: { id: string; name: string }[];
  created_at: string;
  updated_at: string;
}
