# Question Bank Cascading Deletion, Active/Draft Exam Guard & Bulk Actions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prevent breaking active and scheduled exams by enforcing strict protection guards against deleting questions in `DRAFT`, `PUBLISHED`, or `ONGOING` exams, cascade soft-deletion to all child questions when a Question Bank is deleted, and provide teachers/admins with multi-select bulk actions (Bulk Delete & Bulk Move) on the questions dashboard.

**Architecture:** Introduce `assertQuestionsNotLinkedToActiveOrDraftExams(tx, questionIds)` in NestJS `QuestionBankService` that queries `exam_questions` joining `exams` with statuses `[DRAFT, PUBLISHED, ONGOING]` or `end_at > now()`. Ensure `deleteBank` and `bulkDeleteBanks` soft-delete both the bank and all questions in an atomic transaction after running the guard. Expose `POST /questions/bulk-delete`, `POST /questions/bulk-move`, and `POST /question-banks/bulk-delete`. Enable row selection in `DataTable` and add a contextual bulk actions bar in `/dashboard/questions`.

**Tech Stack:** NestJS, Prisma ORM, PostgreSQL, Vitest, Zod, Next.js 14, TanStack React Table v8, Lucide React, Sonner Toast.

**Spec:** Direct requirements from user discussion on question bank cascade deletion, exam protection locks, and bulk management.

---

## Global Constraints
- Questions or Question Banks containing questions linked to an exam with status `DRAFT`, `PUBLISHED`, or `ONGOING` (or where `end_at > now`) must **never be deleted**. The request must be rejected with HTTP 400 and the titles of the blocking exams.
- Deleting questions or banks linked only to `FINISHED` exams must perform **soft-deletion** (`deleted_at = now()`) so historical reports, student answer records, and item analysis remain intact.
- Deleting a Question Bank must always soft-delete all child questions belonging to that bank atomically.
- Bulk move must verify that the target Question Bank exists and is not soft-deleted.

---

## Review Focus
1. **Active Exam Protection:** Attempting to delete a single question linked to an `ONGOING` exam throws `BadRequestException` mentioning the exam title.
2. **Draft Exam Protection:** Attempting to delete a Question Bank whose questions are selected in a `DRAFT` exam throws `BadRequestException` and aborts deletion.
3. **Historical / Finished Exam Safety:** A question linked only to a `FINISHED` exam is successfully soft-deleted from the question bank without throwing foreign key errors.
4. **Cascading Deletion:** Deleting a Question Bank with questions soft-deletes both the bank and all child questions (`deleted_at !== null`).
5. **Bulk Move Integrity:** Bulk moving questions updates their `question_bank_id` to the target bank without altering their options, difficulty, or tags.

---

## File Structure

```
packages/shared/src/
├── schemas/question.schema.ts               # Add bulk action schemas
└── index.ts                                # Export schemas & types
apps/backend/src/modules/question-bank/
├── question-bank.service.ts                 # Guard, cascade delete, bulk operations
├── question-bank.controller.ts              # POST /bulk-delete, /bulk-move, /banks/bulk-delete
└── __tests__/question-bank.service.spec.ts  # Unit tests for guard & bulk operations
apps/dashboard/src/
├── lib/api-service.ts                       # Add bulk methods to questionBankApi
├── components/ui/data-table.tsx             # Row selection support
├── components/questions/
│   ├── bulk-move-dialog.tsx                 # Target bank selection dialog
│   └── __tests__/bulk-move-dialog.spec.tsx  # Tests for bulk move modal
└── app/dashboard/questions/page.tsx         # Bulk action bar, selection hooks
```

---

### Task 1: Shared Schemas for Bulk Actions

**Files:**
- Modify: `packages/shared/src/schemas/question.schema.ts`
- Modify: `packages/shared/src/index.ts`

**Interfaces:**
- Produces:
  - `bulkDeleteQuestionsSchema`: `{ ids: z.array(z.string().uuid()).min(1) }`
  - `bulkMoveQuestionsSchema`: `{ ids: z.array(z.string().uuid()).min(1), target_bank_id: z.string().uuid() }`
  - `bulkDeleteBanksSchema`: `{ ids: z.array(z.string().uuid()).min(1) }`
  - Inferred types: `BulkDeleteQuestionsInput`, `BulkMoveQuestionsInput`, `BulkDeleteBanksInput`

- [x] **Step 1: Add schemas to `packages/shared/src/schemas/question.schema.ts` and export in `packages/shared/src/index.ts`**
- [x] **Step 2: Build `packages/shared`**
  Run: `cmd.exe /c pnpm --filter @secure-cbt/shared build`
  Expected: PASS

---

### Task 2: Active/Draft Exam Guard & Cascading Bank Deletion in `QuestionBankService`

**Files:**
- Modify: `apps/backend/src/modules/question-bank/question-bank.service.ts`
- Test: `apps/backend/src/modules/question-bank/__tests__/question-bank.service.spec.ts`

**Interfaces:**
- Produces:
  - `QuestionBankService.assertQuestionsNotLinkedToActiveOrDraftExams(tx, questionIds: string[]): Promise<void>`
  - Updated `deleteBank(id: string)` with cascade soft-deletion of child questions and guard check
  - Updated `remove(id: string)` with guard check

- [x] **Step 1: Write failing unit tests for active/draft exam guard and cascading delete**
- [x] **Step 2: Run test to verify it fails**
- [x] **Step 3: Implement guard and cascade deletion in `QuestionBankService`**
- [x] **Step 4: Run test to verify it passes**
- [x] **Step 5: Commit**

---

### Task 3: Backend Bulk Endpoints (`bulkDelete`, `bulkMove`, `bulkDeleteBanks`)\n\n**Files:**
- Modify: `apps/backend/src/modules/question-bank/question-bank.service.ts`
- Modify: `apps/backend/src/modules/question-bank/question-bank.controller.ts`
- Test: `apps/backend/src/modules/question-bank/__tests__/question-bank.service.spec.ts`

**Interfaces:**
- Produces:
  - `POST /api/v1/questions/bulk-delete` &rarr; `{ success: true, message: string, data: { count: number } }`
  - `POST /api/v1/questions/bulk-move` &rarr; `{ success: true, message: string, data: { count: number } }`
  - `POST /api/v1/question-banks/bulk-delete` &rarr; `{ success: true, message: string, data: { count: number, questions_count: number } }`

- [x] **Step 1: Write failing unit tests for bulk operations**
- [x] **Step 2: Run test to verify it fails**
- [x] **Step 3: Implement bulk methods in `QuestionBankService` and endpoints in `QuestionBankController`**
- [x] **Step 4: Run test to verify it passes**
- [x] **Step 5: Commit**

---

### Task 4: Dashboard API Client & DataTable Row Selection

**Files:**
- Modify: `apps/dashboard/src/lib/api-service.ts`
- Modify: `apps/dashboard/src/components/ui/data-table.tsx`
- Test: `apps/dashboard/src/components/ui/__tests__/data-table.spec.tsx`

**Interfaces:**
- Produces:
  - `questionBankApi.bulkDeleteQuestions(ids: string[])`
  - `questionBankApi.bulkMoveQuestions(dto: { ids: string[]; target_bank_id: string })`
  - `questionBankApi.bulkDeleteBanks(ids: string[])`
  - `DataTable` props: `enableRowSelection?: boolean`, `onRowSelectionChange?: (selectedRows: TData[]) => void`

- [x] **Step 1: Update `questionBankApi` in `apps/dashboard/src/lib/api-service.ts`**
- [x] **Step 2: Add row selection support in `DataTable` with checkbox column and test it**
- [x] **Step 3: Commit**

---

### Task 5: Dashboard Bulk Actions UI (`/dashboard/questions`)

**Files:**
- Create: `apps/dashboard/src/components/questions/bulk-move-dialog.tsx`
- Create: `apps/dashboard/src/components/questions/__tests__/bulk-move-dialog.spec.tsx`
- Modify: `apps/dashboard/src/app/dashboard/questions/page.tsx`

**Interfaces:**
- Produces:
  - `<BulkMoveDialog open={boolean} onClose={() => void} selectedQuestionIds={string[]} banks={QuestionBank[]} onSuccess={() => void} />`
  - Floating Bulk Action Bar on `/dashboard/questions`:
    - Counter showing selected items
    - "Pindah Bank" button
    - "Hapus Terpilih" button with AlertDialog
    - "Batal Pilih" button

- [x] **Step 1: Write unit tests for `BulkMoveDialog` and verify it fails**
- [x] **Step 2: Implement `BulkMoveDialog`**
- [x] **Step 3: Integrate row selection and bulk action toolbar into `apps/dashboard/src/app/dashboard/questions/page.tsx`**
- [x] **Step 4: Verify test suite and Next.js build**
- [x] **Step 5: Commit**

---

### Task 6: End-to-End Monorepo Verification

- [x] **Step 1: Run all workspace tests (`cmd.exe /c pnpm -r test`)**
- [x] **Step 2: Run all workspace builds (`cmd.exe /c pnpm -r build`)**
- [x] **Step 3: Commit and push**
