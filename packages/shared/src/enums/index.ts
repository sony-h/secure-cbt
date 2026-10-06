// ============================================================
// Core Enums for Secure CBT Platform
// ============================================================

/** User roles for RBAC */
export enum UserRole {
  ADMIN = 'ADMIN',
  OPERATOR = 'OPERATOR',
  TEACHER = 'TEACHER',
  STUDENT = 'STUDENT',
}

/** Supported question types */
export enum QuestionType {
  MULTIPLE_CHOICE = 'MULTIPLE_CHOICE',
  TRUE_FALSE = 'TRUE_FALSE',
  MULTI_SELECT = 'MULTI_SELECT',
  SHORT_ANSWER = 'SHORT_ANSWER',
  MATCHING = 'MATCHING',
  ESSAY = 'ESSAY',
}

/** Exam lifecycle statuses */
export enum ExamStatus {
  DRAFT = 'DRAFT',
  PUBLISHED = 'PUBLISHED',
  ONGOING = 'ONGOING',
  FINISHED = 'FINISHED',
  CANCELLED = 'CANCELLED',
}

/** Individual exam session statuses */
export enum SessionStatus {
  ACTIVE = 'ACTIVE',
  PAUSED = 'PAUSED',
  SUBMITTED = 'SUBMITTED',
  AUTO_SUBMITTED = 'AUTO_SUBMITTED',
  EXPIRED = 'EXPIRED',
}

/** Student account status */
export enum StudentStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  GRADUATED = 'GRADUATED',
}

/** Difficulty levels for questions */
export enum DifficultyLevel {
  EASY = 'EASY',
  MEDIUM = 'MEDIUM',
  HARD = 'HARD',
}

/** Violation event types stored in session_logs */
export enum ViolationEvent {
  APP_BACKGROUND = 'APP_BACKGROUND',
  SPLIT_SCREEN = 'SPLIT_SCREEN',
  STATUS_BAR_EXPANDED = 'STATUS_BAR_EXPANDED',
  RECONNECTED = 'RECONNECTED',
  DISCONNECTED = 'DISCONNECTED',
  AUTO_SUBMIT = 'AUTO_SUBMIT',
  SESSION_EXPIRED = 'SESSION_EXPIRED',
}

/** Socket.io + internal event names */
export enum SocketEvent {
  // Socket.io events
  STUDENT_CONNECTED = 'student.connected',
  STUDENT_DISCONNECTED = 'student.disconnected',
  WARNING_TRIGGERED = 'warning.triggered',
  ANSWER_SAVED = 'answer.saved',
  EXAM_SUBMITTED = 'exam.submitted',
  SESSION_FINISHED = 'session.finished',
  PROGRESS_UPDATED = 'progress.updated',
  // Internal EventEmitter events
  USER_LOGGED_IN = 'user.logged_in',
  USER_LOGGED_OUT = 'user.logged_out',
  USER_CREATED = 'user.created',
  USER_UPDATED = 'user.updated',
  USER_DELETED = 'user.deleted',
  CLASS_CREATED = 'class.created',
  SUBJECT_CREATED = 'subject.created',
  ACADEMIC_YEAR_CHANGED = 'academic_year.changed',
  STUDENT_CREATED = 'student.created',
  STUDENT_IMPORTED = 'student.imported',
  STUDENT_UPDATED = 'student.updated',
  TEACHER_CREATED = 'teacher.created',
  TEACHER_UPDATED = 'teacher.updated',
  QUESTION_CREATED = 'question.created',
  QUESTION_UPDATED = 'question.updated',
  QUESTION_DELETED = 'question.deleted',
  EXAM_CREATED = 'exam.created',
  EXAM_PUBLISHED = 'exam.published',
  EXAM_STARTED = 'exam.started',
  EXAM_FINISHED = 'exam.finished',
  SESSION_STARTED = 'session.started',
  SESSION_RECOVERED = 'session.recovered',
  SESSION_EXPIRED = 'session.expired',
  ANSWER_UPDATED = 'answer.updated',
  ANSWER_SYNCED = 'answer.synced',
  SCORE_GENERATED = 'score.generated',
  ESSAY_GRADED = 'essay.graded',
  REPORT_GENERATED = 'report.generated',
  SETTINGS_UPDATED = 'settings.updated',
}
