# Design Document: Accidental Submit Recovery, Slide-to-Submit & Remedial Workflows with Dual-Score Tracking

**Product Brand:** Assessia by Orivastra  
**Target Release:** `v1.8.0` (Mobile Android Build: `1.8.0+20`)  
**Document Date:** 2026-11-01  
**Status:** In Review (Brainstorming Complete)

---

## 1. Intent and The Why

In high school digital CBT examinations across Indonesian SMA/SMK environments:
1. **Accidental Submissions Cause Crisis:** Students taking exams on compact smartphones frequently tap the "Submit" confirmation button by mistake (due to nervous thumb misclicks, rapid scrolling, or peer bumps). Once marked as `SUBMITTED`, students are permanently locked out, causing distress, incomplete assessments, and chaos for proctors who previously had no digital mechanism to restore the session.
2. **Remedial Lifecycle Fragmented:** Under national competency standards (K13 & Kurikulum Merdeka), students scoring below the school's Passing Grade (KKM) must undergo remedial examination. Currently, schools must duplicate exams, assign new classes, or manually administer paper tests. Having a native, secure remedial workflow within Assessia—where authorized students take Attempt #2 with reshuffled questions and options—saves significant teacher effort and preserves exam security.
3. **Dual-Score Transparency (Option C):** Indonesian teachers need full visibility into both the original score (*Nilai Utama*) and the remedial score (*Nilai Remedial*). Rather than enforcing a synthetic automated formula (e.g., maximum cap at KKM or average), Assessia adheres to **Option C**: transparent, side-by-side reporting that leaves final report card synthesis to educators.
4. **Tactile Friction for Submission:** Simple button taps on confirmation modals provide inadequate friction. A tactile **Slide-to-Submit** (*Geser untuk Mengumpulkan*) gesture physically prevents accidental submissions and gives students a final opportunity to review unanswered questions.

---

## 2. Goals, Non-Goals, and Anti-Goals

### Goals
- **Mobile CBT: Slide-to-Submit Modal:** Replace standard confirmation tap button with a smooth, tactile horizontal slider widget. Display an explicit high-contrast warning card when questions remain unanswered (e.g., *"Masih ada 2 soal kosong (No. 14, 28)"*).
- **Mission Control: Accidental Submit Recovery (`reopenSession`):**
  - Allow Proctors, Teachers (for their exams), Operators, and Admins to reopen an accidentally submitted session (`SUBMITTED` $\rightarrow$ `ACTIVE`).
  - Retain all previously saved student answers in PostgreSQL and local SQLite.
  - Resume the timer from the exact remaining seconds at submission time, with optional compensation (+5 minutes).
  - Enforce exam schedule validity: reopening is only permitted while `now <= exam.end_at` (or exam is not explicitly `FINISHED`).
  - Emit real-time WebSocket event `session.reopened` immediately redirecting the student's mobile app back into the live exam with an informative banner.
  - Log audit trail in `session_logs` (`SESSION_REOPENED` with proctor name).
- **Mission Control & Exam Detail: Authorize Remedial (`authorizeRemedial`):**
  - Allow Proctors/Teachers to whitelist a student for a remedial attempt (`is_remedial_authorized: true` or dedicated session record).
  - Use the **same exam token** for seamless student re-entry.
  - Generate a fresh, independently randomized question order and option shuffle for the remedial session.
- **Data Model & Dual-Score Tracking (Option C):**
  - Track attempt number (`attempt_number: 1` for Main, `attempt_number: 2` for Remedial) and session type (`session_type: MAIN | REMEDIAL`).
  - Store independent `Score` records for Main and Remedial attempts.
  - Display dual scores in `/dashboard/reports` data table: **Nilai Utama** and **Nilai Remedial**, with status badges (*Lulus Utama*, *Lulus Remedial*, *Belum Tuntas*).
  - Update official Excel and PDF Wonosobo report exports with dual-score columns.
- **Mobile CBT: Remedial Experience:**
  - Display distinctive **"Tersedia (Remedial)"** badge on `HomeScreen` and `ExamsScreen`.
  - Provide clear contextual notice on `ExamDetailScreen` and `TokenScreen` indicating this is the remedial examination.
  - Separate history entries in `HistoryScreen` displaying Attempt #1 (Utama) and Attempt #2 (Remedial).

### Non-Goals
- Supporting 3rd, 4th, or infinite automated attempts in this phase (strictly Attempt 1 = Main, Attempt 2 = Remedial).
- Enforcing an automated composite grade formula (Option C: teachers retain discretion for gradebook entry).
- Student self-service remedial without explicit proctor/teacher authorization.

### Anti-Goals
- Deleting, overwriting, or blanking Attempt #1 student answers or scores when starting a remedial attempt.
- Allowing session reopening after the exam schedule has expired.
- Permitting concurrent active sessions for the same student on the same exam.

---

## 3. Constraints

- **Platform Versioning:** SemVer `v1.8.0`, Mobile Android Build `1.8.0+20`.
- **RBAC Security:** Reopen and Remedial actions guarded by `RolesGuard` (`ADMIN`, `OPERATOR`, `TEACHER` with exam ownership check).
- **Data Integrity:** Database migrations must assign safe defaults (`attempt_number = 1`, `session_type = 'MAIN'`, `remedial_authorized = false`) ensuring 100% backward compatibility for all existing records.
- **Offline & Reconnect Resilience:** Mobile app must handle socket reconnection gracefully; if a student closed the app after submitting and the proctor reopens it, reopening is reflected on subsequent app launch or login.

---

## 4. Architectural & Implementation Decisions

### 4.1 Database Schema Changes (`schema.prisma`)

```prisma
enum SessionType {
  MAIN
  REMEDIAL
}

model ExamSession {
  // Existing fields...
  attempt_number       Int         @default(1)
  session_type         SessionType @default(MAIN)
  is_remedial_allowed  Boolean     @default(false)
  reopened_at          DateTime?
  reopened_by          String?     // Proctor/User UUID
  
  // Update unique constraint: A student can have at most one session per exam per attempt
  @@unique([exam_id, student_id, attempt_number])
  @@index([exam_id, student_id])
}

model Score {
  // Existing fields...
  attempt_number       Int         @default(1)
  session_type         SessionType @default(MAIN)

  // Update unique constraint: A score belongs to an exam session or exam-student-attempt
  @@unique([exam_session_id])
  @@index([exam_id, student_id])
}
```

### 4.1.1 Anti-Cheat Security: Exam Review Lockout during Remedial
- **Attempt #1 Review Guard:** In `SessionService.getReview`, if a student has `is_remedial_allowed == true` and their Attempt #2 session is not yet submitted, access to Attempt #1 review (answer keys and explanations) is strictly **BLOCKED** (`ForbiddenException: "Pembahasan terkunci karena Anda terdaftar mengikuti Ujian Remedial."`).
- **Mobile History UI:** In `HistoryScreen`, for students pending remedial, the "Lihat Pembahasan" button on Attempt #1 is disabled with a lock icon and tooltip *"Terkunci (Menunggu Remedial)"*.
- This completely prevents students from viewing or memorizing the correct answers before taking their remedial exam.

### 4.1.2 Strike / Violation Handling on Reopening AUTO_SUBMITTED Sessions
- When reopening an `AUTO_SUBMITTED` session (which was terminated because `warning_count >= warning_limit`, e.g. 3/3 strikes):
  - Leaving strikes at 3/3 would immediately re-trigger auto-submit upon the next client event.
  - Therefore, `reopenSession` automatically resets `warning_count = 0` (or proctor can choose 1 strike remaining).
  - The `session.reopened` WebSocket event transmits the updated `warningCount` to the mobile client to update the UI chip back to neutral grey (0/3).
  - An audit log entry is recorded: `SESSION_REOPENED:STRIKES_RESET`.

### 4.1.3 Question Composition in Attempt #2
- If the exam uses **Random Question Pool (Sub-sampling)**: Attempt #2 draws a brand-new stratified/random subset from the question bank.
- If the exam uses **Multi-Package (Paket A, B, etc.)**: Attempt #2 assigns an alternate package if available, with shuffled questions and options.
- If the exam uses **Fixed Questions**: Attempt #2 utilizes the full question set with a new Fisher-Yates shuffle applied to both question sequence and option sequence.

### 4.2 Backend Modules & Endpoints (`apps/backend`)

1. **`POST /api/v1/sessions/:id/reopen`**
   - **Guards:** JWT, RBAC (`ADMIN`, `OPERATOR`, `TEACHER`).
   - **Validation:**
     - Session must be in `SUBMITTED` or `AUTO_SUBMITTED` status.
     - Exam must be within active time window (`now <= exam.end_at` and status != `FINISHED`).
     - Request body may include optional `additional_minutes` (e.g. +5 minutes compensation).
   - **Execution (`$transaction`):**
     - Update session: `status: ACTIVE`, `submitted_at: null`, `reopened_at: now`, `reopened_by: user.id`.
     - Calculate remaining time: restore `session.remaining_time_seconds` snapshot (+ optional `additional_minutes * 60`).
     - If a `Score` was already calculated, mark score status or keep it inactive until resubmission.
     - Record `SessionLog`: `event_name = 'SESSION_REOPENED'`, `notes = 'Sesi dibuka kembali oleh (Proctor Name). Sisa waktu: Xm'`.
   - **Real-Time Notification:**
     - Emit to student room `student:${studentUserId}` and proctor room `exam:${examId}:proctors`:
       ```json
       {
         "event": "SESSION_REOPENED",
         "sessionId": "...",
         "examId": "...",
         "studentId": "...",
         "studentUserId": "...",
         "remainingTimeSeconds": 1450,
         "reopenedBy": "Budi Santoso, S.Pd."
       }
       ```

2. **`POST /api/v1/sessions/:id/authorize-remedial`**
   - **Guards:** JWT, RBAC (`ADMIN`, `OPERATOR`, `TEACHER`).
   - **Validation:**
     - Session must be `SUBMITTED` or `AUTO_SUBMITTED` with `attempt_number = 1`.
     - Student does not already have an active or completed Attempt #2 session.
   - **Execution:**
     - Set `is_remedial_allowed = true` on the Attempt #1 session.
     - Record `SessionLog`: `event_name = 'REMEDIAL_AUTHORIZED'`, `notes = 'Otorisasi remedial diberikan oleh (Proctor Name)'`.
     - Emit `SESSION_REMEDIAL_AUTHORIZED` to student room and proctor room.

3. **`POST /api/v1/sessions/start` (Updated)**
   - Check if student has an existing Attempt #1 session:
     - If Attempt #1 is `ACTIVE`, return existing session (resume).
     - If Attempt #1 is `SUBMITTED`:
       - Check if `is_remedial_allowed == true` and no Attempt #2 session exists.
       - If authorized: Create a brand new `ExamSession` with `attempt_number: 2`, `session_type: 'REMEDIAL'`.
       - Generate newly randomized `question_order` and shuffled options.
       - Initialize session timer with full exam duration.
       - Return the fresh remedial session.
       - If NOT authorized: Throw `BadRequestException("Anda sudah menyelesaikan ujian ini.")`.

4. **`GET /api/v1/reports/exam/:id` & Export Endpoints (Updated)**
   - Group student sessions by `student_id`.
   - Pair Attempt #1 (`MAIN`) and Attempt #2 (`REMEDIAL`) per student.
   - Return dual score payload:
     ```json
     {
       "student_id": "...",
       "nis": "202501001",
       "student_name": "Ahmad Dahlan",
       "class_name": "X AKL 1",
       "main_score": 54.00,
       "remedial_score": 82.50,
       "status": "LULUS_REMEDIAL"
     }
     ```

### 4.3 Dashboard Mission Control & Reports (`apps/dashboard`)

1. **`StudentActionDialog` (`monitoring/`):**
   - When a student's session is `SUBMITTED` or `AUTO_SUBMITTED`:
     - Show prominent **"Buka Kembali Sesi"** button (Cyan/Blue theme).
     - Clicking opens confirmation with options:
       - Restore with exact remaining time (e.g. `24m 10s`).
       - Add compensation time (+5m checkbox).
     - Show **"Izinkan Ujian Remedial"** button (Purple theme) if attempt is 1.
2. **Reports Page (`reports/`):**
   - Table columns: `NIS` | `Nama Siswa` | `Kelas` | `Nilai Utama` | `Nilai Remedial` | `Status` | `Aksi`.
   - **Remedial Actions in Reports:**
     - Individual button per student: **"Izinkan Remedial"** for students scoring below passing grade.
     - Bulk action button at table top: **"⚡ Izinkan Remedial Semua Siswa < KKM"** (opens a confirmation modal showing candidate count, authorizes all in one batch request via `POST /api/v1/exams/:id/authorize-remedial-bulk`).
   - Filter pills: `Semua`, `Lulus Utama`, `Lulus Remedial`, `Belum Tuntas`, `Mengikuti Remedial`.
   - Excel export (.xlsx) formatted with separate **Nilai Utama** and **Nilai Remedial** column headers.
   - PDF Wonosobo export formatted with clean dual-score columns.

### 4.3.1 Remedial Scheduling Protocol
- When conducting a remedial session, teachers simply extend the exam schedule (`end_at`) or regenerate the exam token as usual.
- The system checks if `now <= exam.end_at` for remedial access; students who are authorized can enter with the active token to take their Attempt #2 session.

### 4.4 Mobile CBT App (`apps/mobile`)

1. **`SlideToSubmit` Component (`submit_dialog.dart`):**
   - Interactive draggable slider widget built on `GestureDetector`.
   - Visual track with animated arrow shimmer: *"Geser untuk Mengumpulkan ➔"*.
   - Drag threshold: must reach $\ge 85\%$ of track width to trigger submit.
   - Haptic feedback (`HapticFeedback.heavyImpact()`) upon successful slide.
   - Unanswered questions indicator card:
     - If all questions answered: Soft green pill *"Semua soal telah terjawab (30/30)"*.
     - If unanswered exist: Amber/Crimson card *"Perhatian: Masih ada X soal belum terjawab (No. A, B, C). Soal kosong bernilai 0 poin."*
2. **WebSocket Reopen Listener (`exam_screen.dart`):**
   - Listens to `SESSION_REOPENED` event matching current `studentUserId` and `examId`.
   - When triggered:
     - Cancels submit transition dialog or result screen.
     - Resets submit flags and re-arms security violation monitoring.
     - Updates exam state timer with restored remaining time.
     - Displays top `ExamNotificationBanner`: *"Sesi Ujian Telah Dibuka Kembali oleh Pengawas"*.
3. **Remedial Identification & History:**
   - `HomeScreen` & `ExamsScreen`: Exams with authorized remedial appear with purple badge **"Tersedia (Remedial)"**.
   - `ExamDetailScreen`: Informs student that this is the remedial examination.
   - `HistoryScreen`: Lists both attempts clearly with labels *"Percobaan 1 (Utama)"* and *"Percobaan 2 (Remedial)"*.

---

## 5. What's Left to The Builder

1. **Slider Animation Velocity & Curve:** Precise drag physics and reset animation curve (`Curves.easeOutCubic`) if student releases slider before reaching the 85% threshold.
2. **Excel Cell Styling:** Formatting column widths and background fills for Nilai Utama (Soft Blue) vs Nilai Remedial (Soft Purple) in `excel-export.service.ts`.
3. **Socket Reconnect Sync:** Verification on app launch if an unsubmitted reopened session exists when the socket was temporarily disconnected.

---

## 6. Verification and Test Strategy

- **Backend Unit & E2E Tests:**
  - Session reopen: verify state transition `SUBMITTED` $\rightarrow$ `ACTIVE`, answer retention, time restoration, audit log creation, and schedule boundary check (`now > end_at` rejection).
  - Remedial authorization: verify flag update, duplicate prevention, and creation of fresh session with `attempt_number: 2`.
  - Report queries: verify correct outer-join mapping between Attempt #1 and Attempt #2 scores.
- **Dashboard Component Tests:**
  - `StudentActionDialog`: verify visibility of Reopen and Remedial actions based on session status and attempt number.
  - `ReportsTable`: verify rendering of dual scores and status chips.
- **Mobile Flutter Tests:**
  - `SlideToSubmit`: widget test verifying incomplete slide snaps back, and completed slide triggers submit callback.
  - Unanswered questions warning: verify correct numbering of missing items.
  - Reopen listener: verify socket event updates state and dismisses result screen.
