# Session Persistence and App Exit Deterrence Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ensure exam sessions persist all answers and paused remaining time across app minimize, backgrounding, and termination, while penalizing app exits with an immediate warning increment and triggering auto-submit if warning limits are reached.

**Architecture:** 
1. `@secure-cbt/shared`: Extend `saveAnswerSchema` with optional `remaining_time_seconds` and define `syncTimeSchema` and `resumeSessionSchema`.
2. `apps/backend`:
   - Update `AnswerService.save` and `SessionService.syncTime` to persist countdown timer state in real time.
   - Update `SessionService.resume` to return all existing saved answers (`{ [questionId]: answerText }`), preserve paused `remaining_time_seconds`, detect `resumed_from_exit`, increment `warning_count` with `APP_EXITED` log & proctor socket alert, and flag `auto_submit_required` if warning limits are met.
3. `apps/mobile`:
   - Extend Drift SQLite `LocalDatabase` with `getAllAnswers(sessionId)`.
   - Update `ExamNotifier.loadSession` to populate restored answers, warnings, and handle `auto_submit_required`.
   - Update `ExamViolationHandler` and `ExamNotifier` to sync remaining time on pause and autosave.
   - Update `exam_screen.dart` to merge local SQLite and backend answers on re-entry.

**Tech Stack:** NestJS, Prisma, PostgreSQL, Socket.io, Flutter (Dart 3 / Riverpod 2), Drift SQLite, Dio.

**Spec:** System requirement discussion on session state persistence, timer pause on exit, and exit deterrence penalties.

## Global Constraints

- Monorepo package manager: `pnpm`.
- All backend Vitest suites must pass: `pnpm --filter @secure-cbt/backend test`.
- All mobile Flutter tests must pass: `flutter test` in `apps/mobile`.
- Typescript check: `pnpm -r run typecheck`.
- Anti-cheating deterrence: `APP_EXITED` event must be emitted to `exam:${examId}` socket room and persisted in `session_logs`.

## Review Focus

1. **Answer integrity on resume**: Returning to an exam with 30 answers must display all 30 answers in palette and cards without blanking.
2. **Timer pause vs wall-clock**: Exiting for 10 minutes must not reset timer to 60:00 or deduct 10 minutes — it must resume from the paused seconds.
3. **Exit penalty increment**: If warnings were 4/5 and app exited, re-entry must make it 5/5, alert proctor, and immediately trigger auto-submit transition.
4. **Offline local answer preservation**: Answers saved in Drift SQLite that failed network sync prior to exit must not be lost or overwritten by older server state.
5. **Normal in-exam minimize**: Minimizing without closing the app must not trigger `resumed_from_exit`, but must trigger the existing `APP_MINIMIZED` violation overlay.

---

### Task 1: Shared Schemas for Time Sync & Resume Input

**Files:**
- Modify: `packages/shared/src/schemas/answer.schema.ts`
- Modify: `packages/shared/src/schemas/session.schema.ts`
- Modify: `packages/shared/src/index.ts`
- Test: `packages/shared/src/__tests__/schemas.spec.ts` (or backend schema tests)

**Interfaces:**
- Produces:
  - `saveAnswerSchema`: includes `remaining_time_seconds?: z.number().int().min(0).optional()`
  - `syncTimeSchema = z.object({ session_id: z.string().uuid(), remaining_time_seconds: z.number().int().min(0) })`
  - `resumeSessionSchema = z.object({ session_id: z.string().uuid(), resumed_from_exit: z.boolean().optional() })`

- [ ] **Step 1: Update `packages/shared/src/schemas/answer.schema.ts`**
  Add `remaining_time_seconds: z.number().int().min(0).optional()` to `saveAnswerSchema`.

- [ ] **Step 2: Update `packages/shared/src/schemas/session.schema.ts`**
  Add `syncTimeSchema` and `resumeSessionSchema` with exported TypeScript types `SyncTimeInput` and `ResumeSessionInput`.

- [ ] **Step 3: Export from `packages/shared/src/index.ts` and verify build**
  Run: `pnpm --filter @secure-cbt/shared build`
  Expected: Clean build with new schema exports.

- [ ] **Step 4: Commit shared changes**
  ```bash
  git add packages/shared/src/
  git commit -m "feat(shared): add time sync and resume session schemas"
  ```

---

### Task 2: Backend Answer Service Time Persistence

**Files:**
- Modify: `apps/backend/src/modules/answer/answer.service.ts`
- Test: `apps/backend/src/modules/answer/__tests__/answer.service.spec.ts`

**Interfaces:**
- Consumes: `SaveAnswerInput` from `@secure-cbt/shared`
- Produces: `AnswerService.save` updates `examSession.remaining_time_seconds` when provided.

- [ ] **Step 1: Write failing test in `answer.service.spec.ts`**
  Test that `AnswerService.save` updates `examSession.remaining_time_seconds` if present in DTO.

- [ ] **Step 2: Run test to verify it fails**
  Run: `pnpm --filter @secure-cbt/backend test src/modules/answer/__tests__/answer.service.spec.ts`
  Expected: FAIL (missing remaining_time_seconds handling).

- [ ] **Step 3: Implement `remaining_time_seconds` update in `answer.service.ts`**
  If `dto.remaining_time_seconds !== undefined`, call `tx.examSession.update({ where: { id: session_id }, data: { remaining_time_seconds: dto.remaining_time_seconds } })`.

- [ ] **Step 4: Run test to verify it passes**
  Run: `pnpm --filter @secure-cbt/backend test src/modules/answer/__tests__/answer.service.spec.ts`
  Expected: PASS.

- [ ] **Step 5: Commit answer service changes**
  ```bash
  git add apps/backend/src/modules/answer/
  git commit -m "feat(backend): persist remaining_time_seconds during answer save"
  ```

---

### Task 3: Backend Session Service Time Sync & Resume Answers/Exit Deterrence

**Files:**
- Modify: `apps/backend/src/modules/session/session.service.ts`
- Modify: `apps/backend/src/modules/session/session.controller.ts`
- Test: `apps/backend/src/modules/session/__tests__/session.service.spec.ts`

**Interfaces:**
- Consumes: `ResumeSessionInput` and `SyncTimeInput`
- Produces:
  - `POST /sessions/sync-time`: updates `examSession.remaining_time_seconds`.
  - `SessionService.resume`:
    - Queries `answers: { select: { question_id: true, answer_text: true } }`.
    - Returns `answers: Record<string, string>`.
    - Returns paused `remaining_time_seconds`.
    - If `resumed_from_exit: true`:
      - Increments `warning_count` by 1.
      - Logs `WARNING_TRIGGERED:APP_EXITED` in `session_logs`.
      - Emits `WARNING_TRIGGERED` to `exam:${examId}` socket room.
      - Flags `auto_submit_required: newWarningCount >= exam.warning_limit`.

- [ ] **Step 1: Write failing tests in `session.service.spec.ts`**
  - Test 1: `resume()` returns existing answers map `{ [question_id]: answer_text }`.
  - Test 2: `resume()` with `resumed_from_exit: true` increments `warning_count`, logs `APP_EXITED`, and sets `auto_submit_required: true` when limit reached.
  - Test 3: `syncTime()` updates session `remaining_time_seconds`.

- [ ] **Step 2: Run tests to verify they fail**
  Run: `pnpm --filter @secure-cbt/backend test src/modules/session/__tests__/session.service.spec.ts`
  Expected: FAIL on new test assertions.

- [ ] **Step 3: Implement `syncTime()` and enhanced `resume()` in `session.service.ts` and `session.controller.ts`**
  Include `answers` in `findUnique`, handle `resumed_from_exit`, emit events, and wire controller endpoint.

- [ ] **Step 4: Run backend tests to verify they pass**
  Run: `pnpm --filter @secure-cbt/backend test src/modules/session/__tests__/session.service.spec.ts`
  Expected: PASS all tests.

- [ ] **Step 5: Commit backend session changes**
  ```bash
  git add apps/backend/src/modules/session/
  git commit -m "feat(backend): restore answers, handle paused time and exit deterrence on resume"
  ```

---

### Task 4: Mobile Local Database All Answers Recovery

**Files:**
- Modify: `apps/mobile/lib/core/database/local_database.dart`
- Test: `apps/mobile/test/core/database/local_database_test.dart`

**Interfaces:**
- Produces: `Future<Map<String, String>> getAllAnswers(String sessionId)` in `LocalDatabase`.

- [ ] **Step 1: Write failing test in `apps/mobile/test/core/database/local_database_test.dart`**
  Test inserting multiple `LocalAnswers` (some synced, some pending) and asserting `getAllAnswers(sessionId)` returns all question-answer pairs as a map.

- [ ] **Step 2: Run test to verify it fails**
  Run: `flutter test test/core/database/local_database_test.dart` in `apps/mobile`
  Expected: FAIL (`getAllAnswers` not defined).

- [ ] **Step 3: Implement `getAllAnswers` in `LocalDatabase`**
  ```dart
  Future<Map<String, String>> getAllAnswers(String sessionId) async {
    final rows = await (select(localAnswers)..where((t) => t.sessionId.equals(sessionId))).get();
    return {for (final r in rows) r.questionId: r.answerText ?? ''};
  }
  ```

- [ ] **Step 4: Run test to verify it passes**
  Run: `flutter test test/core/database/local_database_test.dart` in `apps/mobile`
  Expected: PASS.

- [ ] **Step 5: Commit local database changes**
  ```bash
  git add apps/mobile/lib/core/database/ apps/mobile/test/core/database/
  git commit -m "feat(mobile): add getAllAnswers to local database"
  ```

---

### Task 5: Mobile Exam Notifier Session Restoration & Time Syncing

**Files:**
- Modify: `apps/mobile/lib/features/exam/providers/exam_notifier.dart`
- Modify: `apps/mobile/lib/features/exam/providers/exam_state.dart`
- Test: `apps/mobile/test/features/exam/exam_notifier_test.dart`

**Interfaces:**
- Consumes: `LocalDatabase.getAllAnswers`, backend time sync and answer save.
- Produces:
  - `loadSession(..., {Map<String, String> initialAnswers, int warningCount, bool autoSubmitImmediately})`.
  - `syncRemainingTime()`.
  - `saveAnswer` passes `remaining_time_seconds: state.remainingSeconds`.
  - `_startAutosave` syncs remaining time periodically.

- [ ] **Step 1: Write failing tests in `apps/mobile/test/features/exam/exam_notifier_test.dart`**
  - Verify `loadSession` preserves `initialAnswers` and `warningCount`.
  - Verify `autoSubmitImmediately: true` triggers `_onForceSubmit`.
  - Verify `syncRemainingTime` posts remaining time to server.

- [ ] **Step 2: Run test to verify it fails**
  Run: `flutter test test/features/exam/exam_notifier_test.dart` in `apps/mobile`
  Expected: FAIL.

- [ ] **Step 3: Implement updates in `exam_notifier.dart` and `exam_state.dart`**
  Populate initial answers and warning count, implement `syncRemainingTime`, and add remaining seconds to `saveAnswer` payload.

- [ ] **Step 4: Run test to verify it passes**
  Run: `flutter test test/features/exam/exam_notifier_test.dart` in `apps/mobile`
  Expected: PASS.

- [ ] **Step 5: Commit notifier changes**
  ```bash
  git add apps/mobile/lib/features/exam/providers/ apps/mobile/test/features/exam/
  git commit -m "feat(mobile): preserve answers, warnings and sync remaining time in exam notifier"
  ```

---

### Task 6: Mobile Screen & Violation Handler Exit Deterrence Wiring

**Files:**
- Modify: `apps/mobile/lib/features/exam/presentation/screens/exam_screen.dart`
- Modify: `apps/mobile/lib/features/exam/presentation/handlers/exam_violation_handler.dart`
- Test: `apps/mobile/test/features/exam/exam_screen_test.dart`

**Interfaces:**
- Wires:
  - `_loadSessionData()` passes `resumed_from_exit: true` when returning from app launch/navigation.
  - Queries `_db.getAllAnswers(widget.sessionId)` and merges with backend `session['answers']`.
  - Loads merged answers and warning count into notifier.
  - Triggers warning overlay for `APP_EXITED` and auto-submits if limit reached.
  - `ExamViolationHandler.handleLifecycleChange(paused)` calls `notifier.syncRemainingTime()`.

- [ ] **Step 1: Write widget/integration test in `apps/mobile/test/features/exam/exam_screen_test.dart`**
  Test that `_loadSessionData()` merges local and remote answers and populates state.

- [ ] **Step 2: Run test to verify it fails**
  Run: `flutter test test/features/exam/exam_screen_test.dart` in `apps/mobile`
  Expected: FAIL.

- [ ] **Step 3: Implement lifecycle sync and answer merge in `exam_screen.dart` and `exam_violation_handler.dart`**
  Implement answer merging and wire `resumed_from_exit` parameter.

- [ ] **Step 4: Run test to verify it passes**
  Run: `flutter test test/features/exam/exam_screen_test.dart` in `apps/mobile`
  Expected: PASS.

- [ ] **Step 5: Commit screen & handler changes**
  ```bash
  git add apps/mobile/lib/features/exam/presentation/ apps/mobile/test/features/exam/
  git commit -m "feat(mobile): wire exit deterrence, answer merge and lifecycle time sync"
  ```

---

### Task 7: Full Monorepo Verification & E2E Validation

**Files:**
- All affected packages.

- [ ] **Step 1: Run full backend test suite**
  Run: `pnpm --filter @secure-cbt/backend test`
  Expected: 18+ test files passed, 0 failures.

- [ ] **Step 2: Run full mobile test suite**
  Run: `flutter test` in `apps/mobile`
  Expected: All tests pass, 0 failures.

- [ ] **Step 3: Run full typecheck and lint across monorepo**
  Run: `pnpm -r run typecheck`
  Expected: 0 errors.

- [ ] **Step 4: Update PROGRESS.md with Phase 33 documentation**
  Document session persistence, paused time retention, and exit deterrence features.

- [ ] **Step 5: Final release commit**
  ```bash
  git add PROGRESS.md
  git commit -m "chore: document Phase 33 session persistence and exit deterrence"
  ```
