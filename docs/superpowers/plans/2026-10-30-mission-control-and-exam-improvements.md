# Mission Control Enhancements, Unified In-Exam Banners & Short-Answer Grading Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement proctor strike adjustment controls (+1, -1, reset), two-way exam time adjustments (+/-), socket emit deduplication (fixing the double-time extension bug), a unified animated top-banner system for all in-exam announcements/actions on mobile, and a case-sensitivity toggle for short-answer questions in Question Studio and backend grading.

**Architecture:**
- **Backend:** NestJS modular monolith with Prisma ORM, Redis/Socket.io gateway (`/monitoring`), and EventEmitter2.
- **Shared Package:** `@secure-cbt/shared` containing updated `SocketEvent` enums and question Zod schemas.
- **Dashboard:** Next.js 14 (App Router) with Tailwind CSS, Radix UI components, and TanStack React Query.
- **Mobile CBT App:** Flutter with Riverpod, Drift SQLite, Dio, and Socket.io client.

**Spec / Requirements:**
1. Fix doubled time extension bug: Eliminate redundant `server.to(socketId).emit()` alongside `server.to('student:' + studentUserId).emit()` in `MonitoringGateway.notifyStudentAction` and `broadcastToExam`.
2. Strike Adjustment: Allow proctors in monitoring to increase (+1 penalty), decrease (-1 mercy), or reset (0) student strikes via `POST /api/v1/sessions/:id/adjust-warnings` and socket event `session.warnings_adjusted`.
3. Two-Way Time Adjustment: Support time deduction presets (-5m, -10m, -15m, -30m) alongside time addition (+5m, +10m, +15m, +30m) via `POST /api/v1/sessions/:id/extend-time`, clamping to `>= 0`.
4. Mobile Unified Banner: Replace standard Snackbars with an animated glassmorphism top banner `ExamNotificationBanner` supporting 8 distinct thematic modes (Time Added, Time Reduced, Strike Mercy, Strike Penalty, Strike Reset, Device Unlocked, Personal Message, Room Broadcast).
5. Short-Answer Case-Sensitivity: Add `case_sensitive` boolean (default `false`) on `Question` model, shared schema, Question Studio UI checkbox ("Abaikan huruf besar / kecil"), and `GradingService` evaluation.

## Global Constraints
- Do not break existing question formats or legacy exams without `case_sensitive` (defaults to `false`, meaning case-insensitive by default).
- Ensure strike reductions cannot drop `warning_count` below `0`.
- Ensure time reductions cannot drop `remaining_time_seconds` below `0`.
- Mobile in-exam notification banner must never block exam navigation buttons and must be dismissible or auto-dismiss smoothly after 6 seconds.
- Multi-student isolation: Targeted proctor actions must only be received and rendered by the intended student's session.

## Review Focus
1. **Socket deduplication:** Verify that sending `+10m` time adjustment only extends the student's timer by exactly 10 minutes on mobile (previously received twice, resulting in 20 minutes).
2. **Auto-submit on manual penalty:** If a proctor adds `+1` strike and total strikes reach the exam's `warning_limit` with `auto_submit_enabled`, verify the session auto-submits immediately.
3. **Timer clamp underflow:** If a student has 3 minutes left and proctor reduces by `-5m`, remaining time must clamp to `0` without causing negative numbers or crashes.
4. **Short-answer casing evaluation:** If `case_sensitive: false`, student answer "Nusantara" matches key "nusantara". If `case_sensitive: true`, student answer "nusantara" fails key "Nusantara".
5. **Mobile lifecycle safety:** Ensure incoming banners while exam is submitting or during danger overlays do not cause state errors or overlaps.

---

### Task 1: Update Shared Enums & Schemas

**Files:**
- Modify: `packages/shared/src/enums/index.ts:75-95`
- Modify: `packages/shared/src/schemas/question.schema.ts:10-60`
- Test: `packages/shared/test/question.schema.spec.ts` (or add new tests)

**Interfaces:**
- Consumes: Existing `SocketEvent` enum and `createQuestionSchema`
- Produces:
  - `SocketEvent.SESSION_WARNINGS_ADJUSTED = 'session.warnings_adjusted'`
  - `case_sensitive?: boolean` in `CreateQuestionInput` & `UpdateQuestionInput`

- [ ] **Step 1: Write test for question schema with `case_sensitive`**

In `packages/shared/src/schemas/__tests__/question.schema.spec.ts` (or update existing test):
```typescript
it('should accept optional case_sensitive boolean flag for short-answer questions', () => {
  const validData = {
    question_bank_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    type: 'SHORT_ANSWER',
    content: 'Apa ibukota Indonesia?',
    difficulty: 'MEDIUM',
    case_sensitive: true,
    options: [{ content: 'Nusantara', is_correct: true }],
  };
  const parsed = createQuestionSchema.parse(validData);
  expect(parsed.case_sensitive).toBe(true);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @secure-cbt/shared test`
Expected: FAIL (property `case_sensitive` unrecognized or not typed).

- [ ] **Step 3: Update `SocketEvent` and `question.schema.ts`**

In `packages/shared/src/enums/index.ts`:
Add `SESSION_WARNINGS_ADJUSTED = 'session.warnings_adjusted'` under `SocketEvent`.

In `packages/shared/src/schemas/question.schema.ts`:
Add `case_sensitive: z.boolean().default(false).optional()` to `createQuestionSchema` and `updateQuestionSchema`.

- [ ] **Step 4: Run tests & build shared package**

Run: `pnpm --filter @secure-cbt/shared build && pnpm --filter @secure-cbt/shared test`
Expected: PASS and build successful.

- [ ] **Step 5: Commit**

```bash
git add packages/shared/src/enums/index.ts packages/shared/src/schemas/question.schema.ts
git commit -m "feat(shared): add SESSION_WARNINGS_ADJUSTED event and case_sensitive question field"
```

---

### Task 2: Database Schema & Migration for `case_sensitive`

**Files:**
- Modify: `apps/backend/prisma/schema.prisma:245-265`
- Create: Prisma migration `apps/backend/prisma/migrations/20261030000000_add_question_case_sensitive/migration.sql`

**Interfaces:**
- Consumes: Prisma schema `Question` model
- Produces: `Question.case_sensitive: Boolean @default(false)` in PostgreSQL database

- [ ] **Step 1: Update `Question` model in `apps/backend/prisma/schema.prisma`**

Add `case_sensitive Boolean @default(false)` to `model Question`.

- [ ] **Step 2: Run Prisma generate & migration**

Run: `pnpm --filter backend prisma generate`
Run: `pnpm --filter backend prisma migrate dev --name add_question_case_sensitive` (or deploy on container/database)

- [ ] **Step 3: Verify Prisma Client types**

Verify that `Prisma.QuestionCreateInput` includes `case_sensitive?: boolean`.

- [ ] **Step 4: Commit**

```bash
git add apps/backend/prisma/schema.prisma apps/backend/prisma/migrations/
git commit -m "feat(backend): add case_sensitive column to questions table"
```

---

### Task 3: Backend Socket Deduplication, Time Adjustment & Warning Adjustment

**Files:**
- Modify: `apps/backend/src/modules/monitoring/monitoring.gateway.ts:230-261`
- Modify: `apps/backend/src/modules/session/session.service.ts:670-795`
- Modify: `apps/backend/src/modules/session/session.controller.ts:75-95`
- Modify: `apps/backend/src/modules/monitoring/monitoring.listener.ts:80-120`
- Test: `apps/backend/src/modules/session/__tests__/session.service.spec.ts`

**Interfaces:**
- Consumes: `SessionService`, `MonitoringGateway`, `SocketEvent`
- Produces:
  - `SessionService.adjustWarnings(sessionId, delta, proctorUserId, userRole)`
  - `SessionService.extendTime(sessionId, additionalMinutes, proctorUserId, userRole)` supporting negative minutes
  - `POST /api/v1/sessions/:id/adjust-warnings`
  - Fixed `notifyStudentAction` without duplicate socket emits

- [ ] **Step 1: Write failing tests for warning adjustment and time reduction**

In `apps/backend/src/modules/session/__tests__/session.service.spec.ts`:
- Test that `extendTime` with `-5` reduces remaining seconds by 300, logs `TIME_REDUCED`, and clamps at 0.
- Test that `adjustWarnings` with `+1` increments warning_count and logs `WARNING_ADDED`.
- Test that `adjustWarnings` with `-1` decrements warning_count and clamps at 0.
- Test that `adjustWarnings` auto-submits when reaching `warning_limit`.

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm --filter backend test apps/backend/src/modules/session/__tests__/session.service.spec.ts`
Expected: FAIL (`adjustWarnings` is not a function; `extendTime` rejects negative numbers).

- [ ] **Step 3: Fix socket duplication in `MonitoringGateway`**

In `apps/backend/src/modules/monitoring/monitoring.gateway.ts`:
```typescript
notifyStudentAction(studentUserId: string, examId: string, event: string, payload: any): void {
  const actionPayload = { studentUserId, ...payload };
  // Only emit to room student:${studentUserId} (which contains the active socket)
  // and proctor room exam:${examId}:proctors. Do NOT emit directly to socketId to prevent double delivery!
  this.server.to(`student:${studentUserId}`).emit(event, actionPayload);
  this.server.to(`exam:${examId}:proctors`).emit(event, actionPayload);
}
```
Also fix `broadcastToExam` when `studentUserId` is targeted so it only emits to `student:${payload.studentUserId}` and `exam:${examId}:proctors`.

- [ ] **Step 4: Implement `adjustWarnings` & update `extendTime` in `SessionService`**

In `apps/backend/src/modules/session/session.service.ts`:
- In `extendTime`: Allow `additionalMinutes < 0` (require `additionalMinutes !== 0`).
  - Calculate `const newRemaining = Math.max(0, currentRemaining + additionalSeconds);`
  - If `additionalMinutes > 0`: `event: 'TIME_EXTENDED'`, description: `Waktu ujian ditambah ${additionalMinutes} menit oleh pengawas (${proctorName})`.
  - If `additionalMinutes < 0`: `event: 'TIME_REDUCED'`, description: `Waktu ujian dikurangi ${Math.abs(additionalMinutes)} menit oleh pengawas (${proctorName})`.
- Implement `adjustWarnings(sessionId: string, delta: number, proctorUserId: string, userRole?: string)`:
  - Find session, check status, check teacher scope.
  - Calculate `const newWarningCount = Math.max(0, session.warning_count + delta);`
  - Update session in transaction, create log (`WARNING_ADDED` or `WARNING_REDUCED`).
  - Check auto-submit condition if `delta > 0 && newWarningCount >= warningLimit && warningLimit > 0 && auto_submit_enabled`.
  - Emit `SocketEvent.SESSION_WARNINGS_ADJUSTED`.

In `apps/backend/src/modules/monitoring/monitoring.listener.ts`:
- Handle `SocketEvent.SESSION_WARNINGS_ADJUSTED` and call `this.gateway.notifyStudentAction`.

In `apps/backend/src/modules/session/session.controller.ts`:
- Add `@Post(':id/adjust-warnings')` endpoint calling `sessionService.adjustWarnings`.

- [ ] **Step 5: Run tests to verify they pass**

Run: `pnpm --filter backend test apps/backend/src/modules/session/__tests__/session.service.spec.ts`
Expected: PASS (all tests pass).

- [ ] **Step 6: Commit**

```bash
git add apps/backend/src/modules/session/ apps/backend/src/modules/monitoring/
git commit -m "feat(backend): fix socket double dispatch, add adjustWarnings and two-way time adjustments"
```

---

### Task 4: Short-Answer Case-Sensitivity in Grading Service

**Files:**
- Modify: `apps/backend/src/modules/grading/grading.service.ts:200-210`
- Test: `apps/backend/src/modules/grading/__tests__/grading.service.spec.ts`

**Interfaces:**
- Consumes: `Question.case_sensitive`
- Produces: Accurate case-sensitive or case-insensitive matching for `SHORT_ANSWER`

- [ ] **Step 1: Write test for case-sensitive vs case-insensitive short answers**

In `apps/backend/src/modules/grading/__tests__/grading.service.spec.ts`:
```typescript
it('should respect case_sensitive = true on SHORT_ANSWER questions', async () => {
  // test Nusantara with student answer nusantara => score: 0
  // test Nusantara with student answer Nusantara => score: 100
});
it('should default to case-insensitive when case_sensitive is false or null', async () => {
  // test Nusantara with student answer nusantara => score: 100
});
```

- [ ] **Step 2: Run test to verify behavior**

Run: `pnpm --filter backend test apps/backend/src/modules/grading/__tests__/grading.service.spec.ts`

- [ ] **Step 3: Implement case logic in `GradingService.gradeAnswers`**

In `apps/backend/src/modules/grading/grading.service.ts`:
```typescript
if (answer.question.type === QuestionType.SHORT_ANSWER) {
  const qOptions = await tx.questionOption.findMany({
    where: { question_id: answer.question_id },
  });
  const isCaseSensitive = Boolean((answer.question as any).case_sensitive);
  const rawStudent = (answer.answer_text || '').trim();
  const normalizedStudent = isCaseSensitive ? rawStudent : rawStudent.toLowerCase();

  isCorrect =
    normalizedStudent.length > 0 &&
    qOptions.some((opt) => {
      const rawKey = (opt.content || '').trim();
      const normalizedKey = isCaseSensitive ? rawKey : rawKey.toLowerCase();
      return normalizedKey === normalizedStudent;
    });
  score = isCorrect ? 100 : 0;
}
```

- [ ] **Step 4: Run grading service tests**

Run: `pnpm --filter backend test apps/backend/src/modules/grading/__tests__/grading.service.spec.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/backend/src/modules/grading/
git commit -m "feat(grading): support case_sensitive option for SHORT_ANSWER questions"
```

---

### Task 5: Question Studio Case-Insensitive Checkbox in Dashboard

**Files:**
- Modify: `apps/dashboard/src/components/questions/question-studio.tsx`
- Test: `apps/dashboard/src/components/questions/__tests__/question-studio.spec.tsx` (if present)

**Interfaces:**
- Consumes: Question form state, `case_sensitive` boolean
- Produces: User toggle in Question Studio for short-answer questions

- [ ] **Step 1: Check existing QuestionStudio state for question options and metadata**

Read `apps/dashboard/src/components/questions/question-studio.tsx` around short-answer section.

- [ ] **Step 2: Add `case_sensitive` state and checkbox to QuestionStudio**

- Initialize `caseSensitive: boolean` in state (default `false`).
- In short-answer section, render checkbox:
  - Checkbox: "Abaikan huruf besar / kecil (Accept all cases)"
  - Checked when `!caseSensitive` (default checked).
  - When toggled, update `caseSensitive = !checked`.
  - Explanatory subtitle clarifying behavior.
- Ensure `case_sensitive` is included in payload to `createQuestion` and `updateQuestion`.

- [ ] **Step 3: Verify dashboard build & typecheck**

Run: `pnpm --filter dashboard build`
Expected: Zero TypeScript errors.

- [ ] **Step 4: Commit**

```bash
git add apps/dashboard/src/components/questions/question-studio.tsx
git commit -m "feat(dashboard): add accept all cases checkbox for short-answer questions in Question Studio"
```

---

### Task 6: Proctor Control Modal (`StudentActionDialog`) in Dashboard

**Files:**
- Modify: `apps/dashboard/src/components/monitoring/student-action-dialog.tsx`
- Modify: `apps/dashboard/src/lib/api.ts` (add `adjustWarnings` API function if needed)
- Test: `apps/dashboard/src/components/monitoring/__tests__/student-action-dialog.spec.tsx`

**Interfaces:**
- Consumes: `ActionStudentSession`, `sessionApi`
- Produces:
  - Strike stepper buttons: `-1 Strike`, `+1 Strike`, `Reset 0`
  - Two-way time adjustment: `+ Tambah Waktu` (`+5m`, `+10m`, `+15m`, `+30m`) and `- Kurangi Waktu` (`-5m`, `-10m`, `-15m`, `-30m`)

- [ ] **Step 1: Update API client in `apps/dashboard/src/lib/api.ts`**

Add `adjustWarnings(sessionId: string, delta: number)`:
```typescript
adjustWarnings: (sessionId: string, delta: number) =>
  api.post(`/sessions/${sessionId}/adjust-warnings`, { delta }).then((r) => r.data),
```

- [ ] **Step 2: Update `StudentActionDialog` UI & handlers**

In `apps/dashboard/src/components/monitoring/student-action-dialog.tsx`:
- Add handler `handleAdjustWarnings(delta: number)`.
- Render strike panel with:
  - Current warning strike count (e.g. `2 / 3`).
  - Strike indicators (visual pill / dot status).
  - Button `Kurangi Strike (-1)` with confirmation toast.
  - Button `Tambah Strike (+1)` with alert that reaching limit triggers auto-submit.
  - Button `Reset 0`.
- Render time adjustment panel with:
  - Row 1: `+ Tambah Waktu` chips (`+5m`, `+10m`, `+15m`, `+30m`).
  - Row 2: `- Kurangi Waktu` chips (`-5m`, `-10m`, `-15m`, `-30m`).

- [ ] **Step 3: Verify dashboard tests and typecheck**

Run: `pnpm --filter dashboard test` and `pnpm --filter dashboard build`
Expected: PASS with zero errors.

- [ ] **Step 4: Commit**

```bash
git add apps/dashboard/src/components/monitoring/student-action-dialog.tsx apps/dashboard/src/lib/api.ts
git commit -m "feat(dashboard): add strike controls (+1, -1, reset) and +/- time adjustments to StudentActionDialog"
```

---

### Task 7: Mobile CBT Unified In-Exam Notification Banner System

**Files:**
- Create: `apps/mobile/lib/features/exam/presentation/widgets/exam_notification_banner.dart`
- Modify: `apps/mobile/lib/features/exam/presentation/screens/exam_screen.dart`
- Modify: `apps/mobile/lib/core/network/socket_client.dart`
- Modify: `apps/mobile/lib/features/exam/providers/exam_notifier.dart`
- Test: `apps/mobile/test/features/exam/presentation/widgets/exam_notification_banner_test.dart`

**Interfaces:**
- Consumes: Socket events (`exam.broadcast`, `session.time_extended`, `session.warnings_reset`, `session.warnings_adjusted`, `session.unlocked`)
- Produces:
  - `ExamNotificationBanner` supporting 8 visual themes with auto-dismiss and close action.
  - Complete replacement of standard snackbars during live exam.

- [ ] **Step 1: Write test for `ExamNotificationBanner`**

In `apps/mobile/test/features/exam/presentation/widgets/exam_notification_banner_test.dart`:
- Test rendering with different banner types (`timeAdded`, `timeReduced`, `strikePenalty`, `strikeMercy`, `strikeReset`, `deviceUnlocked`, `personalMessage`, `roomBroadcast`).
- Test tap on dismiss callback.

- [ ] **Step 2: Run test to verify it fails**

Run: `flutter test test/features/exam/presentation/widgets/exam_notification_banner_test.dart`
Expected: FAIL (widget does not exist yet).

- [ ] **Step 3: Create `ExamNotificationBanner`**

Implement `ExamNotificationBanner` in `apps/mobile/lib/features/exam/presentation/widgets/exam_notification_banner.dart`:
- Slide-down and fade animation.
- Visual token palettes matching the approved design catalog:
  - `timeAdded`: Emerald (#064E3B bg, #34D399 border, #34D399 icon, KOMPENSASI badge).
  - `timeReduced`: Amber (#78350F bg, #F59E0B border, #FBBF24 icon, PENALTI badge).
  - `strikeMercy`: Sky/Blue (#1E3A8A bg, #60A5FA border, #93C5FD icon, -1 STRIKE badge).
  - `strikePenalty`: Rose/Crimson (#881337 bg, #FB7185 border, #FDA4AF icon, +1 STRIKE badge).
  - `strikeReset`: Teal (#134E4A bg, #2DD4BF border, #5EEAD4 icon, 0 STRIKE badge).
  - `deviceUnlocked`: Cyan (#0E7490 bg, #38BDF8 border, #7DD3FC icon, PULIH badge).
  - `personalMessage`: Navy/Azure (#0F172A bg, #38BDF8 border, #38BDF8 icon, PRIBADI badge).
  - `roomBroadcast`: Crimson (#4C0519 bg, #FB7185 border, #FB7185 icon, SEMUA SISWA badge).
- Auto-dismiss timer (6 seconds).
- Explicit close button (`Icons.close`).

- [ ] **Step 4: Update `SocketClient`, `ExamNotifier`, and `exam_screen.dart`**

In `apps/mobile/lib/core/network/socket_client.dart`:
- Add `setOnWarningsAdjusted(void Function(Map<String, dynamic> data)? callback)`.
- Add `setOnSessionUnlocked(void Function(Map<String, dynamic> data)? callback)`.

In `apps/mobile/lib/features/exam/providers/exam_notifier.dart`:
- Add `setWarningCount(int count)` method to update strike count when proctor adjusts strikes.
- Ensure `extendTime(int additionalSeconds)` clamps to `remainingSeconds >= 0`.

In `apps/mobile/lib/features/exam/presentation/screens/exam_screen.dart`:
- Replace all `ScaffoldMessenger.of(context).showSnackBar` calls in live exam with `_showNotificationBanner(type, title, message, badge)`.
- Subscribe to `socket.setOnWarningsAdjusted`:
  - Update `notifier.setWarningCount(newCount)`.
  - Display `strikePenalty` banner (if `delta > 0`) or `strikeMercy` banner (if `delta < 0`).
- Subscribe to `socket.setOnSessionUnlocked`:
  - Display `deviceUnlocked` banner.
- Update `socket.setOnTimeExtended`:
  - If `additionalSeconds > 0`: update timer + show `timeAdded` banner.
  - If `additionalSeconds < 0`: update timer + show `timeReduced` banner.
- Update `socket.setOnWarningsReset`:
  - Update `notifier.resetWarnings()` + show `strikeReset` banner.
- Update `socket.setOnBroadcast`:
  - If personal: show `personalMessage` banner.
  - If room: show `roomBroadcast` banner.

- [ ] **Step 5: Run mobile tests and flutter analyze**

Run: `flutter test` and `flutter analyze lib/ test/`
Expected: 0 errors, 0 warnings.

- [ ] **Step 6: Commit**

```bash
git add apps/mobile/lib/ apps/mobile/test/
git commit -m "feat(mobile): add unified in-exam notification banner system and wire all proctor events"
```

---

### Task 8: Comprehensive End-to-End Verification

**Files:**
- Entire monorepo

- [ ] **Step 1: Run backend tests**

Run: `pnpm --filter backend test`
Expected: 100% pass across all test suites.

- [ ] **Step 2: Run dashboard tests & build**

Run: `pnpm --filter dashboard test`
Run: `pnpm --filter dashboard build`
Expected: 100% pass, zero build errors.

- [ ] **Step 3: Run mobile analyzer & test suite**

Run: `flutter analyze lib/ test/` in `apps/mobile`
Run: `flutter test` in `apps/mobile`
Expected: 0 issues, 100% test pass.

- [ ] **Step 4: Update PROGRESS.md to document Phase 35 features**

Update `PROGRESS.md` documenting Phase 35 (Proctor Mission Control Controls, Strike Management, Unified In-Exam Banners, and Short-Answer Case Flexibility).

- [ ] **Step 5: Commit**

```bash
git add PROGRESS.md
git commit -m "docs: document Phase 35 completion in PROGRESS.md"
```
