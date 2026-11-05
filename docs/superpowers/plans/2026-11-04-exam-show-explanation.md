# Implementation Plan: Exam Question Explanation Visibility Control (`show_explanation`)

Decouple student score visibility (`show_results`) from answer key and question explanation disclosure by introducing `show_explanation` (default `false`) on the `Exam` entity. When `show_explanation` is disabled, students cannot view solution reviews, explanations, or answer keys, even after the exam schedule has concluded.

## User & Technical Requirements
1. **Default Value**: `show_explanation` is `false` (hidden by default) across database schema, shared schemas, backend logic, and dashboard forms.
2. **Dashboard Placement**: Configuration is strictly located in the Exam Builder / Edit Modal settings (`SettingsStep`), under "Tampilkan Pembahasan & Kunci Jawaban". No extra table quick-toggles.
3. **Backend Security**: `GET /api/v1/sessions/:id/review` throws `ForbiddenException` when `exam.show_explanation === false`.
4. **Mobile UX**: `ResultScreen` and `HistoryScreen` disable or lock the solution review action with clear proctor lock copy when explanation visibility is disabled.
5. **Versioning & Documentation**: Follow strict SemVer, increment Android build number (+N) via `pnpm version:bump minor` (or patch), update dashboard changelog (`apps/dashboard/src/lib/constants/changelog.ts`), and update `PROGRESS.md`.

---

## Proposed Changes

### 1. Database Schema & Shared Package
- **`apps/backend/prisma/schema.prisma`**:
  - Add `show_explanation Boolean @default(false)` to `Exam` model.
  - Create migration `20261104000000_add_exam_show_explanation`.
- **`packages/shared/src/schemas/exam.schema.ts`**:
  - `createExamSchema`: `show_explanation: z.boolean().optional().default(false)`.
  - `updateExamSchema`: `show_explanation: z.boolean().optional()`.

### 2. Backend Modules
- **`apps/backend/src/modules/exam/exam.service.ts`**:
  - In `create()`: save `show_explanation: data.show_explanation ?? false`.
  - In `update()`: if `data.show_explanation !== undefined`, update `show_explanation`.
- **`apps/backend/src/modules/session/session.service.ts`**:
  - In `getReview()`:
    ```typescript
    if (session.exam.show_explanation === false) {
      throw new ForbiddenException(
        'Pembahasan soal tidak diaktifkan untuk ujian ini.',
      );
    }
    ```
  - In `getHistory()`: return `show_explanation: s.exam.show_explanation ?? false` in the mapped object.
- **`apps/backend/src/modules/grading/grading.service.ts`**:
  - In `getResult()`: return `show_explanation: score.exam_session.exam.show_explanation ?? false`.

### 3. Dashboard Web App
- **`apps/dashboard/src/components/exams/exam-steps/settings-step.tsx`**:
  - Add `{ key: 'show_explanation', label: 'Tampilkan Pembahasan & Kunci Jawaban', desc: 'Siswa dapat melihat pembahasan dan kunci jawaban setelah seluruh jadwal ujian selesai' }` to settings list.
  - Update description for `show_results` to focus purely on score/nilai.
- **`apps/dashboard/src/components/exams/create-exam-modal.tsx`**:
  - Add `show_explanation: boolean` to `ExamFormData`.
  - Add `show_explanation: false` to `emptyExamForm`.
- **`apps/dashboard/src/app/dashboard/exams/page.tsx`**:
  - In `handleSubmit`: include `show_explanation: form.show_explanation ?? false`.
  - In `handleEdit`: map `show_explanation: full.show_explanation ?? false`.

### 4. Mobile CBT App
- **`apps/mobile/lib/features/history/presentation/screens/history_screen.dart`**:
  - Read `final showExplanation = h['show_explanation'] as bool? ?? false;`
  - Update `canReview = isExamFinished && !isRemedialLocked && showExplanation;`
  - When tapped and `!showExplanation`: show snackbar `"Pembahasan soal tidak diaktifkan untuk ujian ini."`
  - Update status badge: if `canReview` show `'Solusi'`, otherwise show `'Terkunci'`.
- **`apps/mobile/lib/features/exam/presentation/screens/result_screen.dart`**:
  - Read `final showExplanation = resultAsync.value?['show_explanation'] as bool? ?? false;`
  - If `!showExplanation`: show locked container with message `"Pembahasan soal tidak diaktifkan untuk ujian ini."` instead of review button.

### 5. Versioning & Changelog
- Run `node scripts/sync-version.mjs minor` (or `pnpm version:bump minor`) to bump version from `v1.9.0+21` to `v1.10.0+22`.
- Update `apps/dashboard/src/lib/constants/changelog.ts` with `v1.10.0` notes.
- Update `PROGRESS.md`.

---

## Step-by-Step Implementation Tasks

### Task 1: Database Schema & Shared Schemas
- Add `show_explanation` to `schema.prisma`.
- Create Prisma migration `20261104000000_add_exam_show_explanation`.
- Update `packages/shared/src/schemas/exam.schema.ts`.
- Run tests in `packages/shared`.

### Task 2: Backend Services & Unit Tests
- Update `ExamService`, `SessionService`, and `GradingService`.
- Add test in `session.service.spec.ts` asserting 403 Forbidden when `show_explanation: false`.
- Add test in `exam.service.spec.ts` ensuring `show_explanation` is handled on create/update.
- Run `pnpm test` in `apps/backend`.

### Task 3: Dashboard SettingsStep & Modal State
- Update `settings-step.tsx`, `create-exam-modal.tsx`, and `exams/page.tsx`.
- Update dashboard unit tests in `create-exam-modal.spec.tsx` and run `pnpm test` in `apps/dashboard`.

### Task 4: Mobile Result & History Screens
- Update `history_screen.dart` and `result_screen.dart`.
- Update / add widget tests in `apps/mobile/test`.
- Run `flutter test`.

### Task 5: Version Bump, Changelog & Docs
- Execute version bump: `pnpm version:bump minor`.
- Verify with `pnpm version:check`.
- Add `v1.10.0` entry to `apps/dashboard/src/lib/constants/changelog.ts`.
- Update `PROGRESS.md`.
- Run full monorepo build and verification.
