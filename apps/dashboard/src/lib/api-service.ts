import { api } from '@/lib/api';

export const academicApi = {
  getClasses: (params?: Record<string, unknown>) => api.get('/academic/classes', { params }),
  getSubjects: (params?: Record<string, unknown>) => api.get('/academic/subjects', { params }),
  getMajors: (params?: Record<string, unknown>) => api.get('/academic/majors', { params }),
  getYears: (params?: Record<string, unknown>) => api.get('/academic/years', { params }),
  createYear: (data: { name: string; is_active: boolean }) => api.post('/academic/years', data),
  updateYear: (id: string, data: { name: string; is_active: boolean }) => api.patch(`/academic/years/${id}`, data),
  deleteYear: (id: string) => api.delete(`/academic/years/${id}`),
  createMajor: (data: { name: string; code: string }) => api.post('/academic/majors', data),
  updateMajor: (id: string, data: { name: string; code: string }) => api.patch(`/academic/majors/${id}`, data),
  deleteMajor: (id: string) => api.delete(`/academic/majors/${id}`),
  createClass: (data: unknown) => api.post('/academic/classes', data),
  updateClass: (id: string, data: unknown) => api.patch(`/academic/classes/${id}`, data),
  deleteClass: (id: string) => api.delete(`/academic/classes/${id}`),
  createSubject: (data: unknown) => api.post('/academic/subjects', data),
  updateSubject: (id: string, data: unknown) => api.patch(`/academic/subjects/${id}`, data),
  deleteSubject: (id: string) => api.delete(`/academic/subjects/${id}`),
};

export const studentApi = {
  getAll: (params?: Record<string, unknown>) => api.get('/students', { params }),
  create: (data: unknown) => api.post('/students', data),
  update: (id: string, data: unknown) => api.patch(`/students/${id}`, data),
  delete: (id: string) => api.delete(`/students/${id}`),
};

export const teacherApi = {
  getAll: (params?: Record<string, unknown>) => api.get('/teachers', { params }),
  create: (data: unknown) => api.post('/teachers', data),
  update: (id: string, data: unknown) => api.patch(`/teachers/${id}`, data),
  delete: (id: string) => api.delete(`/teachers/${id}`),
};

export const examApi = {
  getAll: (params?: Record<string, unknown>) => api.get('/exams', { params }),
  getById: (id: string) => api.get(`/exams/${id}`),
  create: (data: unknown) => api.post('/exams', data),
  update: (id: string, data: unknown) => api.patch(`/exams/${id}`, data),
  delete: (id: string) => api.delete(`/exams/${id}`),
  generateToken: (id: string) => api.post(`/exams/${id}/token`),
};

export const questionBankApi = {
  getBanks: (params?: Record<string, unknown>) => api.get('/questions/banks', { params }),
  createBank: (data: { title: string; subject_id: string }) => api.post('/questions/banks', data),
  deleteBank: (id: string) => api.delete(`/questions/banks/${id}`),
  getQuestions: (params?: Record<string, unknown>) => api.get('/questions', { params }),
  createQuestion: (data: unknown) => api.post('/questions', data),
  updateQuestion: (id: string, data: unknown) => api.patch(`/questions/${id}`, data),
  deleteQuestion: (id: string) => api.delete(`/questions/${id}`),
  duplicateQuestion: (id: string) => api.post(`/questions/${id}/duplicate`),
};

export const reportApi = {
  getExamReport: (examId: string, params?: Record<string, unknown>) => api.get(`/reports/exam/${examId}`, { params }),
};

export const monitoringApi = {
  getExamSessions: (examId: string) => api.get(`/monitoring/exams/${examId}`),
  getSessionLogs: (sessionId: string) => api.get(`/monitoring/sessions/${sessionId}`),
};

export const gradingApi = {
  getPendingEssays: (examId: string) => api.get(`/grading/pending/${examId}`),
  getSessionEssays: (sessionId: string) => api.get(`/grading/session/${sessionId}/essays`),
  gradeEssay: (data: { session_id: string; question_id: string; score: number; feedback: string }) => api.post('/grading/essay', data),
};

export const settingsApi = {
  get: () => api.get('/settings'),
  update: (data: Record<string, unknown>) => api.patch('/settings', data),
};
