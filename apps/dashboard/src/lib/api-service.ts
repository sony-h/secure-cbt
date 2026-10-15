import { api } from '@/lib/api';

export interface PaginationParams {
  page?: number;
  per_page?: number;
  search?: string;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
}

export interface StudentQueryParams extends PaginationParams {
  class_id?: string;
  status?: string;
}

export interface ExamQueryParams extends PaginationParams {
  status?: string;
  subject_id?: string;
}

export interface QuestionQueryParams extends PaginationParams {
  bank_id?: string;
  type?: string;
  subject_id?: string;
}

export interface ReportQueryParams {
  class_id?: string;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
}

export interface SessionReviewQuestionOption {
  id: string;
  content: string;
  image_url: string | null;
  is_correct: boolean;
  order: number;
}

export interface SessionReviewQuestion {
  id: string;
  number: number;
  type: string;
  content: string;
  image_url: string | null;
  difficulty: string;
  explanation: string | null;
  student_answer: string | null;
  is_correct: boolean;
  score: number;
  feedback: string | null;
  options: SessionReviewQuestionOption[];
}

export interface SessionReviewData {
  session_id: string;
  student_id: string;
  student_name: string;
  nis: string;
  class_name: string;
  exam_id: string;
  exam_title: string;
  subject_name: string;
  score: number | null;
  correct_count: number | null;
  wrong_count: number | null;
  submitted_at: string | null;
  status: string;
  questions: SessionReviewQuestion[];
}

export interface ItemAnalysisDistractor {
  option_id: string;
  order: number;
  content: string;
  is_correct: boolean;
  count: number;
  percentage: number;
}

export interface ItemAnalysisQuestion {
  question_id: string;
  number: number;
  content: string;
  type: string;
  difficulty: string;
  total_answered: number;
  correct_count: number;
  wrong_count: number;
  difficulty_index: number;
  pass_rate: number;
  distractor_distribution: ItemAnalysisDistractor[];
}

export interface ItemAnalysisData {
  exam_id: string;
  exam_title: string;
  total_sessions: number;
  questions: ItemAnalysisQuestion[];
}

export const academicApi = {
  getClasses: (params?: PaginationParams) => api.get('/academic/classes', { params }),
  getSubjects: (params?: PaginationParams) => api.get('/academic/subjects', { params }),
  getMajors: (params?: PaginationParams) => api.get('/academic/majors', { params }),
  getYears: (params?: PaginationParams) => api.get('/academic/years', { params }),
  createYear: (data: { name: string; is_active: boolean }) => api.post('/academic/years', data),
  updateYear: (id: string, data: { name: string; is_active: boolean }) => api.patch(`/academic/years/${id}`, data),
  deleteYear: (id: string) => api.delete(`/academic/years/${id}`),
  createMajor: (data: { name: string; code: string }) => api.post('/academic/majors', data),
  updateMajor: (id: string, data: { name: string; code: string }) => api.patch(`/academic/majors/${id}`, data),
  deleteMajor: (id: string) => api.delete(`/academic/majors/${id}`),
  createClass: (data: { name: string; major_id: string; academic_year_id: string; grade_level: number }) => api.post('/academic/classes', data),
  updateClass: (id: string, data: { name?: string; grade_level?: number; major_id?: string | null; academic_year_id?: string }) => api.patch(`/academic/classes/${id}`, data),
  deleteClass: (id: string) => api.delete(`/academic/classes/${id}`),
  createSubject: (data: { name: string; code: string; major_id?: string }) => api.post('/academic/subjects', data),
  updateSubject: (id: string, data: { name?: string; code?: string; major_id?: string | null }) => api.patch(`/academic/subjects/${id}`, data),
  deleteSubject: (id: string) => api.delete(`/academic/subjects/${id}`),
};

export const studentApi = {
  getAll: (params?: StudentQueryParams) => api.get('/students', { params }),
  create: (data: { nis: string; full_name: string; class_id: string; status?: string }) => api.post('/students', data),
  update: (id: string, data: { nis?: string; full_name?: string; class_id?: string; status?: string }) => api.patch(`/students/${id}`, data),
  delete: (id: string) => api.delete(`/students/${id}`),
};

export const teacherApi = {
  getAll: (params?: PaginationParams) => api.get('/teachers', { params }),
  create: (data: { nip: string; full_name: string; subject_ids?: string[] }) => api.post('/teachers', data),
  update: (id: string, data: { nip?: string; full_name?: string; subject_ids?: string[] }) => api.patch(`/teachers/${id}`, data),
  delete: (id: string) => api.delete(`/teachers/${id}`),
};

export const examApi = {
  getAll: (params?: ExamQueryParams) => api.get('/exams', { params }),
  getById: (id: string) => api.get(`/exams/${id}`),
  create: (data: { title: string; subject_id: string; duration_minutes: number; start_at: string; end_at: string; class_ids: string[]; question_ids: string[]; description?: string; randomize_questions?: boolean; randomize_answers?: boolean; warning_limit?: number; auto_submit_enabled?: boolean; fullscreen_required?: boolean; package_count?: number }) => api.post('/exams', data),
  update: (id: string, data: Partial<{ title: string; subject_id: string; duration_minutes: number; start_at: string; end_at: string; class_ids: string[]; question_ids: string[]; description: string; randomize_questions: boolean; randomize_answers: boolean; warning_limit: number; auto_submit_enabled: boolean; fullscreen_required: boolean; package_count: number }>) => api.patch(`/exams/${id}`, data),
  delete: (id: string) => api.delete(`/exams/${id}`),
  generateToken: (id: string) => api.post(`/exams/${id}/token`),
};

export const questionBankApi = {
  getBanks: (params?: { subject_id?: string }) => api.get('/questions/banks', { params }),
  getBankById: (id: string) => api.get(`/questions/banks/${id}`),
  createBank: (data: { title: string; subject_id: string }) => api.post('/questions/banks', data),
  deleteBank: (id: string) => api.delete(`/questions/banks/${id}`),
  getQuestions: (params?: QuestionQueryParams) => api.get('/questions', { params }),
  getQuestionById: (id: string) => api.get(`/questions/${id}`),
  createQuestion: (data: { question_bank_id: string; type: string; content: string; image_url?: string | null; difficulty?: string; explanation?: string | null; options?: { content: string; is_correct: boolean; image_url?: string | null }[]; tags?: string[] }) => api.post('/questions', data),
  updateQuestion: (id: string, data: Partial<{ type: string; content: string; image_url: string | null; difficulty: string; explanation: string | null; options: { content: string; is_correct: boolean; image_url?: string | null }[]; tags: string[] }>) => api.patch(`/questions/${id}`, data),
  deleteQuestion: (id: string) => api.delete(`/questions/${id}`),
  duplicateQuestion: (id: string) => api.post(`/questions/${id}/duplicate`),
  previewImport: (formData: FormData) =>
    api.post('/questions/import/preview', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  confirmImport: (data: { bank_id: string; questions: any[] }) =>
    api.post('/questions/import/confirm', data),
  downloadTemplateWord: () =>
    api.get('/questions/template/word', { responseType: 'blob' }),
  downloadTemplateExcel: () =>
    api.get('/questions/template/excel', { responseType: 'blob' }),
};

export const uploadApi = {
  uploadImage: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/uploads/image', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};

export const reportApi = {
  getExamReport: (examId: string, params?: ReportQueryParams) => api.get(`/reports/exam/${examId}`, { params }),
  getClassReport: (classId: string) => api.get(`/reports/class/${classId}`),
  getSessionReview: (sessionId: string) => api.get(`/reports/session/${sessionId}/review`),
  getItemAnalysis: (examId: string) => api.get(`/reports/exam/${examId}/item-analysis`),
};

export const monitoringApi = {
  getExamSessions: (examId: string) => api.get(`/monitoring/exams/${examId}`),
  getSessionLogs: (sessionId: string) => api.get(`/monitoring/sessions/${sessionId}`),
};

export const gradingApi = {
  getPendingEssays: (examId: string) => api.get(`/grading/pending/${examId}`),
  getSessionEssays: (sessionId: string) => api.get(`/grading/session/${sessionId}/essays`),
  gradeEssay: (data: { session_id: string; question_id: string; score: number; feedback: string }) => api.post('/grading/essay', data),
  regradeExam: (examId: string) => api.post(`/grading/exam/${examId}/regrade`),
  regradeSession: (sessionId: string) => api.post(`/grading/session/${sessionId}/regrade`),
};

export const settingsApi = {
  get: () => api.get('/settings'),
  update: (data: Record<string, unknown>) => api.patch('/settings', data),
  uploadWordTemplate: (formData: FormData) =>
    api.post('/settings/templates/word', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  uploadExcelTemplate: (formData: FormData) =>
    api.post('/settings/templates/excel', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  resetWordTemplate: () => api.delete('/settings/templates/word'),
  resetExcelTemplate: () => api.delete('/settings/templates/excel'),
};
