// ============================================================
// Security & Configuration Constants for Secure CBT Platform
// ============================================================

/** Default security settings */
export const SecurityDefaults = {
  /** Default warning limit before auto-submit */
  WARNING_LIMIT: 3,

  /** Default whether auto-submit is enabled on time expiry */
  AUTO_SUBMIT_ENABLED: true,

  /** Default whether fullscreen is required during exam */
  FULLSCREEN_REQUIRED: true,

  /** Default session timeout in minutes (for inactivity) */
  SESSION_TIMEOUT_MINUTES: 30,

  /** Autosave interval in seconds */
  AUTOSAVE_INTERVAL_SECONDS: 5,

  /** Access token lifetime in minutes */
  ACCESS_TOKEN_LIFETIME_MINUTES: 15,

  /** Refresh token lifetime in days */
  REFRESH_TOKEN_LIFETIME_DAYS: 7,

  /** Maximum concurrent students per exam instance */
  MAX_CONCURRENT_STUDENTS: 500,

  /** Maximum upload file size in bytes (10 MB) */
  MAX_UPLOAD_SIZE_BYTES: 10 * 1024 * 1024,

  /** Rate limit: max requests per minute per IP */
  RATE_LIMIT_PER_MINUTE: 60,

  /** Rate limit: TTL window in seconds */
  RATE_LIMIT_TTL: 60,
} as const;

/** Cache TTL values in seconds */
export const CacheTTL = {
  /** Exam token cache TTL */
  EXAM_TOKEN: 3600, // 1 hour

  /** Session presence cache TTL */
  SESSION_PRESENCE: 300, // 5 minutes

  /** User session cache TTL */
  USER_SESSION: 900, // 15 minutes
} as const;

/** Queue job names */
export const QueueNames = {
  QUESTION_IMPORT: 'question-import',
  EXCEL_PROCESSING: 'excel-processing',
  PDF_GENERATION: 'pdf-generation',
  EMAIL_SENDING: 'email-sending',
  REPORT_GENERATION: 'report-generation',
  BACKGROUND_CLEANUP: 'background-cleanup',
} as const;
