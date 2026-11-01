# Multiple Exam Attempts with Best Score Policy ("Nilai Terbaik") — Design Specification

**Feature:** Multiple Exam Attempts with Best Score Policy & Persistent Exam Cards  
**Target Platform:** Full-Stack (Database + Shared + Backend NestJS + Next.js Dashboard + Flutter Mobile CBT)  
**Date:** 2026-11-01  
**Status:** Draft for Review  

---

## 1. Intent & The "Why"

Assessia currently supports single-attempt formal exams (UTS, UAS, ANBK) and teacher-authorized remedial re-attempts for students who scored below the passing grade ($KKM$). However, in formative assessments, practice tryouts, and mastery learning contexts, educators want students to take agency over their learning:
- Students who receive an unsatisfactory score or want to reinforce their understanding should be able to retake the exam as long as they have attempts remaining.
- Even top-scoring students who want to aim for 100% or practice different question variations from a randomized pool should be allowed to try again.
- The grading policy must be student-friendly and motivating: the student's official gradebook mark is always the **Best Score ("Nilai Terbaik")** across all completed attempts.
- Students must never be surprised by disappearing exam cards or leaked answers between attempts.

---

## 2. Goals, Non-Goals, and Anti-Goals

### Goals
1. **Configurable Exam Attempts**: Teachers can configure **Batas Percobaan** (`max_attempts`: `1` [default], `2`, `3`, `5`, or `null` / `0` for *Tanpa Batas* / Unlimited) when creating or editing an exam.
2. **Best Score Policy ("Nilai Terbaik")**: The student's recorded grade in reports, export sheets, and final score views is the highest score achieved across all completed attempts:
   $$\text{Final Score} = \max(\text{Attempt}_1, \text{Attempt}_2, \dots, \text{Attempt}_N)$$
3. **Fresh Shuffling & Sub-sampling per Attempt**: Each new attempt receives a freshly randomized question order, shuffled option keys (A–D), and a new random subset if the exam uses random question pool sub-sampling.
4. **Persistent Exam Cards on Mobile**: Exam cards remain visible on the student's Home and Exams tabs even after completing an attempt:
   - While attempts remain: status displays `Tersedia (Sisa X Percobaan)` or `Tersedia (Percobaan 2/3)`.
   - When attempts are exhausted: status cleanly switches to `Selesai (Batas Habis)`.
5. **Polite Exhaustion Alert**: Tapping an exhausted exam card displays an informative dialog:
   > *"Batas Percobaan Habis: Anda telah menyelesaikan seluruh kuota pengerjaan untuk ujian ini (X/X percobaan). Nilai terbaik Anda telah tersimpan."*
6. **Anti-Cheat Solution Lock**: Detailed review solutions and answer keys remain locked while the student still has unused attempts remaining and the exam is active / unreleased.
7. **Proctor Extra Attempt Intervention**: Proctors in live Mission Control (`StudentActionDialog`) can grant an individual student **"+1 Percobaan"** if they suffered hardware or network interruptions.

### Non-Goals
- Automated composite or weighted averaging across attempts (the pedagogical requirement is strictly Best Score / Nilai Tertinggi).
- Modifying historical single-attempt exams (default `max_attempts: 1` preserves 100% backward compatibility).
- Allowing attempts after the scheduled exam window has closed (`now > exam.end_at`).
- Forcing students to immediately retake the exam upon submission.

### Anti-Goals
- **Answer Key Leakage Between Attempts**: If student reviews solutions after Attempt 1, Attempt 2 becomes a rote memorization exploit. Review must stay locked until all allowed attempts are consumed or the teacher releases results after the exam ends.
- **Disappearing Exam Cards**: Completed exams must not vanish from the student's Home/Exams tab; they must clearly reflect completion and store the best score.
- **Loss of Historical Session Logs**: Each attempt must persist as its own `ExamSession` and `Score` records for complete teacher auditability.

---

## 3. Data Model & Database Architecture

### 3.1. `Exam` Model (`schema.prisma`)
Add `max_attempts`:
```prisma
model Exam {
  // ... existing fields ...
  max_attempts  Int?  @default(1) // 1 = single attempt, N = N attempts, null/0 = unlimited
  // ... relations ...
}
```

### 3.2. `ExamSession` Model (`schema.prisma`)
Add `extra_attempts_allowed`:
```prisma
model ExamSession {
  // ... existing fields ...
  attempt_number         Int           @default(1)
  session_type           SessionType   @default(MAIN)
  is_remedial_allowed    Boolean       @default(false)
  extra_attempts_allowed Int           @default(0) // Extra attempts granted by proctor
  // ... relations ...
}
```

---

## 4. Backend Architecture & API Specifications

### 4.1. `POST /api/v1/sessions/start` Lifecycle
1. Retrieve all completed sessions for this student on this exam:
   ```ts
   const completedSessions = await prisma.examSession.findMany({
     where: {
       exam_id: exam.id,
       student_id: student.id,
       status: { in: [SessionStatus.SUBMITTED, SessionStatus.AUTO_SUBMITTED, SessionStatus.EXPIRED] }
     },
     orderBy: { attempt_number: 'desc' }
   });
   ```
2. Determine allowed attempts:
   - Base limit: `exam.max_attempts ?? Infinity` (if `null` or `0`, unlimited).
   - Extra attempts granted by proctor: `extraAttempts = completedSessions.reduce((acc, s) => acc + s.extra_attempts_allowed, 0)`.
   - Effective limit: `effectiveMaxAttempts = baseLimit === Infinity ? Infinity : baseLimit + extraAttempts`.
3. If `completedSessions.length >= effectiveMaxAttempts`:
   - Throw `BadRequestException('Batas kuota pengerjaan untuk ujian ini telah habis (X/X percobaan)')`.
4. If an active session already exists:
   - Automatically resume existing active session.
5. Create new session:
   - `attempt_number = completedSessions.length + 1`.
   - `session_type = exam.is_remedial ? SessionType.REMEDIAL : SessionType.MAIN`.
   - Shuffled question order, new package assignment, and random pool sub-sampling.

### 4.2. `GET /api/v1/exams/student` (Student Exam Discovery)
Update `ExamService.getExamsForStudent`:
- Do **not** bar exams just because `hasCompletedAttempt1`.
- Compute for each exam:
  - `completed_attempts_count`: number of completed sessions.
  - `effective_max_attempts`: `exam.max_attempts` + any proctor-granted extra attempts.
  - `has_attempts_remaining`: `effective_max_attempts === null || completed_attempts_count < effective_max_attempts`.
  - `best_score`: $\max(\dots)$ across completed attempt scores.
  - `is_exhausted`: `!has_attempts_remaining`.
- Return exams so the mobile client can display:
  - Active retryable exams in "Tersedia Dikerjakan".
  - Exhausted exams in "Selesai Dikerjakan" (or differentiated section) with clear status pills.

### 4.3. `GET /api/v1/sessions/:id/review` (Anti-Cheat Solution Guard)
Detailed discussion review, option correctness keys, and explanations are strictly guarded:
- Review is **ONLY unlocked** if **both** of the following conditions are met:
  1. The overall exam schedule has concluded (`exam.status === ExamStatus.FINISHED || now > exam.end_at`).
  2. The teacher has enabled result visibility (`exam.show_results === true`).
- If `now <= exam.end_at`, review is **always locked** for all students, even if an individual student has exhausted their allowed attempts early. This eliminates the risk of students leaking answers to classmates in the same computer lab or testing room.
- If a student still has unused attempts on an active exam, review returns `403 Forbidden` with:
  *"Pembahasan ujian terkunci karena Anda masih memiliki kesempatan mencoba ujian ini atau pengumuman belum dirilis oleh guru."*

### 4.4. Proctor Extra Attempt Endpoint & Real-Time Delivery
- Endpoint: `POST /api/v1/exams/:examId/students/:studentId/grant-attempt` (with fallback alias `POST /api/v1/sessions/:id/grant-attempt`).
- Proctor action in `SessionController` / `SessionService`:
  - Validates proctor/teacher/admin authorization.
  - Increments `extra_attempts_allowed` by +1 on the student's latest session record.
  - Logs `EXTRA_ATTEMPT_GRANTED` in `session_logs` with proctor name.
  - Emits real-time Socket.io event `session.attempt_granted` to the student's personal room (`student:${studentUserId}`) and the proctor room (`exam:${examId}:proctors`).
- Mobile Client Handling:
  - Global socket listener (active across all screens via `auth_provider` or App shell):
    - When `session.attempt_granted` is received, invalidates `home_provider` and `exams_provider`.
    - If on `HomeScreen` or `ExamsScreen`: shows floating SnackBar: *"Pengawas memberikan +1 kuota percobaan untuk ujian [Nama Ujian]!"*.
    - If inside `ExamScreen`: displays top `ExamNotificationBanner`.

### 4.5. Reports & Dual-Score Coexistence
- For standard single-attempt exams (`max_attempts === 1`), the Phase 36 Option C Dual-Score view (Nilai Utama vs Nilai Remedial) remains active for formal Indonesian report cards.
- For multi-attempt exams (`max_attempts > 1` or unlimited):
  - Primary report score is **Nilai Terbaik** ($\max$).
  - Table includes an attempts badge (e.g. `Nilai: 88.0` with `2x Percobaan`).
  - Expanding the student row or clicking review shows the breakdown for each attempt (Attempt 1, Attempt 2, etc.).
  - Excel export dynamically includes `Nilai Terbaik` and columns for each attempt.

---

## 5. Web Dashboard (Next.js)

### 5.1. Exam Builder / Settings Modal (`apps/dashboard`)
- Add **Batas Percobaan** selector in `CreateExamModal` / Exam Settings:
  - Options: `1 Percobaan (Standar / Formal)`, `2 Percobaan`, `3 Percobaan`, `5 Percobaan`, `Tanpa Batas (Latihan / Tryout)`.
  - Clear descriptive caption explaining the Best Score policy.

### 5.2. Mission Control Proctor Actions (`StudentActionDialog`)
- Add button: **"+1 Kuota Percobaan"** under student actions with confirmation dialog.
- Shows current completed attempts count (e.g. `Sudah selesai 2 dari 2 percobaan`).

### 5.3. Reports Page & Session Review Modal
- Table displays **Nilai Terbaik** column with attempts badge (e.g. `Nilai: 88.0` with `2x Percobaan`).
- Student Session Review modal lets teacher toggle between Attempt #1, Attempt #2, etc. to inspect individual answers.

---

## 6. Student Mobile CBT App (Flutter)

### 6.1. Persistent Exam Cards on Home & Exams Screens
- Exam card status pills:
  - If no attempts made: `Tersedia` (Info Blue).
  - If attempts made and attempts remain: `Tersedia (Sisa 2x)` or `Percobaan 2/3` (Warning Amber / Indigo).
  - If all attempts used: `Selesai (Batas Habis)` (Neutral Grey / Muted Green).
- If student taps an exhausted exam card:
  - Display a clean dialog with `Icons.info_outline_rounded`:
    - Title: **Batas Percobaan Habis**
    - Message: *"Anda telah menyelesaikan seluruh kuota pengerjaan untuk ujian ini (X/X percobaan). Nilai terbaik Anda (YY.Y) telah tersimpan."*
    - Actions: `[Lihat Riwayat]` and `[Tutup]`.

### 6.2. In-Exam Real-Time Banner for Granted Attempts
- When proctor grants extra attempt while student is in app:
  - Socket listens for `session.attempt_granted`.
  - Displays top `ExamNotificationBanner` (`deviceUnlocked` / `timeAdded` style):
    - Title: **KESEMPATAN MENCOBA DIBERIKAN**
    - Message: *"Pengawas telah menambahkan +1 kuota percobaan untuk Anda."*
    - Badge: `+1 PERCOBAAN`.

### 6.3. History & Review Locks
- History item displays `Nilai Terbaik` and attempt count chips (e.g., `Percobaan 2/2`).
- Tapping review shows `SnackBar` with lock icon if attempts are still open or review is unreleased.

---

## 7. Migration & Rollout Safety

1. **Zero Breaking Changes**: Default `max_attempts: 1` ensures all existing exams behave exactly as single-attempt exams.
2. **Backward Compatible**: Existing remedial flows (`attempt_number: 2`, `SessionType.REMEDIAL`) continue to work seamlessly within this generalized attempts framework.
3. **Database Migration**: Non-destructive `ADD COLUMN max_attempts INT DEFAULT 1` on `exams` and `ADD COLUMN extra_attempts_allowed INT DEFAULT 0` on `exam_sessions`.

---

## 8. What's Left to the Builder (Implementation Decisions)
- Exact badge styles and color tokens in Flutter (`AppColors.warning` for remaining attempts, `AppColors.neutral` for exhausted).
- Excel column naming for attempt breakdown (`Nilai Terbaik`, `Percobaan 1`, `Percobaan 2`).
- Toast / banner notification copy in Indonesian matching Assessia standards.
