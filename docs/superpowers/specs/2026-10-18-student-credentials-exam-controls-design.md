# Student Credentials Management & Exam Controls Design

## Context & Objectives
This specification addresses five operational and security enhancements requested for the Secure CBT platform:
1. **Anti-Cheat / Sub-sampling Pool Bug Fix**: Resolving HTTP 400 validation failures when creating or saving exams with the random pool / anti-cheat switch toggled off (`pool_question_count: null`).
2. **Mobile Submission Guard**: Preventing false-positive security violations (alarms, vibration, warning strikes) during the submission countdown and transition dialog when a student has already initiated submission.
3. **Exam Score & Review Visibility (`show_results`)**: Giving teachers control over whether students can see their score and exam answer review upon submission and in their exam history. Defaults to `true`.
4. **Exam Creation "Select All" Soal**: Providing a one-click toggle to select/deselect all filtered questions during exam creation and editing.
5. **Student Password Generator & Dual-Template Export (Excel & PDF)**: Adding `plain_password` retention for student accounts, generating class-prefixed passwords (e.g. `AKL-t3sjd8`, `TJKT-ds8h2d`), and exporting student credentials to Excel (.xlsx) and printable PDF (Tabular List or Cut-out Exam Cards).
6. **Teacher Account Management Architecture**: Documenting the future architecture for admin-gated teacher email self-registration.

---

## 1. Anti-Cheat & Sub-sampling Pool Validation
### Root Cause
In `createExamSchema`, `pool_question_count` was defined as:
```ts
pool_question_count: z.number().int().min(1, { message: 'Jumlah soal minimal 1' }).optional()
```
When `is_random_pool` is toggled off in the dashboard, the modal sets `pool_question_count: null`. Zod rejects `null` under `.optional()`, throwing:
`Expected number, received null`.

### Resolution
- Update `createExamSchema` to use `.nullable().optional()`.
- Harmonize `updateExamSchema` to allow `warning_limit: min(0)` and `violation_alarm_duration_seconds: min(1).max(30)`.
- Guard `warningLimit > 0` before triggering auto-submit in backend (`session.service.ts`, `monitoring.service.ts`) and mobile (`exam_notifier.dart`).
- Ensure `question_order` is consistently persisted on session start.

---

## 2. Mobile Submission Guard
### Behavior
During active exam taking, app minimization or status bar pull-downs trigger warning overlays and audible alarms. However, once a student confirms submission:
1. `_violationHandler?.disable()` is immediately invoked.
2. `violationAlarmServiceProvider.stopAlarm()` stops any pending sound/vibration.
3. `ExamViolationHandler.handleLifecycleChange` checks `if (!_violationsEnabled || isSubmitting || isSubmitted) return;`.
4. The 10-second celebration / auto-submit transition countdown runs unhindered even if the student minimizes or navigates away.

---

## 3. Exam Score Visibility (`show_results`)
### Schema & Database
- Add `show_results Boolean @default(true)` to `Exam` model in Prisma.
- Add `show_results: z.boolean().optional().default(true)` to `createExamSchema` and `updateExamSchema`.
- Dashboard exam modal includes a switch in Settings Step: *"Tampilkan Nilai ke Siswa"* (default: active).
- Dashboard exams table / edit screen allows quick toggling or updating this setting.

### Student Experience (Mobile)
- **Submission Result Screen (`result_screen.dart`)**:
  - If `show_results == true`: Displays numerical score (e.g., `85`), celebration badge, pass/fail status, and review navigation.
  - If `show_results == false`: Displays a celebratory completion card with copy: *"Ujian Anda telah berhasil dikumpulkan. Pengumuman nilai akan dirilis oleh guru/sekolah."*, without numerical score, and hides the "Lihat Pembahasan" button.
- **History Screen (`history_screen.dart`)**:
  - If `show_results == false`: Displays a masked badge *"Menunggu Guru"* instead of the numerical score and correct/wrong counts. Tapping the row shows a floating SnackBar informing that discussion and scores are held by the teacher.

---

## 4. Exam Creation "Select All" Soal
In `apps/dashboard/src/components/exams/exam-steps/questions-step.tsx`:
- Add a master checkbox above the question list: `Pilih Semua ({filteredQuestions.length})`.
- If all currently filtered questions are in `form.question_ids`, checking/clicking unchecks all filtered questions.
- If some or none are selected, checking/clicking selects all filtered questions without unselecting questions from other question banks.

---

## 5. Student & Teacher Credentials Management & Export
### Database & Persistence
- Add `plain_password String?` to `Student` model in Prisma.
- Make `Teacher.nip` optional (`nip String? @unique` in Prisma) to support private schools (swasta) where teachers have NIY (Nomor Induk Yayasan) or no NIP at all.
- When creating a student:
  - If `password` is provided, hash with Argon2 for `User.password_hash` and save plain text in `Student.plain_password`.
  - If `password` is omitted or empty, default to `nis`.
- When creating a teacher:
  - Label field as *"NIP / NIY (Nomor Induk Yayasan)"* and make it optional.
  - If NIP/NIY is provided, use it for username and default password. If omitted, generate a clean username (e.g., `guru_<name>_<rand>`) and default password (`guru123`).
  - In dashboard UI and teacher table, label column as *"NIP / NIY"* and render `"-"` when blank.

### Password Generation Logic (Students)
- Format: `${classPrefix}-${randomChars}`
  - Example: Class "X AKL 1" $\rightarrow$ prefix `AKL` $\rightarrow$ `AKL-t3sjd8`
  - Example: Class "XII TJKT 2" $\rightarrow$ prefix `TJKT` $\rightarrow$ `TJKT-8h2k9p`
- Function: `generateClassPassword(className: string): string`
  - Normalizes class name (extracts uppercase major/letter code like `AKL`, `TJKT`, `RPL`, `TKRO`, or falls back to `CBT`).
  - Generates 6 lowercase alphanumeric characters excluding ambiguous letters (`l, 1, 0, O`).

### Export Options
1. **Excel (`.xlsx`)**:
   - Columns: No, NIS, Nama Lengkap, Kelas, Username, Password, Status.
   - Built with `exceljs` or browser-side file saver.
2. **PDF Export with Template Toggle**:
   - **Template A (Daftar Tabel)**:
     - Document header with school logo and title *"DAFTAR AKUN PESERTA CBT"*.
     - Columns: No, NIS, Nama Siswa, Kelas, Username, Password, Tanda Tangan.
   - **Template B (Kartu Peserta / Cut-out Cards)**:
     - 2-column layout with dashed border around each card.
     - Card details: CBT Logo, Header *"KARTU LOGIN UJIAN CBT"*, NIS, Nama, Kelas, Username, Password, Ruang/Sesi line.
     - Formatted for clean A4 printing via browser print stylesheet.

---

## 6. Teacher Account Management Architecture (Future Phase)
1. **Self-Registration Flow**:
   - Teacher inputs NIP, Full Name, School Email, and Password at `/register/teacher`.
   - Backend sends a 6-digit OTP or signed magic link via `nodemailer` (SMTP).
   - Once verified, account is created with `User.role = 'TEACHER'` and status `PENDING_APPROVAL`.
2. **Admin Management Screen**:
   - In Admin Dashboard under *"Manajemen Guru"*, a tab for *"Permintaan Akun Guru"* lists pending registrations.
   - Admin approves registration and assigns initial subjects before the teacher can log in.
