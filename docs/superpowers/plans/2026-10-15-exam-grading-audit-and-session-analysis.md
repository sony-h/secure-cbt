# Exam Grading Audit, Recalculation (Regrade), and Session Analysis Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Provide teachers and administrators with complete auditability and control over exam grading, resolve answer discrepancy issues (such as stale UUIDs after question edits like the NIS 202501001 vs 202501002 case), enable on-demand exam and session regrading, expose full student answer review breakdowns with explanations, and display per-question item difficulty and distractor analysis.

**Architecture:** Extend NestJS `GradingService` with smart option-matching and force re-evaluation logic while preserving manual essay scores; add exam-wide and session-specific regrading endpoints; implement `ReportService.getSessionReview()` and `ReportService.getItemAnalysis()` in the backend; enhance Next.js Dashboard reports with interactive student answer breakdown modals, item analysis tables, and an audit/regrade trigger button.

**Tech Stack:** NestJS, Prisma ORM, PostgreSQL, Vitest, Next.js 14 (App Router), TanStack React Table v8, TanStack React Query, Tailwind CSS, Lucide React, KaTeX / Rich Markdown.

**Spec:** Direct requirements from user analysis on exam discrepancies, student session explanation reviews, and grading verification tools.

---

## Global Constraints

- Never overwrite or reset existing manual essay evaluations (`score` and `feedback`) during automatic regrading.
- Recalculated scores must strictly conform to weighted difficulty scoring (EASY, MEDIUM, HARD) and scale within the normalized `0.00` to `100.00` range.
- Teacher/Admin session review access (`GET /reports/session/:id/review`) must NOT be restricted by exam end time (`end_at`), unlike the student mobile review.
- Option matching must be resilient against regenerated option UUIDs: if an option UUID stored in student answers cannot be found in the question's active options (e.g. after a question bank edit), fallback to matching by option order index or content.
- All database modifications during exam-wide regrading must execute within an atomic transaction.

---

## Review Focus

1. **Stale UUID Resilience:** A question whose options were deleted and recreated with new UUIDs in Question Bank must still grade students who took the exam prior to the edit as correct if their chosen option matches the correct option's order or text.
2. **Frozen Score Unlock:** A session previously graded with `score: 0` must be successfully re-evaluated to `100` when `forceReevaluate: true` is triggered after an answer key fix.
3. **Essay Protection:** An essay question with a manual score of `85` and teacher feedback must retain its score and feedback untouched after an exam-wide regrade.
4. **Empty Option Selection / Unanswered Handling:** Questions where the student submitted no answer (`answer_text: null` or empty string) must evaluate to `is_correct: false` and `score: 0` without throwing null pointer exceptions.
5. **Item Analysis Edge Cases:** Exams with zero submitted sessions or questions with 0% / 100% pass rates must render valid item statistics (difficulty index `0.0` or `1.0`, zero division protected).

---

## File Structure

```
apps/backend/
├── src/modules/grading/
│   ├── grading.service.ts                  # Enhanced with forceReevaluate & regradeExam
│   ├── grading.controller.ts               # Added POST exam/:id/regrade & session/:id/regrade
│   └── __tests__/grading.service.spec.ts   # Unit tests for regrading & fallback matching
├── src/modules/report/
│   ├── report.service.ts                   # Added getSessionReview & getItemAnalysis
│   ├── report.controller.ts                # Added GET session/:id/review & exam/:id/item-analysis
│   └── __tests__/report.service.spec.ts    # Unit tests for review & item analysis
apps/dashboard/
├── src/lib/
│   └── api-service.ts                      # Extended gradingApi and reportApi
├── src/components/reports/
│   ├── student-session-review-modal.tsx    # Interactive student question breakdown modal
│   ├── item-analysis-view.tsx              # Question difficulty & distractor analysis table
│   └── __tests__/
│       └── student-session-review-modal.spec.tsx # Tests for review modal rendering
└── src/app/dashboard/reports/
    └── page.tsx                            # Integrated tabs, review modal, and regrade button
```

---

### Task 1: Smart Option Matching & Force Re-evaluation in Grading Engine

**Files:**
- Modify: `apps/backend/src/modules/grading/grading.service.ts`
- Test: `apps/backend/src/modules/grading/__tests__/grading.service.spec.ts`

**Interfaces:**
- Consumes: Prisma `Answer`, `Question`, `QuestionOption`, `ExamSession`, `Exam`
- Produces:
  - `GradingService.calculateTotalScore(tx, sessionId, options?: { forceReevaluate?: boolean })`
  - Robust option lookup helper that resolves both option UUID and fallback option order/content matching.

- [ ] **Step 1: Write failing unit tests for force re-evaluation and stale UUID fallback**
  In `apps/backend/src/modules/grading/__tests__/grading.service.spec.ts`, add tests proving:
  1. When an answer already has `score: 0` (not null), calling `calculateTotalScore(tx, id, { forceReevaluate: true })` recalculates the score against current question options instead of skipping it.
  2. When a student answered with an old option UUID that was subsequently deleted and recreated, the grading engine successfully identifies the choice by content or position and awards points if it matches the correct option.
  3. Manual essay scores (`answer.question.type === ESSAY`) are never overwritten during force re-evaluation.

- [ ] **Step 2: Run test to verify it fails**
  Run: `cmd.exe /c pnpm --filter @secure-cbt/backend test src/modules/grading/__tests__/grading.service.spec.ts`
  Expected: FAIL (feature not yet implemented).

- [ ] **Step 3: Implement smart option matching and `forceReevaluate` in `GradingService`**
  In `apps/backend/src/modules/grading/grading.service.ts`:
  - Add `{ forceReevaluate?: boolean }` parameter to `calculateTotalScore`.
  - If `forceReevaluate` is `true`, evaluate non-essay questions even if `answer.score !== null`.
  - For objective questions (`MULTIPLE_CHOICE`, `MULTI_SELECT`, `TRUE_FALSE`), query all options for the question (`tx.questionOption.findMany({ where: { question_id } })`).
  - Compare `studentAnswerIds` with `correctOptionIds`. If an ID in `studentAnswerIds` does not match any current option ID, look for a matching option by `order` or `content` to resolve stale UUIDs gracefully.
  - Update `answer.is_correct` and `answer.score` in the database.

- [ ] **Step 4: Run test to verify it passes**
  Run: `cmd.exe /c pnpm --filter @secure-cbt/backend test src/modules/grading/__tests__/grading.service.spec.ts`
  Expected: PASS.

- [ ] **Step 5: Commit**
  ```bash
  git add apps/backend/src/modules/grading/grading.service.ts apps/backend/src/modules/grading/__tests__/grading.service.spec.ts
  git commit -m "fix(grading): implement smart option matching and force re-evaluation for stale answer keys"
  ```

---

### Task 2: Backend Regrade Endpoints for Exams and Sessions

**Files:**
- Modify: `apps/backend/src/modules/grading/grading.service.ts`
- Modify: `apps/backend/src/modules/grading/grading.controller.ts`
- Test: `apps/backend/src/modules/grading/__tests__/grading.service.spec.ts`

**Interfaces:**
- Produces:
  - `POST /api/v1/grading/exam/:id/regrade` &rarr; `{ success: true, message: string, data: { total_sessions: number, regraded_count: number, score_changes: Array<{ session_id: string, student_name: string, old_score: number, new_score: number }> } }`
  - `POST /api/v1/grading/session/:id/regrade` &rarr; `{ success: true, message: string, data: { session_id: string, old_score: number, new_score: number } }`

- [ ] **Step 1: Write failing test for `regradeExam` and `regradeSession`**
  In `apps/backend/src/modules/grading/__tests__/grading.service.spec.ts`, test that `regradeExam` processes all submitted sessions of an exam, updates their scores, recalculates totals, and returns the list of affected scores.

- [ ] **Step 2: Run test to verify it fails**
  Run: `cmd.exe /c pnpm --filter @secure-cbt/backend test src/modules/grading/__tests__/grading.service.spec.ts`
  Expected: FAIL (`regradeExam` is not a function).

- [ ] **Step 3: Implement `regradeExam` and `regradeSession` in `GradingService` and `GradingController`**
  In `GradingService`:
  - Find all sessions where `exam_id = id` and `status IN [SUBMITTED, AUTO_SUBMITTED]`.
  - For each session, run `calculateTotalScore(tx, session.id, { forceReevaluate: true })`.
  - Update `tx.score.upsert` with new score breakdown, `graded_by: graderId`, `graded_at: new Date()`.
  - Emit `SocketEvent.EXAM_REGRADED` or log event.
  In `GradingController`:
  - Add `@Post('exam/:id/regrade')` and `@Post('session/:id/regrade')` protected with `@Roles(UserRole.ADMIN, UserRole.TEACHER)`.

- [ ] **Step 4: Run test to verify it passes**
  Run: `cmd.exe /c pnpm --filter @secure-cbt/backend test src/modules/grading/__tests__/grading.service.spec.ts`
  Expected: PASS.

- [ ] **Step 5: Commit**
  ```bash
  git add apps/backend/src/modules/grading/grading.service.ts apps/backend/src/modules/grading/grading.controller.ts apps/backend/src/modules/grading/__tests__/grading.service.spec.ts
  git commit -m "feat(grading): add batch exam regrade and session regrade API endpoints"
  ```

---

### Task 3: Backend Teacher Session Review API (Full Answer Breakdown)

**Files:**
- Modify: `apps/backend/src/modules/report/report.service.ts`
- Modify: `apps/backend/src/modules/report/report.controller.ts`
- Test: `apps/backend/src/modules/report/__tests__/report.service.spec.ts` (create or update)

**Interfaces:**
- Produces:
  - `GET /api/v1/reports/session/:sessionId/review` &rarr; Returns session summary, student information, and ordered list of questions with student's selected answer, correct answer key, question type, difficulty, score, feedback, and explanation.

- [ ] **Step 1: Write failing test for `ReportService.getSessionReview()`**
  In `apps/backend/src/modules/report/__tests__/report.service.spec.ts`, test that `getSessionReview` returns full student answer details and correct keys even if the exam is still ongoing (unlike student review which is time-gated).

- [ ] **Step 2: Run test to verify it fails**
  Run: `cmd.exe /c pnpm --filter @secure-cbt/backend test src/modules/report/__tests__/report.service.spec.ts`
  Expected: FAIL (`getSessionReview` does not exist).

- [ ] **Step 3: Implement `getSessionReview` in `ReportService` & `ReportController`**
  In `ReportService`:
  - Query `examSession` with `student`, `score`, `answers`, and `exam.exam_questions.question.options`.
  - Sort questions according to persisted `session.question_order` (or fallback to `eq.position`).
  - Map each question to:
    ```typescript
    {
      id: question.id,
      number: index + 1,
      type: question.type,
      content: question.content,
      image_url: question.image_url,
      difficulty: question.difficulty,
      explanation: question.explanation,
      student_answer: answer?.answer_text ?? null,
      is_correct: answer?.is_correct ?? false,
      score: answer?.score ?? 0,
      feedback: answer?.feedback ?? null,
      options: question.options.map(o => ({
        id: o.id,
        content: o.content,
        image_url: o.image_url,
        is_correct: o.is_correct,
        order: o.order,
      })),
    }
    ```
  In `ReportController`:
  - Add `@Get('session/:sessionId/review')` protected by `@Roles(UserRole.ADMIN, UserRole.TEACHER)`.

- [ ] **Step 4: Run test to verify it passes**
  Run: `cmd.exe /c pnpm --filter @secure-cbt/backend test src/modules/report/__tests__/report.service.spec.ts`
  Expected: PASS.

- [ ] **Step 5: Commit**
  ```bash
  git add apps/backend/src/modules/report/report.service.ts apps/backend/src/modules/report/report.controller.ts apps/backend/src/modules/report/__tests__/report.service.spec.ts
  git commit -m "feat(reports): add teacher student session review API endpoint"
  ```

---

### Task 4: Backend Item Analysis API (Difficulty & Distractor Distribution)

**Files:**
- Modify: `apps/backend/src/modules/report/report.service.ts`
- Modify: `apps/backend/src/modules/report/report.controller.ts`
- Test: `apps/backend/src/modules/report/__tests__/report.service.spec.ts`

**Interfaces:**
- Produces:
  - `GET /api/v1/reports/exam/:id/item-analysis` &rarr; `{ success: true, data: { exam_id: string, total_sessions: number, questions: Array<ItemAnalysisQuestion> } }`
  - `ItemAnalysisQuestion`: `question_id`, `number`, `content`, `type`, `difficulty`, `total_answered`, `correct_count`, `wrong_count`, `pass_rate` (0-100%), `distractor_distribution` (per option count & percentage).

- [ ] **Step 1: Write failing test for `ReportService.getItemAnalysis()`**
  In `apps/backend/src/modules/report/__tests__/report.service.spec.ts`, test that `getItemAnalysis` aggregates all student answers across an exam to compute correct/wrong percentages and option distribution for each question.

- [ ] **Step 2: Run test to verify it fails**
  Run: `cmd.exe /c pnpm --filter @secure-cbt/backend test src/modules/report/__tests__/report.service.spec.ts`
  Expected: FAIL (`getItemAnalysis` is not a function).

- [ ] **Step 3: Implement `getItemAnalysis` in `ReportService` & `ReportController`**
  In `ReportService`:
  - Fetch all submitted sessions and answers for `exam_id`.
  - For each question in the exam:
    - Count total answers, correct answers, wrong answers.
    - Calculate difficulty index: $P = \frac{\text{correct\_count}}{\text{total\_answered}}$.
    - For multiple-choice questions, count how many students selected each option (distractor frequency).
  In `ReportController`:
  - Expose `@Get('exam/:id/item-analysis')` with `@Roles(UserRole.ADMIN, UserRole.TEACHER)`.

- [ ] **Step 4: Run test to verify it passes**
  Run: `cmd.exe /c pnpm --filter @secure-cbt/backend test src/modules/report/__tests__/report.service.spec.ts`
  Expected: PASS.

- [ ] **Step 5: Commit**
  ```bash
  git add apps/backend/src/modules/report/report.service.ts apps/backend/src/modules/report/report.controller.ts apps/backend/src/modules/report/__tests__/report.service.spec.ts
  git commit -m "feat(reports): add exam item analysis and distractor distribution API"
  ```

---

### Task 5: Dashboard API Service Extensions

**Files:**
- Modify: `apps/dashboard/src/lib/api-service.ts`

**Interfaces:**
- Produces:
  - `gradingApi.regradeExam(examId: string)`
  - `gradingApi.regradeSession(sessionId: string)`
  - `reportApi.getSessionReview(sessionId: string)`
  - `reportApi.getItemAnalysis(examId: string)`

- [ ] **Step 1: Update `apps/dashboard/src/lib/api-service.ts`**
  Add endpoints and response types:
  ```typescript
  export const gradingApi = {
    ...
    regradeExam: (examId: string) => api.post(`/grading/exam/${examId}/regrade`),
    regradeSession: (sessionId: string) => api.post(`/grading/session/${sessionId}/regrade`),
  };

  export const reportApi = {
    getExamReport: (examId: string, params?: ReportQueryParams) => api.get(`/reports/exam/${examId}`, { params }),
    getSessionReview: (sessionId: string) => api.get(`/reports/session/${sessionId}/review`),
    getItemAnalysis: (examId: string) => api.get(`/reports/exam/${examId}/item-analysis`),
  };
  ```

- [ ] **Step 2: Verify type check in dashboard**
  Run: `cmd.exe /c pnpm --filter @secure-cbt/dashboard build`
  Expected: PASS (zero type errors).

- [ ] **Step 3: Commit**
  ```bash
  git add apps/dashboard/src/lib/api-service.ts
  git commit -m "feat(dashboard): add regrade and session review methods to api-service"
  ```

---

### Task 6: Dashboard Student Session Review Modal

**Files:**
- Create: `apps/dashboard/src/components/reports/student-session-review-modal.tsx`
- Create: `apps/dashboard/src/components/reports/__tests__/student-session-review-modal.spec.tsx`

**Interfaces:**
- Consumes: `reportApi.getSessionReview`, `Modal`, `Badge`, `Button`, `RichMarkdownRenderer`
- Produces: `<StudentSessionReviewModal open={boolean} onClose={() => void} sessionId={string} studentName={string} nis={string} />`

- [ ] **Step 1: Write failing unit test for `StudentSessionReviewModal`**
  In `apps/dashboard/src/components/reports/__tests__/student-session-review-modal.spec.tsx`, mock `reportApi.getSessionReview` with sample questions (one correct, one incorrect with explanation) and verify:
  1. The modal renders student name, NIS, total score, and questions.
  2. The student's answer and correct answer key are clearly distinguished.
  3. The question explanation box is displayed with proper styling.

- [ ] **Step 2: Run test to verify it fails**
  Run: `cmd.exe /c pnpm --filter @secure-cbt/dashboard test student-session-review-modal.spec.tsx`
  Expected: FAIL (component not found).

- [ ] **Step 3: Implement `StudentSessionReviewModal` component**
  In `apps/dashboard/src/components/reports/student-session-review-modal.tsx`:
  - Fetch review data via `useQuery({ queryKey: ['session-review', sessionId], queryFn: ... })`.
  - Display header summary (Total Skor, Benar / Salah, Waktu Submit).
  - Provide a quick question navigator bar (numbered pills colored green for correct, red for incorrect, gray for unanswered).
  - For each question:
    - Display question content and media diagram.
    - Show options list with indicators:
      - Green border/pill for correct answer key.
      - Red indicator if student picked the wrong option.
      - Neutral for other options.
    - For short answer and matching, show side-by-side comparison: "Jawaban Siswa" vs "Kunci Sebenarnya".
    - Render explanation box (`q.explanation`) using `RichMarkdownRenderer`.

- [ ] **Step 4: Run test to verify it passes**
  Run: `cmd.exe /c pnpm --filter @secure-cbt/dashboard test student-session-review-modal.spec.tsx`
  Expected: PASS.

- [ ] **Step 5: Commit**
  ```bash
  git add apps/dashboard/src/components/reports/student-session-review-modal.tsx apps/dashboard/src/components/reports/__tests__/student-session-review-modal.spec.tsx
  git commit -m "feat(dashboard): add student session review modal with question explanations"
  ```

---

### Task 7: Item Analysis View, Regrade Button, and Reports Page Integration

**Files:**
- Create: `apps/dashboard/src/components/reports/item-analysis-view.tsx`
- Modify: `apps/dashboard/src/app/dashboard/reports/page.tsx`

**Interfaces:**
- Produces:
  - Item Analysis tab with difficulty classification (Mudah, Sedang, Sukar) and distractor distribution bars.
  - "Audit & Hitung Ulang Nilai (Regrade)" button with AlertDialog confirmation.
  - Action button "Lihat Detail" on each student row in the reports table.

- [ ] **Step 1: Implement `ItemAnalysisView` component**
  In `apps/dashboard/src/components/reports/item-analysis-view.tsx`:
  - Fetch analysis data with `useQuery({ queryKey: ['item-analysis', examId], queryFn: () => reportApi.getItemAnalysis(examId) })`.
  - Render a data table with columns: No, Soal, Tipe, Kesukaran ($P$), Siswa Menjawab, Benar, Salah, dan Sebaran Opsi (A, B, C, D, E).
  - Add color-coded difficulty badges: $P > 0.7$ (Mudah - Hijau), $0.3 \le P \le 0.7$ (Sedang - Biru), $P < 0.3$ (Sukar - Kuning).

- [ ] **Step 2: Integrate into `apps/dashboard/src/app/dashboard/reports/page.tsx`**
  - Add Tabs: "Hasil Siswa" and "Analisis Butir Soal" when an exam is selected.
  - Add "Hitung Ulang Nilai (Regrade)" button in the exam action header:
    - Triggers `AlertDialog` explaining that all objective answers will be re-evaluated with the latest keys without affecting manual essay scores.
    - Calls `gradingApi.regradeExam(selectedExam)`. On success, invalidates `['results']`, `['item-analysis']`, and notifies with toast of how many scores were updated.
  - In student results table (`reportColumns`):
    - Add an "Aksi" column with an eye/file-text icon button (`Lihat Detail Jawaban`).
    - Clicking the button opens `StudentSessionReviewModal` with `sessionId`, `studentName`, and `nis`.

- [ ] **Step 3: Run dashboard test suite and build verification**
  Run:
  1. `cmd.exe /c pnpm --filter @secure-cbt/dashboard test`
  2. `cmd.exe /c pnpm --filter @secure-cbt/dashboard build`
  Expected: PASS on all tests and build succeeds with zero errors.

- [ ] **Step 4: Commit**
  ```bash
  git add apps/dashboard/src/components/reports/item-analysis-view.tsx apps/dashboard/src/app/dashboard/reports/page.tsx
  git commit -m "feat(dashboard): integrate item analysis tab, regrade audit button, and student review modal in reports"
  ```

---

### Task 8: Full Monorepo End-to-End Verification

**Files:**
- Test all backend and dashboard packages.

- [ ] **Step 1: Run complete monorepo test suite**
  Run: `cmd.exe /c pnpm -r test`
  Expected: All tests pass across `@secure-cbt/backend`, `@secure-cbt/dashboard`, and `@secure-cbt/shared`.

- [ ] **Step 2: Commit any final test fixtures or adjustments**
  ```bash
  git commit -m "test: verify complete grading audit, session review, and item analysis integration"
  ```
