import { DifficultyLevel, QuestionType } from '../enums';

// ============================================================
// Question DTOs
// ============================================================

export interface CreateOptionDto {
  content: string;
  is_correct: boolean;
}

export interface UpdateOptionDto {
  id?: string;
  content: string;
  is_correct: boolean;
}

export interface CreateQuestionDto {
  question_bank_id: string;
  type: QuestionType;
  content: string;
  difficulty: DifficultyLevel;
  explanation?: string;
  options: CreateOptionDto[];
  tags?: string[];
}

export interface UpdateQuestionDto {
  type?: QuestionType;
  content?: string;
  difficulty?: DifficultyLevel;
  explanation?: string;
  options?: UpdateOptionDto[];
  tags?: string[];
}

export interface QuestionOptionDto {
  id: string;
  content: string;
  // is_correct is NOT exposed to students
}

export interface QuestionResponseDto {
  id: string;
  question_bank_id: string;
  type: QuestionType;
  content: string;
  difficulty: DifficultyLevel;
  explanation?: string;
  options: QuestionOptionDto[];
  tags: string[];
  created_at: string;
  updated_at: string;
}

export interface QuestionBankDto {
  id: string;
  title: string;
  subject_id: string;
  subject_name?: string;
  teacher_id: string;
  question_count: number;
  created_at: string;
}
