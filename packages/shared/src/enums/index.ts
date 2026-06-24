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

/** Connectivity states for mobile app */
export enum ConnectivityState {
  ONLINE = 'ONLINE',
  OFFLINE = 'OFFLINE',
  SYNCING = 'SYNCING',
  ERROR = 'ERROR',
}

/** Violation event types stored in session_logs */
export enum ViolationEvent {
  APP_BACKGROUND = 'APP_BACKGROUND',
  SPLIT_SCREEN = 'SPLIT_SCREEN',
  RECONNECTED = 'RECONNECTED',
  DISCONNECTED = 'DISCONNECTED',
  AUTO_SUBMIT = 'AUTO_SUBMIT',
  SESSION_EXPIRED = 'SESSION_EXPIRED',
}

/** Socket.io realtime event names */
export enum SocketEvent {
  STUDENT_CONNECTED = 'student.connected',
  STUDENT_DISCONNECTED = 'student.disconnected',
  WARNING_TRIGGERED = 'warning.triggered',
  ANSWER_SAVED = 'answer.saved',
  EXAM_SUBMITTED = 'exam.submitted',
  SESSION_FINISHED = 'session.finished',
  PROGRESS_UPDATED = 'progress.updated',
}
