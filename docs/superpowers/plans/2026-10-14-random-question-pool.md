# Random Question Pool Sub-sampling & Point Weighting Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement automated random question pool sub-sampling (Balanced stratified & Pure Random) with custom difficulty point weighting and dual-score reporting across Assessia CBT.

**Architecture:** Extend Prisma `Exam` and `Score` entities, implement stratified sampling with largest-remainder rounding in NestJS `SessionService.startSession()`, implement weighted scoring and normalization in `GradingService.calculateTotalScore()`, and integrate the UI in Next.js Dashboard and Flutter Mobile.

**Tech Stack:** NestJS, Prisma ORM, PostgreSQL, Vitest, Zod, Next.js 14, Tailwind CSS, Flutter 3.44 (Riverpod).

**Spec:** `docs/superpowers/specs/2026-10-14-random-question-pool-design.md`

## Global Constraints
- Database column names follow snake_case (`is_random_pool`, `pool_question_count`, `pool_mode`, `points_easy`, `points_medium`, `points_hard`, `raw_points_earned`, `raw_points_possible`).
- Default point weights: Easy = 1, Medium = 2, Hard = 3.
- Final normalized score must always be constrained between 0.00 and 100.00.
- All session draws must be deterministic and persisted to `ExamSession.question_order`.
- Existing non-pooled exams must continue to operate with 100% backward compatibility.

## Review Focus
1. When candidate question count is smaller than `pool_question_count`, the system must gracefully draw all available questions without crashing.
2. In `BALANCED` mode, if a difficulty tier has 0 questions in the bank, the quota for that tier must be 0 and its weight redistributed to other tiers.
3. When `points_easy`, `points_medium`, or `points_hard` sum up to non-100 values (e.g. 54 or 120), the normalized score must correctly scale to 100.
4. When a student resumes an active session or an exam has multiple packages, their previously drawn question subset must never change.
5. In Flutter mobile, if raw score fields are absent in legacy sessions, it must default gracefully to `score / total_questions`.

---

### Task 1: Prisma Schema & Shared Contracts

**Files:**
- Modify: `apps/backend/prisma/schema.prisma`
- Modify: `packages/shared/src/schemas/exam.schema.ts`
- Modify: `packages/shared/src/schemas/score.schema.ts` (if present) or `session.schema.ts`
- Migration: `apps/backend/prisma/migrations/20261014000000_add_random_pool_and_point_weights/migration.sql`

**Interfaces:**
- Produces:
  - `PoolMode`: `'BALANCED' | 'PURE_RANDOM'`
  - `Exam`: `is_random_pool: boolean`, `pool_question_count: number | null`, `pool_mode: PoolMode`, `points_easy: number`, `points_medium: number`, `points_hard: number`
  - `Score`: `raw_points_earned: number`, `raw_points_possible: number`

- [ ] **Step 1: Write test for shared exam schema validation**
  In `packages/shared/src/__tests__/exam.schema.spec.ts`, test that `createExamSchema` parses valid pool fields and rejects negative question counts.

- [ ] **Step 2: Run test to verify it fails**
  Run: `pnpm --filter @secure-cbt/shared test`
  Expected: FAIL with missing fields or schema failure.

- [ ] **Step 3: Update schema.prisma and shared schemas**
  Add `PoolMode` enum and columns to `Exam` and `Score` in `schema.prisma`.
  Update `createExamSchema` and `updateExamSchema` in `packages/shared/src/schemas/exam.schema.ts`.
  Run `pnpm --filter backend exec prisma generate`.

- [ ] **Step 4: Run shared tests & typecheck**
  Run: `pnpm --filter @secure-cbt/shared test && pnpm --filter @secure-cbt/shared typecheck`
  Expected: PASS

- [ ] **Step 5: Commit**
  ```bash
  git add packages/shared apps/backend/prisma
  git commit -m "feat(schema): add random pool settings and difficulty point weights"
  ```

---

### Task 2: Stratified Sub-sampling Algorithm in SessionService

**Files:**
- Test: `apps/backend/src/modules/session/__tests__/session-sampler.spec.ts`
- Create: `apps/backend/src/modules/session/session-sampler.ts`
- Modify: `apps/backend/src/modules/session/session.service.ts`

**Interfaces:**
- Produces:
  ```ts
  function sampleQuestionPool(
    questions: Array<{ id: string; difficulty: 'EASY' | 'MEDIUM' | 'HARD'; position: number }>,
    poolCount: number,
    mode: 'BALANCED' | 'PURE_RANDOM'
  ): string[]
  ```

- [ ] **Step 1: Write failing unit test for `sampleQuestionPool`**
  In `apps/backend/src/modules/session/__tests__/session-sampler.spec.ts`:
  - Test proportional distribution: 60 questions (30 Easy, 20 Medium, 10 Hard) with pool count 30 yields exactly 15 Easy, 10 Medium, 5 Hard.
  - Test largest-remainder handling when proportions do not divide evenly.
  - Test pure random sampling selecting exact count.
  - Test edge case where total available questions < requested pool count.

- [ ] **Step 2: Run test to verify it fails**
  Run: `pnpm --filter backend test session-sampler.spec.ts`
  Expected: FAIL with "sampleQuestionPool is not defined".

- [ ] **Step 3: Implement `sampleQuestionPool` and wire into `SessionService.startSession`**
  Implement the stratified largest-remainder algorithm in `session-sampler.ts`.
  Call `sampleQuestionPool` in `SessionService.startSession()` if `exam.is_random_pool` is enabled before persisting `ExamSession.question_order`.

- [ ] **Step 4: Run unit tests to verify they pass**
  Run: `pnpm --filter backend test session-sampler.spec.ts && pnpm --filter backend test session.service.spec.ts`
  Expected: PASS

- [ ] **Step 5: Commit**
  ```bash
  git add apps/backend/src/modules/session
  git commit -m "feat(session): implement stratified and pure random question pool sampling"
  ```

---

### Task 3: Difficulty Point Weighting & Normalization in GradingService

**Files:**
- Test: `apps/backend/src/modules/grading/__tests__/grading-weighted.spec.ts`
- Modify: `apps/backend/src/modules/grading/grading.service.ts`

**Interfaces:**
- Consumes: `exam.points_easy`, `exam.points_medium`, `exam.points_hard`
- Produces: `Score` with `total_score` (0-100), `raw_points_earned`, `raw_points_possible`

- [ ] **Step 1: Write failing unit test for weighted difficulty scoring**
  In `apps/backend/src/modules/grading/__tests__/grading-weighted.spec.ts`:
  - Test exam with Easy = 1, Medium = 2, Hard = 3 points.
  - A student answering 1 Easy, 1 Medium, and 0 Hard correctly out of 1 Easy, 1 Medium, 1 Hard (total 6 pts possible) gets raw points 3 / 6 and normalized score `50.00`.
  - Test backward compatibility: default weights compute proper normalized percentage.

- [ ] **Step 2: Run test to verify it fails**
  Run: `pnpm --filter backend test grading-weighted.spec.ts`
  Expected: FAIL (missing raw point assertions or incorrect weighting).

- [ ] **Step 3: Update `GradingService.calculateTotalScore`**
  Assign difficulty points from exam configuration to each question answer.
  Calculate `raw_points_earned`, `raw_points_possible`, and scale `total_score = (raw_points_earned / raw_points_possible) * 100`.
  Include `raw_points_earned` and `raw_points_possible` in `Score` upsert and return payloads.

- [ ] **Step 4: Run test to verify it passes**
  Run: `pnpm --filter backend test grading-weighted.spec.ts && pnpm --filter backend test grading.service.spec.ts`
  Expected: PASS

- [ ] **Step 5: Commit**
  ```bash
  git add apps/backend/src/modules/grading
  git commit -m "feat(grading): calculate difficulty-weighted raw points and normalized scores"
  ```

---

### Task 4: Dashboard Exam Creation & Edit Form Integration

**Files:**
- Create: `apps/dashboard/src/components/exams/random-pool-card.tsx`
- Modify: `apps/dashboard/src/app/dashboard/exams/create/page.tsx`
- Modify: `apps/dashboard/src/app/dashboard/exams/[id]/edit/page.tsx`
- Test: `apps/dashboard/src/components/exams/__tests__/random-pool-card.spec.tsx`

**Interfaces:**
- Produces: `RandomPoolCard` component providing:
  - Toggle switch for random pool
  - Pool count input with total bank questions indicator
  - Segmented toggle: Seimbang (BALANCED) vs Acak Murni (PURE_RANDOM)
  - 3 input pills for Mudah, Sedang, Sukar points
  - Real-time total points calculator badge

- [ ] **Step 1: Write failing component test**
  In `apps/dashboard/src/components/exams/__tests__/random-pool-card.spec.tsx`:
  - Test toggle enables inputs.
  - Test point weight inputs update parent form values.
  - Test badge calculates total points correctly.

- [ ] **Step 2: Run test to verify it fails**
  Run: `pnpm --filter dashboard test random-pool-card.spec.tsx`
  Expected: FAIL with component not found.

- [ ] **Step 3: Implement `RandomPoolCard` and wire into Exam form**
  Create `RandomPoolCard` using Shadcn UI tokens, Card, Input, Label, and Switch.
  Embed into `create/page.tsx` and `edit/page.tsx`.

- [ ] **Step 4: Run dashboard tests & typecheck**
  Run: `pnpm --filter dashboard test && pnpm --filter dashboard typecheck`
  Expected: PASS

- [ ] **Step 5: Commit**
  ```bash
  git add apps/dashboard
  git commit -m "feat(dashboard): add random pool sub-sampling and difficulty point settings to exam builder"
  ```

---

### Task 5: Mobile CBT Dual-Score Display

**Files:**
- Modify: `apps/mobile/lib/features/exam/domain/models/exam_score.dart` (or session result model)
- Modify: `apps/mobile/lib/features/exam/presentation/screens/result_screen.dart`
- Modify: `apps/mobile/lib/features/exam/presentation/screens/exam_review_screen.dart`
- Test: `apps/mobile/test/core/widgets/dual_score_result_test.dart`

**Interfaces:**
- Consumes: `raw_points_earned`, `raw_points_possible`, `total_score`
- Renders:
  - Radial score: `85.00`
  - Bento Tile 1: `46 / 54 Poin`
  - Bento Tile 2: `26 / 30 Soal Benar`

- [ ] **Step 1: Write failing widget test for dual-score display**
  In `apps/mobile/test/core/widgets/dual_score_result_test.dart`:
  - Render result card with `total_score: 85.0`, `raw_points_earned: 46`, `raw_points_possible: 54`.
  - Expect text `46 / 54 Poin` and `85.00` to be present.

- [ ] **Step 2: Run test to verify it fails**
  Run: `flutter test test/core/widgets/dual_score_result_test.dart`
  Expected: FAIL

- [ ] **Step 3: Update mobile models and result screen widgets**
  Add `rawPointsEarned` and `rawPointsPossible` to Dart score models.
  Update `ResultScreen` and `ExamReviewScreen` with the dual-score Bento metric tile.

- [ ] **Step 4: Run flutter tests & analyzer**
  Run: `flutter test && flutter analyze lib/`
  Expected: PASS with 0 issues.

- [ ] **Step 5: Commit**
  ```bash
  git add apps/mobile
  git commit -m "feat(mobile): display raw points and normalized score on exam result and review screens"
  ```

---

### Task 6: Full System Verification & End-to-End Test

- [ ] **Step 1: Run full test suites across all apps**
  - `pnpm --filter backend test`
  - `pnpm --filter dashboard test`
  - `pnpm --filter @secure-cbt/shared test`
  - `cd apps/mobile && flutter test`
- [ ] **Step 2: Run monorepo typecheck**
  - `pnpm -r run typecheck`
  - `cd apps/mobile && flutter analyze lib/`
- [ ] **Step 3: Update PROGRESS.md to document Phase 27 completion**
- [ ] **Step 4: Final commit**
