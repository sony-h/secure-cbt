# Student Credentials Management & Exam Controls Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix anti-cheat pool validation errors, disarm violations during exam submission, implement score visibility controls, enable question "select all" in exam creation, and provide student password generation with dual-template PDF/Excel exports.

**Architecture:** Shared Zod schema adjustments for exam controls and student password inputs; Prisma database migrations for `Exam.show_results` and `Student.plain_password`; mobile exam submit handler violation disarming; dashboard UI components for select-all, password generator, and print-portal exports.

**Tech Stack:** NestJS, Prisma (PostgreSQL), Zod, Flutter (Riverpod, Dio), Next.js 14, Tailwind CSS, Lucide icons, Vitest.

**Spec:** `docs/superpowers/specs/2026-10-18-student-credentials-exam-controls-design.md`

## Global Constraints
- Package shared schemas must compile clean via `pnpm --filter @secure-cbt/shared build`.
- Prisma migrations must be applied using `pnpm --filter backend exec prisma db push` or equivalent schema migration.
- Default `show_results` must be `true` across database, schemas, and UI.
- All Flutter tests must pass via `flutter test` in `apps/mobile`.
- All backend Vitest tests must pass via `pnpm --filter backend test`.
- All dashboard Vitest tests must pass via `pnpm --filter dashboard test`.
- Monorepo typecheck must pass cleanly via `pnpm run typecheck`.

## Review Focus
1. `createExamSchema` parsing when `is_random_pool: false` and `pool_question_count: null` (must not throw Zod error).
2. Submitting mobile exam when app is paused/minimized during 10-second countdown (must not trigger `APP_MINIMIZED` violation strike or alarm).
3. Student viewing exam result when `show_results: false` (must display completion message without numerical marks and lock discussion review).
4. Question "Select All" toggle in exam creation (must toggle all currently filtered questions while retaining questions from other banks).
5. Student password generation for class `X AKL 1` (must yield format `AKL-xxxxxx` and retain plain text in `Student.plain_password` for export).

---

### Task 1: Fix Anti-Cheat & Random Pool Schema Bug + Warning Guard

**Files:**
- Modify: `packages/shared/src/schemas/exam.schema.ts`
- Modify: `apps/backend/src/modules/session/session.service.ts`
- Modify: `apps/backend/src/modules/monitoring/monitoring.service.ts`
- Modify: `apps/mobile/lib/features/exam/providers/exam_notifier.dart`
- Test: `apps/backend/src/modules/exam/__tests__/exam.schema.spec.ts`

**Interfaces:**
- `createExamSchema.pool_question_count`: `z.number().int().min(1).nullable().optional()`
- `updateExamSchema.warning_limit`: `z.number().int().min(0).max(10).optional()`
- `updateExamSchema.violation_alarm_duration_seconds`: `z.number().int().min(1).max(30).optional()`

- [ ] **Step 1: Write the failing test for `createExamSchema` with null pool count**

In `apps/backend/src/modules/exam/__tests__/exam.schema.spec.ts`, add:
```ts
it('parses valid exam when is_random_pool is false and pool_question_count is null', () => {
  const parsed = createExamSchema.parse({
    ...baseValidExam,
    is_random_pool: false,
    pool_question_count: null,
  });
  expect(parsed.is_random_pool).toBe(false);
  expect(parsed.pool_question_count).toBeNull();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cmd /c pnpm --filter backend test exam.schema.spec.ts`
Expected: FAIL with "Expected number, received null".

- [ ] **Step 3: Implement schema fix and warning guards**

1. In `packages/shared/src/schemas/exam.schema.ts`:
   - Change `pool_question_count` in `createExamSchema` to `.nullable().optional()`.
   - Update `updateExamSchema.warning_limit` to `z.number().int().min(0).max(10).optional()`.
   - Update `updateExamSchema.violation_alarm_duration_seconds` to `z.number().int().min(1).max(30).optional()`.
2. Build shared package: `cmd /c pnpm --filter @secure-cbt/shared build`.
3. In `apps/backend/src/modules/session/session.service.ts` & `monitoring.service.ts`:
   - Guard `warningLimit > 0 && warningCount >= warningLimit && session.exam?.auto_submit_enabled`.
   - In `session.service.ts.start()`, always persist `question_order` to `tx.examSession.update`.
4. In `apps/mobile/lib/features/exam/providers/exam_notifier.dart`:
   - Guard `if (state.warningLimit > 0 && newCount >= state.warningLimit)` before calling `_onForceSubmit?.call()`.

- [ ] **Step 4: Run test to verify it passes**

Run: `cmd /c pnpm --filter backend test exam.schema.spec.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/shared/src/schemas/exam.schema.ts apps/backend/ apps/mobile/
git commit -m "fix(exam): allow null pool_question_count and guard warning limit zero"
```

---

### Task 2: Mobile Submission Guard (Disarm Violations on Submit & Countdown)

**Files:**
- Modify: `apps/mobile/lib/features/exam/presentation/handlers/exam_violation_handler.dart`
- Modify: `apps/mobile/lib/features/exam/presentation/handlers/exam_submit_handler.dart`
- Modify: `apps/mobile/lib/features/exam/presentation/screens/exam_screen.dart`
- Test: `apps/mobile/test/features/exam/exam_violation_handler_test.dart`

**Interfaces:**
- `ExamViolationHandler.disable()`: sets `_violationsEnabled = false` and cancels any pending violations.
- `ExamViolationHandler.handleLifecycleChange(state)`: no-ops if `_violationsEnabled == false` or `examState.isSubmitted == true`.

- [ ] **Step 1: Write the failing unit test for violation handler disarming**

In `apps/mobile/test/features/exam/exam_violation_handler_test.dart`, add a test verifying that calling `handler.disable()` prevents `handleLifecycleChange(AppLifecycleState.paused)` from logging `APP_MINIMIZED` or triggering warnings.

- [ ] **Step 2: Run test to verify it fails**

Run: `flutter test test/features/exam/exam_violation_handler_test.dart`
Expected: FAIL (method `disable` not implemented or violation still triggers).

- [ ] **Step 3: Implement violation disarming**

1. In `apps/mobile/lib/features/exam/presentation/handlers/exam_violation_handler.dart`:
   - Add `void disable() { _violationsEnabled = false; _violationPending = false; }`.
   - In `handleLifecycleChange()`, check: `if (!_violationsEnabled || ref.read(examProvider).isSubmitted) return;`.
2. In `apps/mobile/lib/features/exam/presentation/handlers/exam_submit_handler.dart`:
   - Accept optional callback `onSubmissionInitiated` or call `ref.read(violationAlarmServiceProvider).stopAlarm()`.
3. In `apps/mobile/lib/features/exam/presentation/screens/exam_screen.dart`:
   - When initiating submit in `_submitHandler`, immediately call `_violationHandler?.disable()` and `ref.read(violationAlarmServiceProvider).stopAlarm()`.

- [ ] **Step 4: Run test to verify it passes**

Run: `flutter test test/features/exam/exam_violation_handler_test.dart`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/lib/features/exam/ apps/mobile/test/
git commit -m "feat(mobile): disarm violation detection during submit and countdown transition"
```

---

### Task 3: Exam Score & Review Visibility Control (`show_results`)

**Files:**
- Modify: `apps/backend/prisma/schema.prisma`
- Modify: `packages/shared/src/schemas/exam.schema.ts`
- Modify: `apps/backend/src/modules/exam/exam.service.ts`
- Modify: `apps/backend/src/modules/session/session.service.ts`
- Modify: `apps/dashboard/src/components/exams/create-exam-modal.tsx`
- Modify: `apps/dashboard/src/components/exams/exam-steps/settings-step.tsx`
- Modify: `apps/dashboard/src/app/dashboard/exams/page.tsx`
- Modify: `apps/mobile/lib/features/exam/presentation/screens/result_screen.dart`
- Modify: `apps/mobile/lib/features/history/presentation/screens/history_screen.dart`
- Test: `apps/backend/src/modules/exam/__tests__/exam.service.spec.ts`
- Test: `apps/dashboard/src/components/exams/__tests__/random-pool-card.spec.tsx`

**Interfaces:**
- `Exam.show_results`: `Boolean @default(true)`
- `createExamSchema.show_results`: `z.boolean().optional().default(true)`
- `updateExamSchema.show_results`: `z.boolean().optional()`
- Backend `GET /sessions/:id/review`: checks `exam.show_results` or returns `{ show_results: boolean }`.

- [ ] **Step 1: Write the failing test for `show_results` in exam creation and session result**

In `apps/backend/src/modules/exam/__tests__/exam.service.spec.ts`, test that `exam.create` persists `show_results` (defaulting to `true`, and can be set to `false`).

- [ ] **Step 2: Run test to verify it fails**

Run: `cmd /c pnpm --filter backend test exam.service.spec.ts`
Expected: FAIL (`show_results` not recognized in schema/service).

- [ ] **Step 3: Implement `show_results` end-to-end**

1. Update `apps/backend/prisma/schema.prisma`:
   - Add `show_results Boolean @default(true)` to `Exam` model.
   - Run `cmd /c pnpm --filter backend exec prisma db push`.
2. Update `packages/shared/src/schemas/exam.schema.ts`:
   - Add `show_results: z.boolean().optional().default(true)` to `createExamSchema`.
   - Add `show_results: z.boolean().optional()` to `updateExamSchema`.
   - Run `cmd /c pnpm --filter @secure-cbt/shared build`.
3. In `apps/backend/src/modules/exam/exam.service.ts`:
   - Include `show_results: data.show_results ?? true` in create and update.
4. In `apps/backend/src/modules/session/session.service.ts`:
   - Include `show_results: session.exam.show_results` in `getReview()` and `getResult()`.
5. In `apps/dashboard`:
   - Add `show_results: boolean` to `ExamFormData` (default `true`).
   - Add a toggle switch in `settings-step.tsx`: *"Tampilkan Nilai ke Siswa"* with description *"Siswa dapat melihat skor dan pembahasan setelah ujian selesai"*.
6. In `apps/mobile`:
   - In `result_screen.dart`: if `resultAsync.value?['show_results'] == false`, render completion message without numerical score and hide the "Lihat Pembahasan" action button.
   - In `history_screen.dart`: if `h['show_results'] == false`, display badge *"Menunggu Guru"* instead of numerical marks and lock review click with SnackBar notification.

- [ ] **Step 4: Run backend and dashboard tests**

Run: `cmd /c pnpm --filter backend test exam.service.spec.ts`
Run: `cmd /c pnpm --filter dashboard test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/shared/ apps/backend/ apps/dashboard/ apps/mobile/
git commit -m "feat(exam): add show_results setting to control student score visibility"
```

---

### Task 4: Exam Creation Question Selection "Select All"

**Files:**
- Modify: `apps/dashboard/src/components/exams/exam-steps/questions-step.tsx`
- Test: `apps/dashboard/src/components/exams/__tests__/questions-step.spec.tsx`

**Interfaces:**
- Master checkbox in `QuestionsStep` toggling all `filteredQuestions` into/out of `form.question_ids`.

- [ ] **Step 1: Write the failing test for Select All questions**

In `apps/dashboard/src/components/exams/__tests__/questions-step.spec.tsx`, test that clicking "Pilih Semua" selects all filtered questions, and clicking again deselects all filtered questions.

- [ ] **Step 2: Run test to verify it fails**

Run: `cmd /c pnpm --filter dashboard test questions-step.spec.tsx`
Expected: FAIL (test file or element not found).

- [ ] **Step 3: Implement Select All in `questions-step.tsx`**

1. Compute `allFilteredSelected = filteredQuestions.length > 0 && filteredQuestions.every((q) => form.question_ids.includes(q.id))`.
2. Compute `isIndeterminate = !allFilteredSelected && filteredQuestions.some((q) => form.question_ids.includes(q.id))`.
3. Add master checkbox and label `Pilih Semua (${filteredQuestions.length})`:
   ```tsx
   const handleToggleAll = () => {
     if (allFilteredSelected) {
       const filteredIds = new Set(filteredQuestions.map((q) => q.id));
       setForm({ ...form, question_ids: form.question_ids.filter((id) => !filteredIds.has(id)) });
     } else {
       const newIds = new Set([...form.question_ids, ...filteredQuestions.map((q) => q.id)]);
       setForm({ ...form, question_ids: Array.from(newIds) });
     }
   };
   ```

- [ ] **Step 4: Run test to verify it passes**

Run: `cmd /c pnpm --filter dashboard test questions-step.spec.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/dashboard/src/components/exams/
git commit -m "feat(dashboard): add select-all toggle to exam question picker"
```

---

### Task 5: Student Plain Password Persistence, Class Password Generator, and Optional Teacher NIP/NIY

**Files:**
- Modify: `apps/backend/prisma/schema.prisma`
- Modify: `packages/shared/src/schemas/student.schema.ts`
- Modify: `packages/shared/src/schemas/teacher.schema.ts`
- Modify: `packages/shared/src/utils/index.ts`
- Modify: `apps/backend/src/modules/student/student.service.ts`
- Modify: `apps/backend/src/modules/student/student.controller.ts`
- Modify: `apps/backend/src/modules/teacher/teacher.service.ts`
- Modify: `apps/dashboard/src/app/dashboard/teachers/page.tsx`
- Test: `apps/backend/src/modules/student/__tests__/student-password.spec.ts`
- Test: `apps/backend/src/modules/teacher/__tests__/teacher.service.spec.ts`

**Interfaces:**
- `Student.plain_password`: `String?`
- `Teacher.nip`: `String? @unique` (optional NIP / NIY)
- `createTeacherSchema.nip`: `z.string().max(30).optional().nullable()`
- Helper `generateClassPassword(className: string): string`
  - Normalizes class (e.g. "X AKL 1" $\rightarrow$ `AKL`, "XII TJKT 2" $\rightarrow$ `TJKT`, fallback `CBT`)
  - Format: `${prefix}-${random6}`
- `POST /students/batch-generate-passwords`:
  - Body: `{ class_id?: string, student_ids?: string[] }`
  - Response: `{ count: number, students: Array<{ id, nis, full_name, class_name, plain_password }> }`

- [ ] **Step 1: Write the failing unit tests for password generator and optional teacher NIP/NIY**

1. In `apps/backend/src/modules/student/__tests__/student-password.spec.ts`, test `generateClassPassword` formats and `batchGeneratePasswords` service execution.
2. In `apps/backend/src/modules/teacher/__tests__/teacher.service.spec.ts`, test that teacher can be created with empty/null NIP, generating a fallback username.

- [ ] **Step 2: Run tests to verify they fail**

Run: `cmd /c pnpm --filter backend test student-password.spec.ts`
Run: `cmd /c pnpm --filter backend test teacher.service.spec.ts`
Expected: FAIL.

- [ ] **Step 3: Implement student password generation, persistence, and optional teacher NIP/NIY**

1. Update `apps/backend/prisma/schema.prisma`:
   - Add `plain_password String?` to `Student` model.
   - Change `Teacher.nip` from `String @unique` to `String? @unique`.
   - Run `cmd /c pnpm --filter backend exec prisma db push`.
2. In `packages/shared`:
   - In `student.schema.ts`, add `password: z.string().optional()` to `createStudentSchema` and `updateStudentSchema`.
   - In `teacher.schema.ts`, update `nip` to `z.string().max(30, { message: 'NIP/NIY maksimal 30 karakter' }).optional().nullable().transform(v => (v && v.trim() ? v.trim() : null))` in `createTeacherSchema` and `updateTeacherSchema`.
   - In `packages/shared/src/utils/index.ts`, export helper `generateClassPassword(className: string): string`.
   - Run `cmd /c pnpm --filter @secure-cbt/shared build`.
3. In `apps/backend/src/modules/student/student.service.ts`:
   - In `create()`: if `dto.password` is provided, use it; else fallback to `dto.nis`. Save plain password in `Student.plain_password` and hash in `User.password_hash`.
   - In `batchGeneratePasswords(classId)`: query students of the class, generate password for each, update `Student.plain_password` and `User.password_hash`, and return list.
4. In `apps/backend/src/modules/student/student.controller.ts`:
   - Expose `@Post('batch-generate-passwords')` with role guard `ADMIN`.
5. In `apps/backend/src/modules/teacher/teacher.service.ts`:
   - Support optional/blank `nip`. If `nip` is provided, verify uniqueness. If omitted/null, generate fallback username `guru_<name_slug>_<rand>` and default password `guru123`.
6. In `apps/dashboard/src/app/dashboard/teachers/page.tsx`:
   - Label form input as *"NIP / NIY (Opsional)"*, placeholder *"Nomor Induk Pegawai / Yayasan (opsional)"*.
   - In table column header, label as *"NIP / NIY"*, and render `row.original.nip || '-'`.

- [ ] **Step 4: Run tests to verify they pass**

Run: `cmd /c pnpm --filter backend test student-password.spec.ts`
Run: `cmd /c pnpm --filter backend test teacher.service.spec.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/shared/ apps/backend/ apps/dashboard/
git commit -m "feat: add plain_password retention, class password generator, and optional teacher NIP/NIY"
```

---

### Task 6: Student Table Excel Export & Dual-Template PDF Export

**Files:**
- Create: `apps/dashboard/src/components/students/student-export-dialog.tsx`
- Create: `apps/dashboard/src/components/students/student-credentials-print-template.tsx`
- Modify: `apps/dashboard/src/app/dashboard/students/page.tsx`
- Test: `apps/dashboard/src/components/students/__tests__/student-export-dialog.spec.tsx`

**Interfaces:**
- `StudentExportDialog`:
  - Modal with options:
    - Format: Excel (.xlsx) or PDF
    - When PDF: Template selection toggle between **Daftar Tabel (Tabular List)** and **Kartu Peserta (Cut-out Login Cards)**
    - Target: Current Filtered List or Selected Class
- Excel Export: downloads `.xlsx` with columns *No, NIS, Nama Siswa, Kelas, Username, Password, Status*.
- PDF Export: renders print portal with CSS `@media print` formatted for A4 printing.

- [ ] **Step 1: Write the failing test for `StudentExportDialog`**

In `apps/dashboard/src/components/students/__tests__/student-export-dialog.spec.tsx`, test that switching between Tabular List and Kartu Peserta updates template view, and clicking export triggers the appropriate download/print action.

- [ ] **Step 2: Run test to verify it fails**

Run: `cmd /c pnpm --filter dashboard test student-export-dialog.spec.tsx`
Expected: FAIL (component not found).

- [ ] **Step 3: Implement export dialog and print templates**

1. Create `student-credentials-print-template.tsx`:
   - Template A: Tabular document with school title, table columns (No, NIS, Nama Lengkap, Kelas, Username, Password, Tanda Tangan).
   - Template B: Cut-out login cards grid (2 columns, 4 rows per page) with dashed lines, school header, NIS, Nama Siswa, Kelas, Username, Password.
2. Create `student-export-dialog.tsx`:
   - Provides Excel export via `xlsx`/`exceljs` and PDF print portal trigger via `window.print()`.
3. In `apps/dashboard/src/app/dashboard/students/page.tsx`:
   - Add single-student "Generate Password" button in `StudentDialog`.
   - Add table action buttons: *"Generate Password Kelas"* and *"Ekspor Siswa (Excel / PDF)"*.
   - Include `plain_password` column in table with copy-to-clipboard or view toggle.

- [ ] **Step 4: Run test to verify it passes**

Run: `cmd /c pnpm --filter dashboard test student-export-dialog.spec.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/dashboard/src/components/students/ apps/dashboard/src/app/dashboard/students/
git commit -m "feat(dashboard): add student credentials export with excel and dual-template pdf"
```

---

### Task 7: Full Monorepo Verification & Progress Documentation

**Files:**
- Modify: `PROGRESS.md`
- Modify: `apps/mobile/pubspec.yaml` (bump to `1.7.4+18`)

**Interfaces:**
- Monorepo full verification: backend tests, dashboard tests, mobile tests, typechecks.

- [ ] **Step 1: Run full test suite across backend, dashboard, and mobile**

Run: `cmd /c pnpm --filter backend test`
Run: `cmd /c pnpm --filter dashboard test`
Run: `cmd /c pnpm run typecheck`

- [ ] **Step 2: Verify mobile tests and bump mobile version**

In `apps/mobile/pubspec.yaml`, bump version to `1.7.4+18`.
Run: `flutter test`

- [ ] **Step 3: Update `PROGRESS.md`**

Document Phase 34 deliverables: Anti-cheat pool fix, mobile submission guard, score visibility toggle, select-all question picker, student password generator, and dual-template PDF/Excel export.

- [ ] **Step 4: Commit**

```bash
git add PROGRESS.md apps/mobile/pubspec.yaml
git commit -m "chore: release v1.7.4+18 with student credentials management and exam controls"
```
