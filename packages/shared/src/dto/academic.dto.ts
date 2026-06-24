// ============================================================
// Academic DTOs (Academic Year, Major, Class, Subject)
// ============================================================

export interface CreateAcademicYearDto {
  name: string;
  is_active?: boolean;
}

export interface UpdateAcademicYearDto {
  name?: string;
  is_active?: boolean;
}

export interface AcademicYearResponseDto {
  id: string;
  name: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateMajorDto {
  name: string;
  code: string;
}

export interface MajorResponseDto {
  id: string;
  name: string;
  code: string;
  created_at: string;
}

export interface CreateClassDto {
  name: string;
  major_id: string;
  academic_year_id: string;
  grade_level: number; // 10, 11, 12
}

export interface ClassResponseDto {
  id: string;
  name: string;
  major_id: string;
  major_name?: string;
  academic_year_id: string;
  grade_level: number;
  created_at: string;
}

export interface CreateSubjectDto {
  name: string;
  code: string;
  major_id?: string;
}

export interface SubjectResponseDto {
  id: string;
  name: string;
  code: string;
  major_id?: string;
  major_name?: string;
  created_at: string;
}
