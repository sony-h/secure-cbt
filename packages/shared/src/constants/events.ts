// ============================================================
// Event Name Constants for Secure CBT Platform
// ============================================================

/** Internal NestJS EventEmitter event names */
export const EventNames = {
  // Auth events
  USER_LOGGED_IN: 'user.logged_in',
  USER_LOGGED_OUT: 'user.logged_out',

  // User events
  USER_CREATED: 'user.created',
  USER_UPDATED: 'user.updated',
  USER_DELETED: 'user.deleted',

  // Academic events
  CLASS_CREATED: 'class.created',
  SUBJECT_CREATED: 'subject.created',
  ACADEMIC_YEAR_CHANGED: 'academic_year.changed',

  // Student events
  STUDENT_CREATED: 'student.created',
  STUDENT_IMPORTED: 'student.imported',
  STUDENT_UPDATED: 'student.updated',

  // Teacher events
  TEACHER_CREATED: 'teacher.created',
  TEACHER_UPDATED: 'teacher.updated',

  // Question events
  QUESTION_CREATED: 'question.created',
  QUESTION_UPDATED: 'question.updated',
  QUESTION_DELETED: 'question.deleted',

  // Exam events
  EXAM_CREATED: 'exam.created',
  EXAM_PUBLISHED: 'exam.published',
  EXAM_STARTED: 'exam.started',
  EXAM_FINISHED: 'exam.finished',

  // Session events
  SESSION_STARTED: 'session.started',
  SESSION_RECOVERED: 'session.recovered',
  SESSION_EXPIRED: 'session.expired',
  SESSION_FINISHED: 'session.finished',

  // Answer events
  ANSWER_SAVED: 'answer.saved',
  ANSWER_UPDATED: 'answer.updated',
  ANSWER_SYNCED: 'answer.synced',

  // Monitoring events
  STUDENT_CONNECTED: 'student.connected',
  STUDENT_DISCONNECTED: 'student.disconnected',
  WARNING_TRIGGERED: 'warning.triggered',

  // Grading events
  SCORE_GENERATED: 'score.generated',
  ESSAY_GRADED: 'essay.graded',

  // Report events
  REPORT_GENERATED: 'report.generated',

  // Settings events
  SETTINGS_UPDATED: 'settings.updated',
} as const;

export type EventName = (typeof EventNames)[keyof typeof EventNames];
