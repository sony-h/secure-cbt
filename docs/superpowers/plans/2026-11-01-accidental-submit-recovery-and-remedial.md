# Accidental Submit Recovery, Slide-to-Submit & Remedial Dual-Score Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement accidental submission recovery (reopening sessions in-flight), a tactile Slide-to-Submit gesture with unanswered question warnings on mobile, and a complete Remedial examination lifecycle with Option C dual-score reporting across backend, dashboard, and mobile CBT.

**Architecture:** 
- **Backend:** NestJS modular services with Prisma ORM transactions for atomic session status rollbacks and Attempt #2 creation, Socket.io event dispatch for real-time client transitions, and grouped dual-score report aggregations.
- **Dashboard:** Next.js App Router with TanStack Table and Radix dialogs for proctor recovery actions, individual & bulk remedial authorizations, and dual-score gradebook visualizations with Excel & Wonosobo PDF exports.
- **Mobile App:** Flutter with custom gesture-driven `SlideToSubmit` widget, real-time WebSocket state recovery banner listeners, and dual-history cards with anti-cheat review locks.

**Tech Stack:** NestJS, Prisma (PostgreSQL), Socket.io, Next.js 14, Tailwind CSS, TanStack Table/Query, Flutter 3.22+, Riverpod, Drift (SQLite).

**Spec:** `docs/superpowers/specs/2026-11-01-accidental-submit-recovery-and-remedial-design.md`

## Global Constraints

- Platform version bump: `v1.8.0`, Mobile Android Build: `1.8.0+20`.
- Option C Dual-Score: Independent `Nilai Utama` and `Nilai Remedial` without automated synthetic composite scores.
- Reopening boundary: strictly prohibited if `now > exam.end_at` or `exam.status == 'FINISHED'`.
- Review anti-cheat lock: Attempt #1 review is strictly forbidden if `is_remedial_allowed == true` and Attempt #2 is unsubmitted.
- Strike reset on auto-submit reopen: `warning_count` reset to 0 to prevent immediate auto-submit infinite loops.
- Slide threshold: $\ge 85\%$ drag track width required to trigger submission.

## Review Focus

1. **Reopening after exam end time:** Attempting to reopen when `now > exam.end_at` must return HTTP 400 with a localized error message without altering session state.
2. **Review leakage before remedial:** Calling `GET /sessions/:id/review` for Attempt #1 when `is_remedial_allowed` is true must return HTTP 403 Forbidden.
3. **Double attempt collision:** Calling `POST /sessions/start` for Attempt #2 when already active or completed must resume the active session or reject without creating a 3rd attempt.
4. **Auto-submit strike loop:** Reopening a session terminated with 3/3 strikes must reset strikes so the student does not immediately auto-submit on their next lifecycle tick.
5. **Report grouping with 1 attempt:** Students who did not take remedial must show their `main_score` with `remedial_score = null` and appropriate status without crashing formulas or row alignment.

---

### Task 1: Shared Enums, Schemas & DTOs (`packages/shared`)

**Files:**
- Modify: `packages/shared/src/enums/index.ts`
- Modify: `packages/shared/src/schemas/session.schema.ts`
- Modify: `packages/shared/src/schemas/report.schema.ts`
- Test: `packages/shared/src/__tests__/session.schema.spec.ts`

**Interfaces:**
- Produces:
  - `SessionType` enum: `MAIN = 'MAIN'`, `REMEDIAL = 'REMEDIAL'`
  - `SocketEvent.SESSION_REOPENED = 'session.reopened'`, `SocketEvent.SESSION_REMEDIAL_AUTHORIZED = 'session.remedial_authorized'`
  - `reopenSessionSchema`: `{ session_id: z.string().uuid(), additional_minutes: z.number().int().min(0).max(60).optional(), reset_strikes: z.boolean().default(true) }`
  - `authorizeRemedialSchema`: `{ session_id: z.string().uuid() }`
  - `bulkAuthorizeRemedialSchema`: `{ student_ids: z.array(z.string().uuid()).min(1) }`
  - `ExamReportStudentDto`: `{ student_id: string, nis: string, student_name: string, class_name: string, main_score: number, remedial_score: number | null, is_remedial_allowed: boolean, status: string }`

- [ ] **Step 1: Write the failing test for new session schemas**

In `packages/shared/src/__tests__/session.schema.spec.ts`:
```ts
describe('Session Reopen & Remedial Schemas', () => {
  it('validates reopenSessionSchema with valid payload', () => {
    const valid = { session_id: '123e4567-e89b-12d3-a456-426614174000', additional_minutes: 5, reset_strikes: true };
    expect(reopenSessionSchema.parse(valid)).toEqual(valid);
  });
  it('validates bulkAuthorizeRemedialSchema requires non-empty student_ids', () => {
    expect(() => bulkAuthorizeRemedialSchema.parse({ student_ids: [] })).toThrow();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @secure-cbt/shared test`
Expected: FAIL with schema not exported/defined.

- [ ] **Step 3: Implement schemas and enums in `packages/shared`**

Add `SessionType` in `packages/shared/src/enums/index.ts`. Add `SESSION_REOPENED` and `SESSION_REMEDIAL_AUTHORIZED` in `SocketEvent`. Export `reopenSessionSchema`, `authorizeRemedialSchema`, and `bulkAuthorizeRemedialSchema` in `packages/shared/src/schemas/session.schema.ts`. Update `packages/shared/src/schemas/report.schema.ts`.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @secure-cbt/shared test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/shared/
git commit -m "feat(shared): add session reopen, remedial authorization schemas and session type enums"
```

---

### Task 2: Database Schema & Migration (`apps/backend/prisma`)

**Files:**
- Modify: `apps/backend/prisma/schema.prisma`
- Create: `apps/backend/prisma/migrations/20261101000000_add_session_reopen_and_remedial/migration.sql`

**Interfaces:**
- Produces:
  - `SessionType` enum in Postgres: `MAIN`, `REMEDIAL`
  - `ExamSession` columns: `attempt_number Int @default(1)`, `session_type SessionType @default(MAIN)`, `is_remedial_allowed Boolean @default(false)`, `reopened_at DateTime?`, `reopened_by String?`
  - `ExamSession` index: `@@unique([exam_id, student_id, attempt_number])`
  - `Score` columns: `attempt_number Int @default(1)`, `session_type SessionType @default(MAIN)`

- [ ] **Step 1: Update `schema.prisma`**

Add `enum SessionType { MAIN REMEDIAL }`. Update `model ExamSession` and `model Score` with attempt and reopen attributes, updating `@@unique([exam_id, student_id, attempt_number])` on `ExamSession`.

- [ ] **Step 2: Create and apply migration**

Run: `docker compose exec backend npx prisma migrate dev --name add_session_reopen_and_remedial --create-only`
Review the generated SQL file ensuring safe defaults (`DEFAULT 1`, `DEFAULT 'MAIN'::"SessionType"`, `DEFAULT false`).
Apply: `docker compose exec backend npx prisma migrate deploy`
Generate client: `docker compose exec backend npx prisma generate`

- [ ] **Step 3: Run backend typecheck to verify Prisma types compile**

Run: `pnpm --filter @secure-cbt/backend typecheck`
Expected: 0 errors.

- [ ] **Step 4: Commit**

```bash
git add apps/backend/prisma/
git commit -m "feat(db): add attempt_number, session_type and remedial columns to ExamSession and Score"
```

---

### Task 3: Backend Session Reopen Endpoint & Service Logic (`apps/backend`)

**Files:**
- Modify: `apps/backend/src/modules/session/session.service.ts`
- Modify: `apps/backend/src/modules/session/session.controller.ts`
- Modify: `apps/backend/src/modules/monitoring/monitoring.gateway.ts`
- Test: `apps/backend/src/modules/session/__tests__/session.reopen.spec.ts`

**Interfaces:**
- Consumes: `reopenSessionSchema`, `SessionStatus`, `SocketEvent.SESSION_REOPENED`
- Produces:
  - `SessionService.reopenSession(sessionId: string, userId: string, dto: ReopenSessionInput)`
  - `POST /api/v1/sessions/:id/reopen`
  - Emits `SESSION_REOPENED` event to student and proctor rooms.

- [ ] **Step 1: Write failing unit test for `reopenSession`**

In `apps/backend/src/modules/session/__tests__/session.reopen.spec.ts`:
- Test 1: Reopen succeeds for `SUBMITTED` session within schedule window, restores `ACTIVE`, resets `warning_count` if `reset_strikes: true`, adds compensation minutes, deletes provisional score, and creates `SESSION_REOPENED` log.
- Test 2: Throws `BadRequestException` if exam schedule has ended (`now > exam.end_at`).
- Test 3: Throws `BadRequestException` if session is already `ACTIVE`.

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @secure-cbt/backend test apps/backend/src/modules/session/__tests__/session.reopen.spec.ts`
Expected: FAIL with `reopenSession is not a function`.

- [ ] **Step 3: Implement `reopenSession` in `SessionService` & Controller**

In `SessionService.reopenSession`:
1. Resolve proctor name/role from `userId`.
2. Find session with exam and student.
3. Validate session is `SUBMITTED` or `AUTO_SUBMITTED`.
4. Validate `now <= exam.end_at` and `exam.status !== ExamStatus.FINISHED`.
5. In `$transaction`:
   - Calculate restored time: `session.remaining_time_seconds + (dto.additional_minutes ?? 0) * 60`.
   - Update `ExamSession`: `status = SessionStatus.ACTIVE`, `submitted_at = null`, `reopened_at = new Date()`, `reopened_by = userId`, `remaining_time_seconds = restoredTime`, `warning_count = dto.reset_strikes ? 0 : session.warning_count`.
   - Delete any calculated score from Attempt: `tx.score.deleteMany({ where: { exam_session_id: sessionId } })`.
   - Create `SessionLog`: `event_name = 'SESSION_REOPENED'`, `notes = 'Sesi dibuka kembali oleh (Proctor Name). Sisa: Xm'`.
6. Emit `SocketEvent.SESSION_REOPENED` with `{ sessionId, examId, studentId, studentUserId, remainingTimeSeconds, warningCount, reopenedBy }`.
7. Add endpoint `@Post(':id/reopen')` in `SessionController`.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @secure-cbt/backend test apps/backend/src/modules/session/__tests__/session.reopen.spec.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/backend/src/modules/session/ apps/backend/src/modules/monitoring/
git commit -m "feat(backend): implement session reopen endpoint with time and strike restoration"
```

---

### Task 4: Backend Remedial Authorization & Attempt #2 Start Lifecycle (`apps/backend`)

**Files:**
- Modify: `apps/backend/src/modules/session/session.service.ts`
- Modify: `apps/backend/src/modules/session/session.controller.ts`
- Modify: `apps/backend/src/modules/exam/exam.service.ts`
- Test: `apps/backend/src/modules/session/__tests__/session.remedial.spec.ts`

**Interfaces:**
- Consumes: `authorizeRemedialSchema`, `bulkAuthorizeRemedialSchema`, `SessionType`
- Produces:
  - `SessionService.authorizeRemedial(sessionId: string, userId: string)`
  - `SessionService.bulkAuthorizeRemedial(examId: string, userId: string, dto: BulkAuthorizeRemedialInput)`
  - `SessionService.start`: support Attempt #2 creation when authorized.
  - `SessionService.getReview`: anti-cheat lock for Attempt #1 when remedial pending.
  - `ExamService.getExamsForStudent`: flags remedial availability.

- [ ] **Step 1: Write failing unit test for remedial authorization and start**

In `apps/backend/src/modules/session/__tests__/session.remedial.spec.ts`:
- Test 1: `authorizeRemedial` sets `is_remedial_allowed = true` on Attempt #1 and creates log.
- Test 2: `bulkAuthorizeRemedial` updates all eligible students scoring below KKM.
- Test 3: `start` creates Attempt #2 session with `attempt_number: 2`, `session_type: 'REMEDIAL'`, and new randomized question order when Attempt #1 is completed and `is_remedial_allowed: true`.
- Test 4: `getReview` for Attempt #1 throws `ForbiddenException` when `is_remedial_allowed: true` and Attempt #2 is unsubmitted.

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @secure-cbt/backend test apps/backend/src/modules/session/__tests__/session.remedial.spec.ts`
Expected: FAIL.

- [ ] **Step 3: Implement remedial methods in `SessionService` & `ExamService`**

1. Implement `authorizeRemedial` and `bulkAuthorizeRemedial`.
2. In `SessionService.start`:
   - If completed session exists:
     - If `completed.is_remedial_allowed && completed.attempt_number === 1`:
       - Check if Attempt 2 session exists: if active, resume; if completed, throw 'Anda sudah menyelesaikan remedial'.
       - If no Attempt 2 exists: create `attempt_number: 2`, `session_type: SessionType.REMEDIAL` with newly shuffled questions/options.
     - Else: throw 'Anda sudah menyelesaikan ujian ini'.
3. In `SessionService.getReview`:
   - Check if session has `is_remedial_allowed == true`.
   - Query if an active/unsubmitted Attempt 2 exists or Attempt 2 is not yet started: throw `ForbiddenException('Pembahasan terkunci karena Anda terdaftar mengikuti Ujian Remedial.')`.
4. In `ExamService.getExamsForStudent`:
   - Exclude student only if they completed Attempt 2 OR completed Attempt 1 without `is_remedial_allowed`.
   - Include `is_remedial: boolean` on exam objects.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @secure-cbt/backend test apps/backend/src/modules/session/__tests__/session.remedial.spec.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/backend/src/modules/session/ apps/backend/src/modules/exam/
git commit -m "feat(backend): implement remedial authorization, attempt 2 lifecycle, and anti-cheat review locks"
```

---

### Task 5: Backend Dual-Score Reporting, Excel & Wonosobo PDF Export (`apps/backend`)

**Files:**
- Modify: `apps/backend/src/modules/report/report.service.ts`
- Modify: `apps/backend/src/modules/report/report.controller.ts`
- Test: `apps/backend/src/modules/report/__tests__/report.dual_score.spec.ts`

**Interfaces:**
- Produces:
  - `ReportService.getExamReport`: grouped student array with `main_score`, `remedial_score`, and status (`LULUS_UTAMA`, `LULUS_REMEDIAL`, `BELUM_TUNTAS`).
  - `ReportService.generateExcelReport`: dual columns for Nilai Utama & Nilai Remedial.
  - `ReportService.generatePdfReport`: Wonosobo A4 tabular layout with dual columns.

- [ ] **Step 1: Write failing unit test for dual-score report grouping**

In `apps/backend/src/modules/report/__tests__/report.dual_score.spec.ts`:
- Test 1: Groups Attempt 1 and Attempt 2 for the same student into a single record with `main_score: 54.0`, `remedial_score: 82.0`, `status: 'LULUS_REMEDIAL'`.
- Test 2: Student with only Attempt 1 (score 78.0 >= 70) returns `main_score: 78.0`, `remedial_score: null`, `status: 'LULUS_UTAMA'`.
- Test 3: Student with Attempt 1 (48.0) and Attempt 2 (58.0 < 70) returns `status: 'BELUM_TUNTAS'`.

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @secure-cbt/backend test apps/backend/src/modules/report/__tests__/report.dual_score.spec.ts`
Expected: FAIL.

- [ ] **Step 3: Implement dual-score grouping and exports in `ReportService`**

1. Update `getExamReport`:
   - Fetch all sessions with scores for the exam.
   - Group by `student_id`.
   - Extract Attempt 1 session & score as `main_score`.
   - Extract Attempt 2 session & score as `remedial_score`.
   - Derive status: `main_score >= passingGrade ? 'LULUS_UTAMA' : (remedial_score !== null ? (remedial_score >= passingGrade ? 'LULUS_REMEDIAL' : 'BELUM_TUNTAS') : (is_remedial_allowed ? 'MENUNGGU_REMEDIAL' : 'BELUM_TUNTAS'))`.
2. Update `generateExcelReport`: Add `Nilai Utama` and `Nilai Remedial` column headers, adjusting formula ranges.
3. Update `exportExamPdf`: Format dual-score cells in the official table.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @secure-cbt/backend test apps/backend/src/modules/report/__tests__/report.dual_score.spec.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/backend/src/modules/report/
git commit -m "feat(backend): implement dual-score reporting, Excel and PDF Wonosobo exports"
```

---

### Task 6: Dashboard Mission Control Reopen & Remedial Actions (`apps/dashboard`)

**Files:**
- Modify: `apps/dashboard/src/lib/api.ts`
- Modify: `apps/dashboard/src/components/monitoring/student-action-dialog.tsx`
- Test: `apps/dashboard/src/components/monitoring/__tests__/student-action-dialog.test.tsx`

**Interfaces:**
- Consumes: `sessionApi.reopen`, `sessionApi.authorizeRemedial`
- Produces:
  - Reopen button in `StudentActionDialog` with +5m compensation toggle.
  - "Izinkan Ujian Remedial" button in `StudentActionDialog`.

- [ ] **Step 1: Write component test for `StudentActionDialog` actions**

In `apps/dashboard/src/components/monitoring/__tests__/student-action-dialog.test.tsx`:
- Test 1: Renders "Buka Kembali Sesi Ujian" and "Izinkan Ujian Remedial" when session is `SUBMITTED`.
- Test 2: Clicking "Buka Kembali Sesi Ujian" triggers `sessionApi.reopen` with `reset_strikes: true`.
- Test 3: Hides action buttons when exam is finished or student already in attempt 2.

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @secure-cbt/dashboard test src/components/monitoring/__tests__/student-action-dialog.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Update `sessionApi` and `StudentActionDialog`**

1. In `src/lib/api.ts`, add:
   - `reopen: (sessionId: string, data?: { additional_minutes?: number; reset_strikes?: boolean }) => api.post(`/sessions/${sessionId}/reopen`, data)`
   - `authorizeRemedial: (sessionId: string) => api.post(`/sessions/${sessionId}/authorize-remedial`)`
   - `bulkAuthorizeRemedial: (examId: string, studentIds: string[]) => api.post(`/sessions/exam/${examId}/authorize-remedial-bulk`, { student_ids: studentIds })`
2. In `StudentActionDialog`:
   - Add state `includeCompensationTime: boolean`.
   - When `isCompleted` is true, render recovery card with "Buka Kembali Sesi" (Cyan) and "Izinkan Remedial" (Purple).
   - Wire handlers with toasts and `onSuccess` callback.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @secure-cbt/dashboard test src/components/monitoring/__tests__/student-action-dialog.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/dashboard/src/lib/api.ts apps/dashboard/src/components/monitoring/
git commit -m "feat(dashboard): add session reopen and remedial action controls to proctor dialog"
```

---

### Task 7: Dashboard Reports Dual-Score Table & Bulk Remedial Authorization (`apps/dashboard`)

**Files:**
- Modify: `apps/dashboard/src/app/dashboard/reports/page.tsx`
- Test: `apps/dashboard/src/app/dashboard/reports/__tests__/reports-page.test.tsx`

**Interfaces:**
- Produces:
  - Dual columns: `Nilai Utama`, `Nilai Remedial`, `Status`.
  - Bulk action: "⚡ Izinkan Remedial Semua Siswa < KKM" with confirmation dialog.
  - Individual action: "Izinkan Remedial" for students scoring below passing grade.

- [ ] **Step 1: Write component test for Reports page dual-score table**

In `apps/dashboard/src/app/dashboard/reports/__tests__/reports-page.test.tsx`:
- Test 1: Renders `Nilai Utama` and `Nilai Remedial` headers and cells.
- Test 2: Shows "Izinkan Remedial" action button for students with `main_score < passingGrade` and `!is_remedial_allowed`.
- Test 3: Clicking bulk remedial button opens modal displaying count of eligible students.

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @secure-cbt/dashboard test src/app/dashboard/reports/__tests__/reports-page.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Implement dual-score table & bulk actions in `reports/page.tsx`**

1. Update `reportColumns` in `reports/page.tsx`:
   - Replace single score with `main_score` (Soft Blue chip) and `remedial_score` (Soft Purple chip or `—`).
   - Update `Status` badge to show `Lulus Utama` (success), `Lulus Remedial` (purple), `Menunggu Remedial` (amber), or `Belum Tuntas` (destructive).
   - In actions column, show "Izinkan Remedial" button if `main_score < passingGrade && !is_remedial_allowed`.
2. Add top bulk action button: `⚡ Izinkan Remedial Semua Siswa < KKM`.
3. Wire mutation to `sessionApi.bulkAuthorizeRemedial` with TanStack Query invalidation (`['exam-report']`).

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @secure-cbt/dashboard test src/app/dashboard/reports/__tests__/reports-page.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/dashboard/src/app/dashboard/reports/
git commit -m "feat(dashboard): implement dual-score reports table and bulk remedial authorization"
```

---

### Task 8: Mobile Slide-to-Submit Gesture & Unanswered Questions Indicator (`apps/mobile`)

**Files:**
- Create: `apps/mobile/lib/features/exam/presentation/widgets/slide_to_submit.dart`
- Modify: `apps/mobile/lib/features/exam/presentation/widgets/submit_dialog.dart`
- Test: `apps/mobile/test/features/exam/slide_to_submit_test.dart`

**Interfaces:**
- Produces:
  - `SlideToSubmit` widget: `onSubmitted: VoidCallback`, `unansweredQuestions: List<int>`, `totalQuestions: int`.
  - Updated `showSubmitDialog` returning `Future<bool?>` only after slide gesture completion.

- [ ] **Step 1: Write widget test for `SlideToSubmit`**

In `apps/mobile/test/features/exam/slide_to_submit_test.dart`:
- Test 1: Dragging less than 85% width snaps handle back to start and does not trigger `onSubmitted`.
- Test 2: Dragging $\ge 85\%$ triggers `onSubmitted` callback and haptic feedback.
- Test 3: Renders unanswered alert card when `unansweredQuestions.isNotEmpty` listing missing indices.

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/mobile && flutter test test/features/exam/slide_to_submit_test.dart`
Expected: FAIL with widget not found.

- [ ] **Step 3: Implement `SlideToSubmit` and update `SubmitDialog`**

1. Create `SlideToSubmit` in `lib/features/exam/presentation/widgets/slide_to_submit.dart`:
   - Interactive track (`Container` with `AppColors.surfaceVariant` border radius 9999).
   - Draggable handle with `GestureDetector(onHorizontalDragUpdate, onHorizontalDragEnd)` and `Curves.easeOutCubic` snapback animation.
   - Threshold $\ge 0.85$ triggers `HapticFeedback.heavyImpact()` and `widget.onSubmitted()`.
   - Unanswered alert banner displaying count and question numbers: *"Perhatian: Masih ada X soal belum terjawab (No. ...)"*.
2. In `submit_dialog.dart`:
   - Replace simple "KUMPULKAN" button with `SlideToSubmit`.
   - Pass `unansweredQuestions` list computed from `ExamState.answers`.

- [ ] **Step 4: Run test to verify it passes**

Run: `cd apps/mobile && flutter test test/features/exam/slide_to_submit_test.dart`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/lib/features/exam/presentation/widgets/ apps/mobile/test/features/exam/
git commit -m "feat(mobile): implement SlideToSubmit tactile slider with unanswered questions alert"
```

---

### Task 9: Mobile Real-Time Reopen Navigation & Remedial Experience (`apps/mobile`)

**Files:**
- Modify: `apps/mobile/lib/features/exam/presentation/screens/exam_screen.dart`
- Modify: `apps/mobile/lib/features/home/presentation/screens/home_screen.dart`
- Modify: `apps/mobile/lib/features/exams/presentation/screens/exams_screen.dart`
- Modify: `apps/mobile/lib/features/history/presentation/screens/history_screen.dart`
- Test: `apps/mobile/test/features/exam/exam_reopen_test.dart`
- Test: `apps/mobile/test/features/history/history_remedial_test.dart`

**Interfaces:**
- Produces:
  - Reopen socket listener in `ExamScreen`: dismisses completion screen and re-enters active exam with `ExamNotificationBanner`.
  - Remedial badge on `HomeScreen` and `ExamsScreen`: *"Tersedia (Remedial)"*.
  - Anti-cheat review lock on `HistoryScreen`: disables Attempt 1 review when remedial pending.

- [ ] **Step 1: Write tests for socket reopen listener and history lock**

In `apps/mobile/test/features/exam/exam_reopen_test.dart` and `history_remedial_test.dart`:
- Test 1: Receiving `session.reopened` event updates `ExamState`, dismisses modal, and shows top notification banner.
- Test 2: `HistoryScreen` displays Attempt 1 and Attempt 2 separately.
- Test 3: `HistoryScreen` disables "Lihat Pembahasan" for Attempt 1 when `is_remedial_allowed: true` and Attempt 2 not yet submitted.

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/mobile && flutter test test/features/exam/exam_reopen_test.dart`
Expected: FAIL.

- [ ] **Step 3: Implement reopen listener and remedial UI in mobile**

1. In `exam_screen.dart`:
   - Subscribe to socket event `SocketEvent.sessionReopened`.
   - Check if payload `studentUserId == currentUserId && examId == currentExamId`.
   - If match:
     - Close any open submit transition or result dialogs.
     - Re-arm `ExamViolationHandler`.
     - Update timer countdown with `payload.remainingTimeSeconds`.
     - Display top banner: `ExamNotificationBanner(type: BannerType.deviceUnlocked, title: 'SESI DIBUKA KEMBALI', message: 'Pengawas telah membuka kembali sesi ujian Anda. Silakan lanjutkan.')`.
2. In `home_screen.dart` & `exams_screen.dart`:
   - If `exam.is_remedial == true`, display purple badge **"Tersedia (Remedial)"** and informative subtitle.
3. In `history_screen.dart`:
   - Render separate tiles for Attempt 1 and Attempt 2.
   - If student has `is_remedial_allowed == true` and Attempt 2 incomplete, disable review button with lock icon: *"Terkunci (Menunggu Remedial)"*.

- [ ] **Step 4: Run test to verify it passes**

Run: `cd apps/mobile && flutter test test/features/exam/exam_reopen_test.dart test/features/history/history_remedial_test.dart`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/lib/ apps/mobile/test/
git commit -m "feat(mobile): implement real-time session reopen recovery and remedial examination flow"
```

---

### Task 10: Full Monorepo End-to-End Verification & Build Check

**Files:**
- Modify: `apps/mobile/pubspec.yaml` (bump to `1.8.0+20`)
- Modify: `apps/dashboard/package.json` (bump to `1.8.0`)
- Modify: `apps/backend/package.json` (bump to `1.8.0`)
- Modify: `packages/shared/package.json` (bump to `1.8.0`)
- Modify: `PROGRESS.md`

- [ ] **Step 1: Bump version manifests to `v1.8.0` (Android `1.8.0+20`)**

Update version strings across all 4 package manifests.

- [ ] **Step 2: Run all shared package tests**

Run: `pnpm --filter @secure-cbt/shared test`
Expected: PASS (all tests pass).

- [ ] **Step 3: Run all backend tests**

Run: `pnpm --filter @secure-cbt/backend test`
Expected: PASS (all tests pass).

- [ ] **Step 4: Run all dashboard tests and production compile**

Run: `pnpm --filter @secure-cbt/dashboard test`
Run: `pnpm --filter @secure-cbt/dashboard build`
Expected: 0 errors across all routes.

- [ ] **Step 5: Run all mobile Flutter tests and static analysis**

Run: `cd apps/mobile && flutter test`
Run: `cd apps/mobile && flutter analyze lib/ test/`
Expected: 0 errors, 0 warnings.

- [ ] **Step 6: Update `PROGRESS.md`**

Document Phase 36 completion summary with all deliverables and architecture notes.

- [ ] **Step 7: Final Commit**

```bash
git add .
git commit -m "chore(release): bump version to v1.8.0+20 and finalize Phase 36 implementation"
```
