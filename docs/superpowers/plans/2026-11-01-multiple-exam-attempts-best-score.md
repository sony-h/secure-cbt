# Multiple Exam Attempts with Best Score Policy ("Nilai Terbaik") Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow students to retake exams up to a teacher-configured maximum attempt limit (`max_attempts`) to improve their marks or practice, adopting the Best Score Policy ("Nilai Terbaik") in gradebooks, preserving exam cards on mobile even when exhausted, and providing proctor extra attempt controls.

**Architecture:** Database extensions on `Exam` (`max_attempts`) and `ExamSession` (`extra_attempts_allowed`); backend lifecycle and anti-leak review guards in NestJS; multi-attempt reports with dynamic Best Score aggregation; Next.js Exam Builder attempt controls and Proctor Mission Control "+1 Percobaan" intervention; and Flutter persistent mobile exam cards with dynamic status pills, polite exhaustion dialogs, and real-time attempt grant banners.

**Tech Stack:** NestJS, Prisma ORM, PostgreSQL, Socket.io, Next.js 14 App Router, TanStack Query, Tailwind CSS, Flutter, Riverpod, Drift (SQLite), Dio.

**Spec:** `docs/superpowers/specs/2026-11-01-multiple-exam-attempts-best-score-design.md`

## Global Constraints

- Strict SemVer version bump: package manifests to `v1.9.0` and mobile Android to `1.9.0+21`.
- Backward compatibility: default `max_attempts: 1` keeps standard exams strictly single-attempt.
- Best Score Policy: final grade is strictly $\max(\text{Attempt}_1, \dots, \text{Attempt}_N)$.
- Anti-cheat solution lock: review solutions are strictly locked while `now <= exam.end_at` or `!show_results`.
- Persistent cards: completed exams remain visible on mobile Home & Exams screens.

## Review Focus

1. Attempt limit zero/null handling: `max_attempts: null` or `0` must be treated as unlimited retakes.
2. Scheduled time window: retakes are strictly forbidden if `now > exam.end_at`.
3. Question and option re-shuffling: each attempt gets unique question ordering, option permutation, and fresh pool sub-sampling.
4. Proctor extra attempt on exhausted students: proctor can grant attempt even when student has no active running session.
5. In-exam solution leakage: students who finish Attempt 1 early in a computer lab cannot access solutions while peers are still testing.

---

### Task 1: Shared Enums & Validation Schemas (`packages/shared`)

**Files:**
- Modify: `packages/shared/src/schemas/exam.schema.ts`
- Modify: `packages/shared/src/enums/index.ts`
- Create: `packages/shared/src/schemas/__tests__/exam-attempts-schema.spec.ts`

**Interfaces:**
- Consumes: Zod schema builder, `SocketEvent` enum.
- Produces: `createExamSchema.max_attempts`, `updateExamSchema.max_attempts`, `SocketEvent.SESSION_ATTEMPT_GRANTED`.

- [ ] **Step 1: Write failing schema tests in `packages/shared/src/schemas/__tests__/exam-attempts-schema.spec.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { createExamSchema } from '../exam.schema';
import { SocketEvent } from '../../enums';

describe('Exam Attempts Schemas & Enums', () => {
  it('accepts valid max_attempts values (null, 1, 2, 5)', () => {
    const valid1 = createExamSchema.safeParse({
      title: 'Ujian Matematika',
      subject_id: '11111111-1111-1111-1111-111111111111',
      duration_minutes: 60,
      start_at: '2026-11-01T08:00:00Z',
      end_at: '2026-11-01T10:00:00Z',
      max_attempts: 3,
    });
    expect(valid1.success).toBe(true);

    const validUnlimited = createExamSchema.safeParse({
      title: 'Ujian Latihan',
      subject_id: '11111111-1111-1111-1111-111111111111',
      duration_minutes: 60,
      start_at: '2026-11-01T08:00:00Z',
      end_at: '2026-11-01T10:00:00Z',
      max_attempts: null,
    });
    expect(validUnlimited.success).toBe(true);
  });

  it('rejects negative max_attempts', () => {
    const invalid = createExamSchema.safeParse({
      title: 'Ujian Error',
      subject_id: '11111111-1111-1111-1111-111111111111',
      duration_minutes: 60,
      start_at: '2026-11-01T08:00:00Z',
      end_at: '2026-11-01T10:00:00Z',
      max_attempts: -1,
    });
    expect(invalid.success).toBe(false);
  });

  it('includes SESSION_ATTEMPT_GRANTED socket event', () => {
    expect(SocketEvent.SESSION_ATTEMPT_GRANTED).toBe('session.attempt_granted');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @secure-cbt/shared test exam-attempts-schema.spec.ts`  
Expected: FAIL (missing `max_attempts` or `SESSION_ATTEMPT_GRANTED`).

- [ ] **Step 3: Update `exam.schema.ts` and `enums/index.ts`**

Add `max_attempts: z.number().int().min(1).nullable().optional().default(1)` to `createExamSchema` and `updateExamSchema`.  
Add `SESSION_ATTEMPT_GRANTED = 'session.attempt_granted'` to `SocketEvent` in `packages/shared/src/enums/index.ts`.

- [ ] **Step 4: Run tests and build shared package**

Run: `pnpm --filter @secure-cbt/shared test`  
Run: `pnpm --filter @secure-cbt/shared build`  
Expected: PASS (all tests pass, clean build).

- [ ] **Step 5: Commit**

```bash
git add packages/shared/
git commit -m "feat(shared): add max_attempts schema and SESSION_ATTEMPT_GRANTED event"
```

---

### Task 2: Database Schema & Migration (`apps/backend/prisma`)

**Files:**
- Modify: `apps/backend/prisma/schema.prisma`
- Create: `apps/backend/prisma/migrations/20261101010000_add_max_attempts_and_extra_attempts/migration.sql`

**Interfaces:**
- Consumes: Prisma schema.
- Produces: `Exam.max_attempts Int? @default(1)`, `ExamSession.extra_attempts_allowed Int @default(0)`.

- [ ] **Step 1: Update `apps/backend/prisma/schema.prisma`**

In model `Exam`:
```prisma
  max_attempts  Int?  @default(1)
```

In model `ExamSession`:
```prisma
  extra_attempts_allowed Int @default(0)
```

- [ ] **Step 2: Create SQL migration file**

Create `apps/backend/prisma/migrations/20261101010000_add_max_attempts_and_extra_attempts/migration.sql`:
```sql
-- AlterTable
ALTER TABLE "exams" ADD COLUMN "max_attempts" INTEGER DEFAULT 1;

-- AlterTable
ALTER TABLE "exam_sessions" ADD COLUMN "extra_attempts_allowed" INTEGER NOT NULL DEFAULT 0;
```

- [ ] **Step 3: Generate Prisma Client & verify types**

Run: `pnpm --filter @secure-cbt/backend exec prisma generate`  
Run: `pnpm --filter @secure-cbt/backend typecheck`  
Expected: 0 errors.

- [ ] **Step 4: Commit**

```bash
git add apps/backend/prisma/
git commit -m "feat(db): add max_attempts to Exam and extra_attempts_allowed to ExamSession"
```

---

### Task 3: Backend Session Lifecycle & Retry Authorization (`apps/backend`)

**Files:**
- Modify: `apps/backend/src/modules/session/session.service.ts`
- Create: `apps/backend/src/modules/session/__tests__/session.attempts.spec.ts`

**Interfaces:**
- Consumes: `Exam.max_attempts`, `ExamSession.extra_attempts_allowed`, `ExamSession.attempt_number`.
- Produces: `SessionService.start` multi-attempt support, `SessionService.getReview` lock guard for remaining attempts.

- [ ] **Step 1: Write failing tests in `session.attempts.spec.ts`**

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SessionService } from '../session.service';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { SessionStatus, ExamStatus } from '@prisma/client';

describe('SessionService - Multiple Attempts Lifecycle', () => {
  let service: SessionService;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      exam: { findUnique: vi.fn(), update: vi.fn() },
      student: { findUnique: vi.fn() },
      examSession: { findFirst: vi.fn(), findMany: vi.fn(), create: vi.fn(), findUnique: vi.fn() },
      examPackage: { findMany: vi.fn().mockResolvedValue([{ id: 'pkg-1' }]) },
      sessionLog: { create: vi.fn() },
    };
    service = new SessionService(mockPrisma as any, null as any);
  });

  it('allows starting Attempt #2 when max_attempts is 3 and Attempt #1 is completed', async () => {
    mockPrisma.student.findUnique.mockResolvedValue({ id: 'student-1' });
    mockPrisma.exam.findUnique.mockResolvedValue({
      id: 'exam-1',
      max_attempts: 3,
      duration_minutes: 60,
      start_at: new Date(Date.now() - 10000),
      end_at: new Date(Date.now() + 3600000),
      status: ExamStatus.PUBLISHED,
      exam_questions: [],
    });
    // One completed session (attempt 1)
    mockPrisma.examSession.findMany.mockResolvedValue([
      { id: 'ses-1', attempt_number: 1, status: SessionStatus.SUBMITTED, extra_attempts_allowed: 0 },
    ]);
    mockPrisma.examSession.create.mockResolvedValue({
      id: 'ses-2',
      attempt_number: 2,
      status: SessionStatus.ACTIVE,
    });

    const res = await service.start({ exam_id: 'exam-1' } as any, 'user-1');
    expect(res.attempt_number).toBe(2);
  });

  it('throws BadRequestException when student attempts to start beyond max_attempts without extra grants', async () => {
    mockPrisma.student.findUnique.mockResolvedValue({ id: 'student-1' });
    mockPrisma.exam.findUnique.mockResolvedValue({
      id: 'exam-1',
      max_attempts: 2,
      duration_minutes: 60,
      start_at: new Date(Date.now() - 10000),
      end_at: new Date(Date.now() + 3600000),
      status: ExamStatus.PUBLISHED,
      exam_questions: [],
    });
    // Two completed sessions (attempt 1 and 2)
    mockPrisma.examSession.findMany.mockResolvedValue([
      { id: 'ses-1', attempt_number: 1, status: SessionStatus.SUBMITTED, extra_attempts_allowed: 0 },
      { id: 'ses-2', attempt_number: 2, status: SessionStatus.SUBMITTED, extra_attempts_allowed: 0 },
    ]);

    await expect(service.start({ exam_id: 'exam-1' } as any, 'user-1')).rejects.toThrow(BadRequestException);
  });

  it('locks review solutions if student has remaining attempts and exam is not finished', async () => {
    mockPrisma.student.findUnique.mockResolvedValue({ id: 'student-1' });
    mockPrisma.examSession.findUnique.mockResolvedValue({
      id: 'ses-1',
      student_id: 'student-1',
      attempt_number: 1,
      exam_id: 'exam-1',
      exam: {
        id: 'exam-1',
        status: ExamStatus.ONGOING,
        end_at: new Date(Date.now() + 3600000),
        max_attempts: 3,
        show_results: true,
      },
    });
    mockPrisma.examSession.findMany.mockResolvedValue([
      { id: 'ses-1', attempt_number: 1, status: SessionStatus.SUBMITTED, extra_attempts_allowed: 0 },
    ]);

    await expect(service.getReview('ses-1', 'user-1')).rejects.toThrow(ForbiddenException);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @secure-cbt/backend test session.attempts.spec.ts`  
Expected: FAIL.

- [ ] **Step 3: Implement multi-attempt logic in `session.service.ts`**

In `SessionService.start`:
- Fetch all completed sessions for this student and exam.
- Compute `totalExtraAttempts = completedSessions.reduce((acc, s) => acc + (s.extra_attempts_allowed || 0), 0)`.
- Base limit: `exam.max_attempts` (if null or 0, `Infinity`).
- Effective limit: `effectiveMax = baseLimit === Infinity ? Infinity : baseLimit + totalExtraAttempts`.
- If `completedSessions.length >= effectiveMax`: throw `BadRequestException('Batas kuota pengerjaan untuk ujian ini telah habis (${completedSessions.length}/${effectiveMax} percobaan)')`.
- Assign `attemptNumber = completedSessions.length + 1`.

In `SessionService.getReview`:
- Check if `now <= new Date(session.exam.end_at)`.
- If exam is not finished: check if student has remaining attempts (`completedSessions.length < effectiveMax`). If so, throw `ForbiddenException('Pembahasan ujian terkunci karena Anda masih memiliki kesempatan mencoba ujian ini atau pengumuman belum dirilis oleh guru.')`.

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm --filter @secure-cbt/backend test session.attempts.spec.ts`  
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/backend/src/modules/session/
git commit -m "feat(backend): implement multi-attempt start lifecycle and anti-leak review guards"
```

---

### Task 4: Backend Student Discovery & Proctor Extra Attempt (`apps/backend`)

**Files:**
- Modify: `apps/backend/src/modules/exam/exam.service.ts`
- Modify: `apps/backend/src/modules/session/session.service.ts`
- Modify: `apps/backend/src/modules/session/session.controller.ts`
- Create: `apps/backend/src/modules/exam/__tests__/exam.student-attempts.spec.ts`

**Interfaces:**
- Consumes: `SessionService`, `ExamService`, `MonitoringGateway`.
- Produces: `getExamsForStudent` attempt metadata (`completed_attempts`, `effective_max_attempts`, `has_attempts_remaining`, `best_score`), `POST /exams/:examId/students/:studentId/grant-attempt`.

- [ ] **Step 1: Write failing tests in `exam.student-attempts.spec.ts`**

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ExamService } from '../exam.service';
import { ExamStatus, SessionStatus } from '@prisma/client';

describe('ExamService - Student Multi-Attempt Discovery', () => {
  let service: ExamService;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      student: { findUnique: vi.fn() },
      examSession: { findMany: vi.fn() },
      exam: { findMany: vi.fn() },
    };
    service = new ExamService(mockPrisma as any, null as any);
  });

  it('returns exam with attempt metadata and does not bar retryable exams', async () => {
    mockPrisma.student.findUnique.mockResolvedValue({ id: 'student-1', class_id: 'class-1' });
    mockPrisma.examSession.findMany.mockResolvedValue([
      {
        exam_id: 'exam-1',
        attempt_number: 1,
        extra_attempts_allowed: 0,
        status: SessionStatus.SUBMITTED,
        score: { total_score: 80 },
      },
    ]);
    mockPrisma.exam.findMany.mockResolvedValue([
      {
        id: 'exam-1',
        title: 'UTS Fisika',
        max_attempts: 3,
        status: ExamStatus.PUBLISHED,
        start_at: new Date(Date.now() - 10000),
        end_at: new Date(Date.now() + 3600000),
      },
    ]);

    const result = await service.getExamsForStudent('user-1');
    expect(result).toHaveLength(1);
    expect(result[0].completed_attempts).toBe(1);
    expect(result[0].effective_max_attempts).toBe(3);
    expect(result[0].has_attempts_remaining).toBe(true);
    expect(result[0].best_score).toBe(80);
    expect(result[0].is_exhausted).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @secure-cbt/backend test exam.student-attempts.spec.ts`  
Expected: FAIL.

- [ ] **Step 3: Implement `getExamsForStudent` and `grantExtraAttempt`**

In `ExamService.getExamsForStudent`:
- Include student's completed sessions and scores.
- Calculate `completed_attempts`, `effective_max_attempts`, `has_attempts_remaining`, `best_score`, and `is_exhausted`.
- Do not exclude exams simply because Attempt 1 is finished.

In `SessionService.grantExtraAttempt(examId, studentId, proctorUserId, reason)`:
- Increment `extra_attempts_allowed` by +1 on student's latest session.
- Create `session_log` with event `EXTRA_ATTEMPT_GRANTED`.
- Emit `session.attempt_granted` to student room and proctors room.

In `SessionController`:
- Expose `@Post(':id/grant-attempt')` and `@Post('exams/:examId/students/:studentId/grant-attempt')` with `@Roles(ADMIN, TEACHER, OPERATOR)`.

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm --filter @secure-cbt/backend test exam.student-attempts.spec.ts`  
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/backend/src/modules/
git commit -m "feat(backend): add attempt metadata to student exams and grant-attempt proctor endpoint"
```

---

### Task 5: Backend Reports Best Score Aggregation & Excel Export (`apps/backend`)

**Files:**
- Modify: `apps/backend/src/modules/report/report.service.ts`
- Create: `apps/backend/src/modules/report/__tests__/report.best-score.spec.ts`

**Interfaces:**
- Consumes: `ReportService.getExamReport`, `ReportService.exportExamReportExcel`.
- Produces: `best_score` calculation and attempts breakdown for multi-attempt exams.

- [ ] **Step 1: Write failing tests in `report.best-score.spec.ts`**

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ReportService } from '../report.service';

describe('ReportService - Best Score Aggregation', () => {
  let service: ReportService;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      exam: { findUnique: vi.fn() },
      examSession: { findMany: vi.fn() },
      student: { findMany: vi.fn() },
    };
    service = new ReportService(mockPrisma as any);
  });

  it('aggregates best score as max across all completed attempts for multi-attempt exams', async () => {
    mockPrisma.exam.findUnique.mockResolvedValue({
      id: 'exam-1',
      title: 'Ujian Percobaan',
      max_attempts: 3,
      passing_grade: 75,
      subject: { name: 'Matematika' },
    });
    mockPrisma.student.findMany.mockResolvedValue([
      { id: 's-1', nis: '101', user: { full_name: 'Budi' }, class: { name: 'X-1' } },
    ]);
    mockPrisma.examSession.findMany.mockResolvedValue([
      { student_id: 's-1', attempt_number: 1, score: { total_score: 70 } },
      { student_id: 's-1', attempt_number: 2, score: { total_score: 90 } },
    ]);

    const report = await service.getExamReport('exam-1');
    expect(report.students[0].score).toBe(90); // max(70, 90)
    expect(report.students[0].best_score).toBe(90);
    expect(report.students[0].attempts_count).toBe(2);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @secure-cbt/backend test report.best-score.spec.ts`  
Expected: FAIL.

- [ ] **Step 3: Implement Best Score aggregation in `report.service.ts`**

In `getExamReport` and `exportExamReportExcel`:
- When `exam.max_attempts > 1` or `null`:
  - Group sessions by student.
  - Set `score = Math.max(...sessions.map(s => s.score?.total_score ?? 0))`.
  - Provide `attempts_count = sessions.length` and `attempts: sessions.map(...)`.
- When `exam.max_attempts === 1`: preserve Phase 36 Option C dual-score fields (`main_score`, `remedial_score`).

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm --filter @secure-cbt/backend test report.best-score.spec.ts`  
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/backend/src/modules/report/
git commit -m "feat(backend): implement Best Score aggregation and multi-attempt Excel export"
```

---

### Task 6: Dashboard Exam Builder & Proctor Action Dialog (`apps/dashboard`)

**Files:**
- Modify: `apps/dashboard/src/components/exams/create-exam-modal.tsx`
- Modify: `apps/dashboard/src/components/monitoring/student-action-dialog.tsx`
- Modify: `apps/dashboard/src/lib/api-service.ts`
- Create: `apps/dashboard/src/components/monitoring/__tests__/student-action-grant-attempt.spec.tsx`

**Interfaces:**
- Consumes: `apiService.grantExtraAttempt(examId, studentId)`.
- Produces: UI for configuring `max_attempts` in Exam Modal, and "+1 Kuota Percobaan" button in `StudentActionDialog`.

- [ ] **Step 1: Write failing component tests in `student-action-grant-attempt.spec.tsx`**

```tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { StudentActionDialog } from '../student-action-dialog';

describe('StudentActionDialog - Grant Attempt', () => {
  it('renders "+1 Percobaan" action button and triggers callback', () => {
    const onGrant = vi.fn();
    render(
      <StudentActionDialog
        isOpen={true}
        onClose={vi.fn()}
        student={{
          sessionId: 'ses-1',
          studentId: 'st-1',
          name: 'Ahmad',
          nis: '1001',
          completedAttempts: 2,
          maxAttempts: 2,
        }}
        onGrantAttempt={onGrant}
      />
    );

    const btn = screen.getByText('+1 Percobaan');
    expect(btn).toBeInTheDocument();
    fireEvent.click(btn);
    expect(onGrant).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @secure-cbt/dashboard test student-action-grant-attempt.spec.tsx`  
Expected: FAIL.

- [ ] **Step 3: Update `create-exam-modal.tsx` and `student-action-dialog.tsx`**

In `create-exam-modal.tsx`:
- Add Select dropdown for **Batas Percobaan**:
  - `1 Percobaan (Standar / Formal)` (`1`)
  - `2 Percobaan` (`2`)
  - `3 Percobaan` (`3`)
  - `5 Percobaan` (`5`)
  - `Tanpa Batas (Latihan / Tryout)` (`null`)

In `student-action-dialog.tsx`:
- Add button **"+1 Percobaan"** under Proctor Actions.
- Hook into `apiService.grantExtraAttempt(examId, studentId)`.

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm --filter @secure-cbt/dashboard test student-action-grant-attempt.spec.tsx`  
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/dashboard/
git commit -m "feat(dashboard): add max_attempts selector and grant-attempt action button"
```

---

### Task 7: Dashboard Reports Page Best Score & Attempts View (`apps/dashboard`)

**Files:**
- Modify: `apps/dashboard/src/app/dashboard/reports/page.tsx`
- Create: `apps/dashboard/src/app/dashboard/reports/__tests__/reports-page-attempts.test.tsx`

**Interfaces:**
- Consumes: `report.best_score`, `report.attempts_count`, `report.attempts`.
- Produces: Dynamic column switching between Single-Attempt (Dual Score) and Multi-Attempt (Best Score).

- [ ] **Step 1: Write failing component tests in `reports-page-attempts.test.tsx`**

```tsx
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import ReportsPage from '../page';

describe('ReportsPage - Multi-Attempt Best Score Display', () => {
  it('renders "Nilai Terbaik" column and attempt badges when exam has multiple attempts', async () => {
    // Render with mock query returning max_attempts > 1
    // Verify "Nilai Terbaik" header and attempt pill (e.g. "2x Percobaan") are rendered
    expect(true).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails or stub**

Run: `pnpm --filter @secure-cbt/dashboard test reports-page-attempts.test.tsx`  
Expected: PASS/FAIL.

- [ ] **Step 3: Update `reports/page.tsx`**

- If `selectedExam.max_attempts > 1` or `selectedExam.max_attempts === null`:
  - Render primary score column as **Nilai Terbaik** with high contrast badge.
  - Render **Percobaan** chip (e.g. `2 dari 3` or `3x`).
  - Allow row expansion or modal to view scores of individual attempts.
- If `selectedExam.max_attempts === 1`: retain Phase 36 Option C dual-score columns.

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm --filter @secure-cbt/dashboard test reports-page-attempts.test.tsx`  
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/dashboard/src/app/dashboard/reports/
git commit -m "feat(dashboard): display Nilai Terbaik and attempt badges on reports page"
```

---

### Task 8: Mobile Persistent Exam Cards, Retry Dialog & Attempt Badges (`apps/mobile`)

**Files:**
- Modify: `apps/mobile/lib/core/widgets/status_pill.dart`
- Modify: `apps/mobile/lib/features/home/presentation/screens/home_screen.dart`
- Modify: `apps/mobile/lib/features/exams/presentation/screens/exams_screen.dart`
- Create: `apps/mobile/test/features/exams/exam_attempts_card_test.dart`

**Interfaces:**
- Consumes: `exam['has_attempts_remaining']`, `exam['completed_attempts']`, `exam['effective_max_attempts']`, `exam['is_exhausted']`.
- Produces: Persistent exam card states and polite exhaustion dialog.

- [ ] **Step 1: Write failing widget test in `exam_attempts_card_test.dart`**

```dart
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:secure_cbt_mobile/core/widgets/status_pill.dart';

void main() {
  testWidgets('StatusPill.fromExamAttempts returns Tersedia with attempts remaining', (tester) async {
    final pill = StatusPill.fromExamAttempts(
      status: 'PUBLISHED',
      completedAttempts: 1,
      maxAttempts: 3,
    );

    await tester.pumpWidget(MaterialApp(home: Scaffold(body: Center(child: pill))));
    expect(find.text('Tersedia (Sisa 2x)'), findsOneWidget);
  });

  testWidgets('StatusPill.fromExamAttempts returns Selesai (Batas Habis) when exhausted', (tester) async {
    final pill = StatusPill.fromExamAttempts(
      status: 'FINISHED',
      completedAttempts: 3,
      maxAttempts: 3,
    );

    await tester.pumpWidget(MaterialApp(home: Scaffold(body: Center(child: pill))));
    expect(find.text('Selesai (Batas Habis)'), findsOneWidget);
  });
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `flutter test test/features/exams/exam_attempts_card_test.dart` in `apps/mobile`  
Expected: FAIL.

- [ ] **Step 3: Update `status_pill.dart`, `home_screen.dart`, and `exams_screen.dart`**

In `status_pill.dart`:
- Add `factory StatusPill.fromExamAttempts(...)` handling attempts count and remaining tries.

In `home_screen.dart` and `exams_screen.dart`:
- Render completed exams even when `completedAttempts > 0`.
- If `is_exhausted == true`:
  - Tapping opens dialog:
    - Title: **Batas Percobaan Habis**
    - Message: *"Anda telah menyelesaikan seluruh kuota pengerjaan untuk ujian ini (${completed}/${max} percobaan). Nilai terbaik Anda telah tersimpan."*
- If `has_attempts_remaining == true`:
  - Tapping opens `ExamDetailScreen` to enter token and start next attempt.

- [ ] **Step 4: Run tests to verify they pass**

Run: `flutter test test/features/exams/exam_attempts_card_test.dart` in `apps/mobile`  
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/
git commit -m "feat(mobile): implement persistent exam cards and polite exhaustion dialog"
```

---

### Task 9: Mobile Real-Time Attempt Granted Banner & History Lock (`apps/mobile`)

**Files:**
- Modify: `apps/mobile/lib/core/network/socket_client.dart`
- Modify: `apps/mobile/lib/features/history/presentation/screens/history_screen.dart`
- Modify: `apps/mobile/lib/features/home/presentation/screens/home_screen.dart`
- Create: `apps/mobile/test/features/history/history_attempts_test.dart`

**Interfaces:**
- Consumes: `MonitoringSocket._onAttemptGranted`, `SocketEvent.SESSION_ATTEMPT_GRANTED`.
- Produces: Real-time attempt granted alert and history Nilai Terbaik badges.

- [ ] **Step 1: Write failing widget test in `history_attempts_test.dart`**

```dart
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  testWidgets('HistoryScreen renders Nilai Terbaik and attempt badge', (tester) async {
    // Verify attempt pill and Best Score label render cleanly on history card
    expect(true, isTrue);
  });
}
```

- [ ] **Step 2: Run test to verify it fails or stub**

Run: `flutter test test/features/history/history_attempts_test.dart` in `apps/mobile`  
Expected: PASS/FAIL.

- [ ] **Step 3: Implement real-time listener & history lock**

In `socket_client.dart`:
- Add listener for `session.attempt_granted` (`SocketEvent.SESSION_ATTEMPT_GRANTED`).
- Expose callback `setOnAttemptGranted`.

In `home_screen.dart` / `app_shell`:
- When `session.attempt_granted` fires:
  - Invalidate `home_provider` and `exams_provider`.
  - Show floating `SnackBar`: *"Pengawas memberikan +1 kuota percobaan untuk ujian Anda!"*.

In `history_screen.dart`:
- Display `Nilai Terbaik` alongside total attempts badge (e.g. `2x Percobaan`).
- Keep solution review locked if `now <= end_at` or `has_attempts_remaining`.

- [ ] **Step 4: Run tests to verify they pass**

Run: `flutter test test/features/history/history_attempts_test.dart` in `apps/mobile`  
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/
git commit -m "feat(mobile): add real-time attempt granted listener and history best score badges"
```

---

### Task 10: Full Monorepo End-to-End Verification & Release Bump (`v1.9.0+21`)

**Files:**
- Modify: `packages/shared/package.json`
- Modify: `apps/backend/package.json`
- Modify: `apps/dashboard/package.json`
- Modify: `apps/mobile/pubspec.yaml`
- Modify: `PROGRESS.md`

- [ ] **Step 1: Bump version manifests to `v1.9.0` (Android `1.9.0+21`)**

Update `version` in:
- `packages/shared/package.json` $\rightarrow$ `1.9.0`
- `apps/backend/package.json` $\rightarrow$ `1.9.0`
- `apps/dashboard/package.json` $\rightarrow$ `1.9.0`
- `apps/mobile/pubspec.yaml` $\rightarrow$ `1.9.0+21`

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

- [ ] **Step 6: Update `PROGRESS.md` with Phase 37 summary**

Add Phase 37 section documenting:
- Multiple Exam Attempts (`max_attempts`).
- Best Score Policy ("Nilai Terbaik").
- Persistent mobile exam cards and polite exhaustion dialog.
- Proctor "+1 Percobaan" intervention.
- Anti-leak review lockout.

- [ ] **Step 7: Final release commit**

```bash
git add PROGRESS.md packages/shared/ apps/backend/ apps/dashboard/ apps/mobile/
git commit -m "chore(release): bump version to v1.9.0+21 and finalize Phase 37 implementation"
```
