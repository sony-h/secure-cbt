# Thermo-Nuclear Audit Implementation Plan

> **For agentic workers:** Use subagent-driven-development or executing-plans to implement task-by-task. Steps use checkbox (`- [ ]`) syntax. Each step is 2-5 min.

**Goal:** Fix 137 code-quality issues identified in the thermo-nuclear audit across backend, dashboard, mobile, shared package, and infrastructure.

**Architecture:** Modular monolith (NestJS) + Next.js dashboard + Flutter mobile. Fix phases ordered by blast radius: data integrity first, then config/infra, then structural debt, then testing, then polish.

**Tech Stack:** NestJS + Prisma + ioredis + BullMQ (backend), Next.js + TanStack Query + Zustand (dashboard), Flutter + Riverpod + Drift + Dio (mobile), Zod + TypeScript (shared).

## Global Constraints

- No breaking API changes unless explicitly noted
- All Zod error messages must use Bahasa Indonesia
- No new npm/pnpm dependencies without explicit approval
- Every file touched must run existing lint + typecheck without new errors
- Backend services: `pnpm --filter @secure-cbt/backend run typecheck && pnpm --filter @secure-cbt/backend run lint`
- Dashboard: `pnpm --filter @secure-cbt/dashboard run lint`
- Mobile: `cd apps/mobile && flutter analyze`
- Shared: `pnpm --filter @secure-cbt/shared run typecheck`
- Commit after each task with Conventional Commits format

---

## Phase 1: Data Integrity — Critical Bug Fixes

### Task 1.1: Session resume preserves question order

**Files:**
- Modify: `apps/backend/src/modules/session/session.service.ts:167-169`
- Add: Prisma migration for `session_question_order` field

**Problem:** `Math.random()-0.5` re-shuffles on every resume. Student sees different order mid-exam.

- [ ] **Add `question_order` JSON column to `ExamSession`**

```bash
npx prisma migrate dev --name add_session_question_order --create-only
```

```prisma
// In schema.prisma, add to ExamSession model:
question_order Json?  // Stores shuffled question IDs in display order
```

- [ ] **On session start, persist shuffled order**

```typescript
// session.service.ts, inside start():
const shuffledQuestions = [...examQuestions].sort(() => Math.random() - 0.5);
const questionIds = shuffledQuestions.map(q => q.id);

await prisma.examSession.update({
  where: { id: session.id },
  data: { question_order: questionIds },
});
```

- [ ] **On resume, read persisted order instead of re-shuffling**

```typescript
// session.service.ts, inside resume():
const session = await prisma.examSession.findUnique({
  where: { id: sessionId },
  include: { exam: { include: { exam_questions: { include: { question: { include: { options: true } } } } } } },
});

// Use persisted order:
const orderedQuestions = session.question_order as string[];
const sortedQuestions = orderedQuestions
  .map(id => examQuestions.find(eq => eq.id === id))
  .filter(Boolean) as ExamQuestionWithOptions[];
```

- [ ] **Run migration**

```bash
npx prisma migrate dev
```

- [ ] **Verify**

```bash
pnpm --filter @secure-cbt/backend run typecheck
```

- [ ] **Commit**

```bash
git add apps/backend/prisma/ apps/backend/src/modules/session/
git commit -m("fix: persist shuffled question order on session start, read on resume")
```

---

### Task 1.2: Wrap submit/autoSubmit/grade in transactions

**Files:**
- Modify: `apps/backend/src/modules/session/session.service.ts:203-268`
- Modify: `apps/backend/src/modules/grading/grading.service.ts:23-28`
- Modify: `apps/backend/src/modules/answer/answer.service.ts:60-80`

**Problem:** Session status update + score calculation is not atomic. Network failure between writes creates orphan sessions.

- [ ] **Wrap submit() in transaction**

```typescript
// session.service.ts, submit():
return await this.prisma.$transaction(async (tx) => {
  const session = await tx.examSession.update({
    where: { id: sessionId, student_id: studentId, status: SessionStatus.ONGOING },
    data: { status: SessionStatus.SUBMITTED, end_time: new Date() },
  });

  const totalScore = await this.gradingService.calculateTotalScore(tx, sessionId);

  await tx.score.upsert({
    where: { exam_session_id: sessionId },
    create: { exam_session_id: sessionId, total_score: totalScore, passing_grade: passingGrade },
    update: { total_score: totalScore },
  });

  return session;
});
```

- [ ] **Wrap autoSubmit() in transaction** (same pattern as submit)

- [ ] **Wrap gradeEssay() in transaction**

```typescript
// grading.service.ts, gradeEssay():
return await this.prisma.$transaction(async (tx) => {
  const updated = await tx.answer.update({
    where: { id: answerId },
    data: { score: dto.score, teacher_notes: dto.teacher_notes ?? undefined },
  });
  const totalScore = await this.calculateTotalScore(tx, examSessionId);
  await tx.score.upsert({ ... });
  return updated;
});
```

- [ ] **Wrap batchSync() in transaction**

```typescript
// answer.service.ts, batchSync():
return await this.prisma.$transaction(async (tx) => {
  for (const answer of dto.answers) {
    await tx.answer.upsert({
      where: { exam_session_id_question_id: { exam_session_id: sessionId, question_id: answer.question_id } },
      create: { ... },
      update: { answer: answer.answer },
    });
  }
});
```

- [ ] **Update GradingService.calculateTotalScore signature to accept PrismaTransactionClient**

```typescript
async calculateTotalScore(tx: PrismaTransactionClient, examSessionId: string): Promise<number> {
  // use tx. instead of this.prisma.
}
```

- [ ] **Verify**

```bash
pnpm --filter @secure-cbt/backend run typecheck
```

- [ ] **Commit**

```bash
git add apps/backend/src/modules/session/session.service.ts apps/backend/src/modules/grading/grading.service.ts apps/backend/src/modules/answer/answer.service.ts
git commit -m("fix: wrap submit/autoSubmit/gradeEssay/batchSync in Prisma transactions")
```

---

### Task 1.3: Fix N+1 query in monitoring

**Files:**
- Modify: `apps/backend/src/modules/monitoring/monitoring.service.ts:42-55`

**Problem:** 2 extra queries per session for answer/question counts. 30 students = 60 extra round-trips.

- [ ] **Replace N+1 with single query using `_count`**

```typescript
// monitoring.service.ts:
const sessions = await this.prisma.examSession.findMany({
  where: { exam_id: examId },
  include: {
    student: { include: { user: { select: { full_name: true } }, class: { select: { name: true } } } },
    _count: { select: { answers: true } },
  },
});

// For total questions, pre-calculate at exam level:
const totalQuestions = await this.prisma.examQuestion.count({
  where: { exam_package: { exam_id: examId } },
});
```

- [ ] **Verify**

```bash
pnpm --filter @secure-cbt/backend run typecheck
```

- [ ] **Commit**

```bash
git add apps/backend/src/modules/monitoring/monitoring.service.ts
git commit -m("perf: replace N+1 monitoring queries with _count and pre-calculation")
```

---

### Task 1.4: Fix Dio retry interceptor — no naked Dio instances

**Files:**
- Modify: `apps/backend/src/modules/auth/auth.service.ts:68-84`
- Modify: `apps/mobile/lib/core/network/dio_client.dart:40-58`

**Problem:** Token refresh creates `new Dio()` with no interceptors. Retry bypasses auth headers entirely.

- [ ] **Fix auth service: wrap login token cleanup in transaction, fix order (delete old first)**

```typescript
// auth.service.ts, login():
return await this.prisma.$transaction(async (tx) => {
  // Delete old tokens first
  await tx.refreshToken.deleteMany({ where: { user_id: user.id, device_id: deviceId } });
  // Create new token
  const refreshToken = await tx.refreshToken.create({ data: { ... } });
  // ... rest of login logic
});
```

- [ ] **Fix Dio client: use the original Dio instance for retry**

```dart
// dio_client.dart, onError interceptor:
final refreshDio = Dio(BaseOptions(baseUrl: _baseUrl));
try {
  final refreshResponse = await refreshDio.post('/auth/refresh', data: {
    'refresh_token': refreshToken,
  });
  final newAccess = refreshResponse.data['data']['access_token'];
  await secureStorage.write(key: 'access_token', value: newAccess);

  // Retry the original request using the SAME auth interceptor:
  error.requestOptions.headers['Authorization'] = 'Bearer $newAccess';
  final opts = error.requestOptions;
  final retryResponse = await _this.fetch(opts);
  handler.resolve(retryResponse);
} catch (refreshError) {
  handler.reject(error);
}
```

- [ ] **Fix interceptor order — retry should be first**

```dart
// dio_client.dart, constructor:
// Register in correct order: RetryInterceptor first (closest to adapter)
dio.interceptors.addAll([
  RetryInterceptor(...),
  AuthInterceptor(...),
  LogInterceptor(...),
]);
```

- [ ] **Verify**

```bash
cd apps/mobile && flutter analyze
```

- [ ] **Commit**

```bash
git add apps/mobile/lib/core/network/dio_client.dart apps/backend/src/modules/auth/auth.service.ts
git commit -m("fix: use original Dio for retry, fix interceptor order, wrap token cleanup in transaction")
```

---

### Task 1.5: Fix Socket.io wrong field mapping

**Files:**
- Modify: `apps/backend/src/modules/monitoring/monitoring.gateway.ts:101`

**Problem:** `sessionId` field set to `examId` value (wrong field).

- [ ] **Fix field naming or extract actual session ID**

```typescript
// monitoring.gateway.ts, handleStudentConnected:
this.server.to(`exam:${examId}`).emit(SocketEvent.STUDENT_CONNECTED, {
  studentId: client.data.studentId,
  studentName: client.data.studentName,
  examId: examId,  // renamed from sessionId
  sessionId: client.data.sessionId,  // extract actual session ID from handshake
  timestamp: new Date().toISOString(),
});
```

- [ ] **Verify**

```bash
pnpm --filter @secure-cbt/backend run typecheck
```

- [ ] **Commit**

```bash
git add apps/backend/src/modules/monitoring/monitoring.gateway.ts
git commit -m("fix: correct Socket.io field mapping — use examId/examId instead of examId/sessionId")
```

---

## Phase 2: Configuration & Infrastructure

### Task 2.1: Fix Docker setup

**Files:**
- Modify: `docker-compose.yml:93`
- Create: `.dockerignore`
- Modify: `apps/backend/package.json:70,73`

**Problems:** Backend uses migration-runner Dockerfile; no `.dockerignore`; `@nestjs/core` and `@prisma/client` in devDeps.

- [ ] **Fix docker-compose.yml backend service to use correct Dockerfile**

```yaml
# docker-compose.yml, backend service:
build:
  context: .
  dockerfile: docker/Dockerfile.backend
```

- [ ] **Create `.dockerignore`**

```gitignore
# .dockerignore
.git
.gitignore
node_modules/
dist/
.next/
build/
coverage/
apps/mobile/build/
apps/mobile/.dart_tool/
apps/mobile/.packages
*.md
.env
.env.local
```

- [ ] **Move `@nestjs/core` and `@prisma/client` from devDependencies to dependencies**

```bash
# In apps/backend/package.json:
# Move @nestjs/core from devDependencies (line ~70) to dependencies
# Move @prisma/client from devDependencies (line ~73) to dependencies
```

- [ ] **Create `apps/dashboard/.env.example`**

```bash
# apps/dashboard/.env.example
NEXT_PUBLIC_API_URL=http://localhost:3000/api/v1
NEXT_PUBLIC_SOCKET_URL=http://localhost:3000
```

- [ ] **Add `typecheck` and `clean` scripts to dashboard package.json**

```json
// apps/dashboard/package.json scripts:
"typecheck": "tsc --noEmit",
"clean": "rimraf .next",
```

- [ ] **Fix vitest.config.e2e.ts port mismatch**

```typescript
// vitest.config.e2e.ts:
env: {
  DATABASE_URL: 'postgresql://postgres:postgres@localhost:5433/secure_cbt?schema=public',
  ...
}
```

- [ ] **Remove `pnpm-lock.yaml` from `.gitignore` and commit it**

- [ ] **Verify**

```bash
pnpm -r run typecheck
```

- [ ] **Commit**

```bash
git add docker-compose.yml .dockerignore apps/backend/package.json apps/dashboard/package.json apps/dashboard/.env.example apps/backend/vitest.config.e2e.ts .gitignore pnpm-lock.yaml
git commit -m("fix: correct Docker config, dependency sections, add .dockerignore, fix port mismatch")
```

---

### Task 2.2: Restrict image domains and fix tsconfig

**Files:**
- Modify: `apps/dashboard/next.config.js:6-9`
- Modify: `apps/dashboard/tsconfig.json`

**Problems:** Image `remotePatterns` allows `**` (SSRF risk). Dashboard tsconfig doesn't extend root.

- [ ] **Restrict image remotePatterns to known hosts**

```javascript
// next.config.js:
remotePatterns: [
  { protocol: 'https', hostname: 'minio.example.com' },
  { protocol: 'http', hostname: 'localhost', port: '9000' },
],
```

- [ ] **Add extends to dashboard tsconfig**

```json
// apps/dashboard/tsconfig.json:
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    // Keep Next.js-specific overrides here
  }
}
```

- [ ] **Verify**

```bash
pnpm --filter @secure-cbt/dashboard run lint
```

- [ ] **Commit**

```bash
git add apps/dashboard/next.config.js apps/dashboard/tsconfig.json
git commit -m("fix: restrict image remotePatterns, extend root tsconfig")
```

---

## Phase 3: Backend Structural Cleanup

### Task 3.1: Remove unused RedisModule and dead publish endpoint

**Files:**
- Modify: `apps/backend/src/app.module.ts`
- Modify: `apps/backend/src/modules/exam/exam.service.ts:194-201`
- Modify: `apps/backend/src/modules/exam/exam.controller.ts:60-65`
- Delete: `apps/backend/src/common/redis/` (entire directory)
- Delete: `apps/backend/src/modules/auth/auth.module.ts:16` (UserModule import if unused)

**Problems:** RedisModule never injected by any service; `publish()` endpoint dead code since auto-publish.

- [ ] **Remove RedisModule from app.module.ts imports**

- [ ] **Delete `src/common/redis/` directory** (redis.module.ts, redis.service.ts, redis.provider.ts if exists)

- [ ] **Remove `publish()` method from ExamService** (it's dead code since create() auto-publishes)

- [ ] **Remove publish endpoint from ExamController**

- [ ] **Remove unused module imports** (UserModule from AuthModule, QuestionBankModule from ExamModule, ExamModule from SessionModule)

- [ ] **Verify**

```bash
pnpm --filter @secure-cbt/backend run typecheck
grep -r "RedisService\|RedisModule\|publish\|QueueNames.BACKGROUND_CLEANUP" apps/backend/src/
```

- [ ] **Commit**

```bash
git add apps/backend/src/app.module.ts apps/backend/src/modules/exam/ apps/backend/src/common/ apps/backend/src/modules/auth/auth.module.ts apps/backend/src/modules/session/session.module.ts apps/backend/src/modules/exam/exam.module.ts
git commit -m("refactor: remove unused RedisModule, dead publish endpoint, and unused module imports")
```

---

### Task 3.2: Add stricter rate limiting on auth endpoints

**Files:**
- Modify: `apps/backend/src/modules/auth/auth.controller.ts`
- Modify: `apps/backend/src/app.module.ts`

**Problem:** Login endpoint uses same 60 req/min global limit.

- [ ] **Add `@Throttle()` decorator to login endpoint**

```typescript
// auth.controller.ts:
import { Throttle } from '@nestjs/throttler';

@Post('login')
@Throttle({ default: { limit: 5, ttl: 60000 } })  // 5 attempts per minute
async login(@Body() body: any, @Req() req: any) {
```

- [ ] **Verify**

```bash
pnpm --filter @secure-cbt/backend run typecheck
```

- [ ] **Commit**

```bash
git add apps/backend/src/modules/auth/auth.controller.ts
git commit -m("security: add stricter rate limit (5/min) on auth login endpoint")
```

---

### Task 3.3: Add password strength validation

**Files:**
- Modify: `packages/shared/src/schemas/auth.schema.ts`
- Modify: `apps/backend/src/modules/auth/auth.service.ts:154-171`

**Problem:** No password strength requirements.

- [ ] **Add password schema with strength rules**

```typescript
// packages/shared/src/schemas/auth.schema.ts:
import { z } from 'zod';

export const passwordSchema = z
  .string()
  .min(8, { message: 'Kata sandi minimal 8 karakter' })
  .max(100, { message: 'Kata sandi maksimal 100 karakter' })
  .regex(/[A-Z]/, { message: 'Kata sandi harus mengandung huruf kapital' })
  .regex(/[a-z]/, { message: 'Kata sandi harus mengandung huruf kecil' })
  .regex(/[0-9]/, { message: 'Kata sandi harus mengandung angka' });
```

- [ ] **Use in changePassword and register endpoints**

```typescript
// auth.service.ts, changePassword():
const validated = passwordSchema.parse(dto.newPassword);
```

- [ ] **Verify**

```bash
pnpm --filter @secure-cbt/shared run typecheck
pnpm --filter @secure-cbt/backend run typecheck
```

- [ ] **Commit**

```bash
git add packages/shared/src/schemas/auth.schema.ts apps/backend/src/modules/auth/auth.service.ts
git commit -m("security: add password strength validation with Indonesian error messages")
```

---

### Task 3.4: Extract shared helpers (paginate, userResolver, studentResolver)

**Files:**
- Create: `apps/backend/src/common/helpers/pagination.helper.ts`
- Create: `apps/backend/src/common/helpers/user-resolver.helper.ts`
- Modify: All services that duplicate pagination code
- Modify: All services that resolve student/teacher ID from user_id

**Problems:** Pagination boilerplate in 5+ services; user→student/teacher resolution in 8+ places.

- [ ] **Create pagination helper**

```typescript
// apps/backend/src/common/helpers/pagination.helper.ts:
export interface PaginationParams {
  page: number;
  perPage: number;
  skip: number;
}

export interface PaginationMeta {
  page: number;
  perPage: number;
  total: number;
  totalPages: number;
}

export function parsePagination(query: { page?: string; per_page?: string }): PaginationParams {
  const page = Math.max(1, Number(query.page) || 1);
  const perPage = Math.min(100, Math.max(1, Number(query.per_page) || 20));
  return { page, perPage, skip: (page - 1) * perPage };
}

export function buildMeta(total: number, params: PaginationParams): PaginationMeta {
  return {
    page: params.page,
    perPage: params.perPage,
    total,
    totalPages: Math.ceil(total / params.perPage),
  };
}
```

- [ ] **Create user resolver helper**

```typescript
// apps/backend/src/common/helpers/user-resolver.helper.ts:
import { PrismaService } from '../../prisma/prisma.service';

export async function resolveStudentId(prisma: PrismaService, userId: string): Promise<string> {
  const student = await prisma.student.findUnique({
    where: { user_id: userId },
    select: { id: true },
  });
  if (!student) throw new NotFoundException('Data siswa tidak ditemukan');
  return student.id;
}

export async function resolveTeacherId(prisma: PrismaService, userId: string): Promise<string> {
  const teacher = await prisma.teacher.findUnique({
    where: { user_id: userId },
    select: { id: true },
  });
  if (!teacher) throw new NotFoundException('Data guru tidak ditemukan');
  return teacher.id;
}
```

- [ ] **Refactor 5+ services to use pagination helper**

```typescript
// Example: user.service.ts:
const { skip, page, perPage } = parsePagination(query);
const [data, total] = await Promise.all([
  this.prisma.user.findMany({ skip, take: perPage, ... }),
  this.prisma.user.count(),
]);
return { data, meta: buildMeta(total, { page, perPage, skip }) };
```

- [ ] **Refactor 8+ service methods to use resolveStudentId/resolveTeacherId**

```typescript
// session.service.ts, start():
const studentId = await resolveStudentId(this.prisma, userId);
```

- [ ] **Verify**

```bash
pnpm --filter @secure-cbt/backend run typecheck
```

- [ ] **Commit**

```bash
git add apps/backend/src/common/helpers/ apps/backend/src/modules/
git commit -m("refactor: extract pagination and user-resolver helpers, remove duplicated code from 5+ services")
```

---

## Phase 4: Shared Package Consolidation

### Task 4.1: Delete DTOs, derive types from Zod schemas

**Files:**
- Delete: All `packages/shared/src/dto/*.ts` (13 files)
- Modify: `packages/shared/src/index.ts` (remove DTO exports, add `z.infer` type exports)
- Modify: All backend services that import from DTOs
- Modify: All dashboard pages that define their own types

**Problem:** 26 files (DTOs + Zod schemas) for same data. Every field change needs edits in 2 places.

- [ ] **For each DTO file, verify the Zod schema covers all fields.** If missing, add to schema.

- [ ] **Delete all 13 `dto/*.ts` files**

- [ ] **Add `z.infer` type exports to shared package index**

```typescript
// packages/shared/src/index.ts:
import { z } from 'zod';
import { createStudentSchema, updateStudentSchema } from './schemas/student.schema';
import { createExamSchema, updateExamSchema } from './schemas/exam.schema';
// ... etc

export type CreateStudentInput = z.infer<typeof createStudentSchema>;
export type UpdateStudentInput = z.infer<typeof updateStudentSchema>;
export type CreateExamInput = z.infer<typeof createExamSchema>;
export type UpdateExamInput = z.infer<typeof updateExamSchema>;
// ... etc
```

- [ ] **Update all backend services to use `z.infer` types instead of DTO imports**

```typescript
// student.service.ts:
import { CreateStudentInput, UpdateStudentInput } from '@secure-cbt/shared';

async create(dto: CreateStudentInput) { ... }
async update(id: string, dto: UpdateStudentInput) { ... }
```

- [ ] **Remove `zod` unused import from auth.dto.ts** (after deleting the file, this is handled)

- [ ] **Verify**

```bash
pnpm --filter @secure-cbt/shared run build
pnpm --filter @secure-cbt/backend run typecheck
```

- [ ] **Commit**

```bash
git add packages/shared/src/ apps/backend/src/
git rm packages/shared/src/dto/*.ts
git commit -m("refactor: delete DTOs, use Zod z.infer for types — eliminates 26 files of duplication")
```

---

### Task 4.2: Unify SocketEvent and EventNames into one source

**Files:**
- Modify: `packages/shared/src/enums/index.ts` (SocketEvent enum)
- Modify: `packages/shared/src/constants/events.ts` (EventNames object)
- Modify: All places that import EventNames

**Problem:** Two sources of truth for event names. They will drift.

- [ ] **Choose SocketEvent as the canonical source** (it's used by the gateway)

- [ ] **Delete `constants/events.ts`**, move any missing events into SocketEvent enum

- [ ] **Update all imports from `../constants/events` to `../enums`** in gateway, services, etc.

- [ ] **Remove dead `ConnectivityState` enum** (zero imports across monorepo)

- [ ] **Verify using grep**

```bash
grep -r "EventNames\|ConnectivityState" apps/ packages/ --include="*.ts" | grep -v node_modules
```

Expected output: no matches

```bash
pnpm --filter @secure-cbt/shared run build
pnpm --filter @secure-cbt/backend run typecheck
```

- [ ] **Commit**

```bash
git add packages/shared/src/enums/index.ts packages/shared/src/constants/
git commit -m("refactor: unify SocketEvent and EventNames, remove ConnectivityState dead code")
```

---

### Task 4.3: Translate Zod error messages to Bahasa Indonesia

**Files:**
- Modify: All 13 `packages/shared/src/schemas/*.schema.ts`

**Problem:** All validation errors show in English. Platform target is Indonesian.

- [ ] **Update all string schemas with Indonesian messages**

```typescript
// Example: student.schema.ts:
export const createStudentSchema = z.object({
  nis: z.string()
    .min(1, { message: 'NIS wajib diisi' })
    .max(30, { message: 'NIS maksimal 30 karakter' }),
  full_name: z.string()
    .min(1, { message: 'Nama lengkap wajib diisi' })
    .max(200, { message: 'Nama lengkap maksimal 200 karakter' }),
  class_id: z.string().uuid({ message: 'Kelas tidak valid' }),
  status: z.nativeEnum(StudentStatus, { errorMap: () => ({ message: 'Status siswa tidak valid' }) }),
});
```

- [ ] **Update all number/date schemas**

```typescript
// exam.schema.ts:
export const createExamSchema = z.object({
  title: z.string().min(1, { message: 'Judul ujian wajib diisi' }).max(200, { message: 'Judul ujian maksimal 200 karakter' }),
  subject_id: z.string().uuid({ message: 'Mata pelajaran tidak valid' }),
  duration_minutes: z.number().int().min(1, { message: 'Durasi minimal 1 menit' }).max(600, { message: 'Durasi maksimal 10 jam' }),
  start_at: z.string().datetime({ message: 'Waktu mulai tidak valid' }),
  end_at: z.string().datetime({ message: 'Waktu selesai tidak valid' }),
  warning_limit: z.number().int().min(1).max(10).default(3),
  passing_grade: z.number().int().min(0, { message: 'Nilai minimal 0' }).max(100, { message: 'Nilai maksimal 100' }),
  randomize_questions: z.boolean().default(false),
  randomize_answers: z.boolean().default(false),
});
```

- [ ] **Verify**

```bash
pnpm --filter @secure-cbt/shared run build
```

- [ ] **Commit**

```bash
git add packages/shared/src/schemas/
git commit -m("i18n: translate all Zod validation errors to Bahasa Indonesia")
```

---

### Task 4.4: Add missing UpdateClass/UpdateSubject DTOs + schemas + `z.infer` types

**Files:**
- Modify: `packages/shared/src/schemas/academic.schema.ts`
- Modify: `apps/backend/src/modules/academic/academic.service.ts`
- Modify: `apps/backend/src/modules/academic/academic.controller.ts`

**Problem:** Class and subject updates have no Zod validation and no typed DTOs.

- [ ] **Add Zod schemas for update**

```typescript
// academic.schema.ts:
export const updateClassSchema = z.object({
  name: z.string().min(1, { message: 'Nama kelas wajib diisi' }).max(50, { message: 'Nama kelas maksimal 50 karakter' }).optional(),
  grade_level: z.number().int().min(10, { message: 'Tingkat kelas tidak valid' }).max(13).optional(),
  major_id: z.string().uuid({ message: 'Jurusan tidak valid' }).optional().nullable(),
});

export const updateSubjectSchema = z.object({
  name: z.string().min(1, { message: 'Nama mata pelajaran wajib diisi' }).max(100).optional(),
  code: z.string().min(1).max(20).optional(),
  major_id: z.string().uuid().optional().nullable(),
});
```

- [ ] **Export `z.infer` types from shared index**

```typescript
export type UpdateClassInput = z.infer<typeof updateClassSchema>;
export type UpdateSubjectInput = z.infer<typeof updateSubjectSchema>;
```

- [ ] **Update academic service to use typed DTOs**

```typescript
// academic.service.ts:
import { UpdateClassInput, UpdateSubjectInput } from '@secure-cbt/shared';

async updateClass(id: string, dto: UpdateClassInput) {
  const validated = updateClassSchema.parse(dto);
  // ...
}

async updateSubject(id: string, dto: UpdateSubjectInput) {
  const validated = updateSubjectSchema.parse(dto);
  // ...
}
```

- [ ] **Update academic controller to accept typed body**

```typescript
// academic.controller.ts:
@Patch('classes/:id')
async updateClass(@Param('id') id: string, @Body() body: any) {
  return this.academicService.updateClass(id, body);
}

@Patch('subjects/:id')
async updateSubject(@Param('id') id: string, @Body() body: any) {
  return this.academicService.updateSubject(id, body);
}
```

- [ ] **Verify**

```bash
pnpm --filter @secure-cbt/shared run build
pnpm --filter @secure-cbt/backend run typecheck
```

- [ ] **Commit**

```bash
git add packages/shared/src/schemas/academic.schema.ts apps/backend/src/modules/academic/
git commit -m("feat: add UpdateClass/UpdateSubject Zod schemas and typed endpoints")
```

---

## Phase 5: Dashboard Structural Refactoring

### Task 5.1: Create shared Modal component from Radix UI

**Files:**
- Create: `apps/dashboard/src/components/ui/modal.tsx`
- Modify: All page files that inline dialogs (students, teachers, academic, questions, exams)

**Problem:** 10+ inline dialog implementations with ~90% identical boilerplate. Radix dialog in deps but unused.

- [ ] **Create Modal wrapper component**

```typescript
// apps/dashboard/src/components/ui/modal.tsx:
'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export function Modal({ open, onClose, title, description, children, footer }: ModalProps) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        {children}
        {footer && <DialogFooter>{footer}</DialogFooter>}
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Check if Radix dialog components exist in `components/ui/dialog.tsx`** — if not, add via Shadcn CLI:

```bash
cd apps/dashboard && npx shadcn-ui@latest add dialog
```

- [ ] **Refactor StudentDialog to use Modal** (63 lines → ~20 lines)

```typescript
// students/page.tsx, inline StudentDialog replaced with:
<Modal open={isOpen} onClose={onClose} title={editing ? 'Edit Siswa' : 'Tambah Siswa'}>
  <div className="space-y-4">
    <Input label="NIS" value={form.nis} onChange={...} />
    <Input label="Nama Lengkap" value={form.full_name} onChange={...} />
    <Select label="Kelas" options={classOptions} value={form.class_id} onChange={...} />
    <Select label="Status" options={statusOptions} value={form.status} onChange={...} />
  </div>
  <div className="flex justify-end gap-3 mt-6">
    <Button variant="outline" onClick={onClose}>Batal</Button>
    <Button onClick={handleSave}>{editing ? 'Simpan' : 'Tambah'}</Button>
  </div>
</Modal>
```

- [ ] **Repeat for TeacherDialog, YearDialog, MajorDialog, ClassDialog, SubjectDialog**

- [ ] **Verify**

```bash
pnpm --filter @secure-cbt/dashboard run lint
```

- [ ] **Commit**

```bash
git add apps/dashboard/src/components/ui/modal.tsx apps/dashboard/src/app/dashboard/
git commit -m("refactor: create shared Modal component, refactor 10+ inline dialogs to use it")
```

---

### Task 5.2: Extract custom data-fetching hooks

**Files:**
- Create: `apps/dashboard/src/hooks/use-subjects.ts`
- Create: `apps/dashboard/src/hooks/use-classes.ts`
- Create: `apps/dashboard/src/hooks/use-exams.ts`
- Create: `apps/dashboard/src/hooks/use-students.ts`
- Create: `apps/dashboard/src/hooks/use-question-banks.ts`
- Create: `apps/dashboard/src/lib/api-service.ts`
- Modify: All page files that use inline `useQuery`

**Problem:** Query keys duplicated (e.g., `['subjects']` vs `['dashboard-subjects']`). API URL strings scattered. No cache sharing between pages.

- [ ] **Create typed API service layer**

```typescript
// apps/dashboard/src/lib/api-service.ts:
import { api } from '@/lib/api';

export const academicApi = {
  getClasses: (params?: Record<string, unknown>) => api.get('/academic/classes', { params }),
  getSubjects: (params?: Record<string, unknown>) => api.get('/academic/subjects', { params }),
  getMajors: (params?: Record<string, unknown>) => api.get('/academic/majors', { params }),
  getYears: (params?: Record<string, unknown>) => api.get('/academic/years', { params }),
};

export const studentApi = {
  getAll: (params?: Record<string, unknown>) => api.get('/students', { params }),
  create: (data: unknown) => api.post('/students', data),
  update: (id: string, data: unknown) => api.patch(`/students/${id}`, data),
  delete: (id: string) => api.delete(`/students/${id}`),
};

export const examApi = { ... };
export const questionBankApi = { ... };
export const teacherApi = { ... };
export const reportApi = { ... };
export const monitoringApi = { ... };
```

- [ ] **Create useSubjects hook**

```typescript
// apps/dashboard/src/hooks/use-subjects.ts:
import { useQuery } from '@tanstack/react-query';
import { academicApi } from '@/lib/api-service';
import type { Subject } from '@secure-cbt/shared';

export function useSubjects() {
  return useQuery<Subject[]>({
    queryKey: ['subjects'],
    queryFn: async () => {
      const res = await academicApi.getSubjects();
      return res.data.data;
    },
    staleTime: 5 * 60 * 1000,
  });
}
```

- [ ] **Create useClasses, useExams, useStudents, useQuestionBanks hooks** (same pattern)

- [ ] **Refactor all page files to use hooks**

```typescript
// Instead of inline useQuery in every page:
const { data: subjects } = useSubjects();
const { data: classes } = useClasses();
```

- [ ] **Verify**

```bash
pnpm --filter @secure-cbt/dashboard run lint
```

- [ ] **Commit**

```bash
git add apps/dashboard/src/hooks/ apps/dashboard/src/lib/api-service.ts apps/dashboard/src/app/dashboard/
git commit -m("refactor: extract typed API service layer and data-fetching hooks — eliminates query key duplication across 7 pages")
```

---

### Task 5.3: Add error boundaries and role guard HOC

**Files:**
- Create: `apps/dashboard/src/components/ui/error-boundary.tsx`
- Modify: `apps/dashboard/src/app/dashboard/layout.tsx`
- Modify: All 7 page files (remove inline useEffect role guards)

**Problems:** Zero error boundaries = white screen on crash. 7 duplicated role guard effects.

- [ ] **Create ErrorBoundary component**

```typescript
// apps/dashboard/src/components/ui/error-boundary.tsx:
'use client';

import { Component, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';

interface Props { children: ReactNode; fallback?: ReactNode; }
interface State { hasError: boolean; error?: Error; }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error) { return { hasError: true, error }; }

  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <AlertTriangle className="h-12 w-12 text-destructive" />
          <h2 className="text-xl font-semibold">Terjadi Kesalahan</h2>
          <p className="text-muted-foreground text-sm">{this.state.error?.message}</p>
          <Button onClick={() => this.setState({ hasError: false })}>Coba Lagi</Button>
        </div>
      );
    }
    return this.props.children;
  }
}
```

- [ ] **Wrap page content in each page with `<ErrorBoundary>`**

```typescript
// Each page.tsx:
<ErrorBoundary>
  <div className="space-y-6">
    {/* existing page content */}
  </div>
</ErrorBoundary>
```

- [ ] **Replace 7 inline useEffect guards with a hook**

```typescript
// apps/dashboard/src/hooks/use-role-guard.ts:
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth.store';
import type { UserRole } from '@secure-cbt/shared';

export function useRoleGuard(allowedRoles: UserRole[]) {
  const { user, isAuthenticated } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (user && !allowedRoles.includes(user.role)) {
      router.replace('/dashboard');
    }
  }, [user, allowedRoles, router]);

  return { user, isAuthenticated };
}
```

```typescript
// In each page:
const { user } = useRoleGuard([UserRole.ADMIN, UserRole.TEACHER]);
```

- [ ] **Verify**

```bash
pnpm --filter @secure-cbt/dashboard run lint
```

- [ ] **Commit**

```bash
git add apps/dashboard/src/components/ui/error-boundary.tsx apps/dashboard/src/hooks/use-role-guard.ts apps/dashboard/src/app/dashboard/
git commit -m("feat: add ErrorBoundary and useRoleGuard hook, replace 7 duplicated useEffect guards")
```

---

### Task 5.4: Split questions and exams pages (600+ line files)

**Files:**
- Split: `apps/dashboard/src/app/dashboard/questions/page.tsx` → extract `QuestionModal` component
- Split: `apps/dashboard/src/app/dashboard/exams/page.tsx` → extract `CreateExamModal` component
- Create: `apps/dashboard/src/components/questions/question-modal.tsx`
- Create: `apps/dashboard/src/components/exams/create-exam-modal.tsx`
- Create: `apps/dashboard/src/components/exams/exam-steps/`

**Problems:** 618-line and 615-line files with massive inline modals.

- [ ] **Extract QuestionModal into its own component file**

- [ ] **Split CreateExamModal into step components** (BasicInfoStep, ClassesStep, QuestionsStep, SettingsStep)

- [ ] **Extract WIB/UTC date conversion to shared utility**

```typescript
// apps/dashboard/src/lib/date-utils.ts:
export function toWIB(date: Date | string): Date {
  const d = new Date(date);
  return new Date(d.getTime() + 7 * 60 * 60 * 1000);
}

export function formatDateWIB(date: Date | string): string {
  return new Intl.DateTimeFormat('id-ID', {
    timeZone: 'Asia/Jakarta',
    dateStyle: 'full',
    timeStyle: 'short',
  }).format(new Date(date));
}

export function dateToDatetimeLocal(date: Date): string {
  const wib = toWIB(date);
  return wib.toISOString().slice(0, 16);
}

export function datetimeLocalToUTC(local: string): string {
  const wib = new Date(local + ':00+07:00');
  return wib.toISOString();
}
```

- [ ] **Verify**

```bash
pnpm --filter @secure-cbt/dashboard run lint
```

- [ ] **Commit**

```bash
git add apps/dashboard/src/components/questions/ apps/dashboard/src/components/exams/ apps/dashboard/src/lib/date-utils.ts apps/dashboard/src/app/dashboard/questions/ apps/dashboard/src/app/dashboard/exams/
git commit -m("refactor: split 600+ line pages into focused components, extract WIB date utils")
```

---

## Phase 6: Mobile Structural Refactoring

### Task 6.1: Split 705-line exam_screen.dart

**Files:**
- Modify: `apps/mobile/lib/features/exam/presentation/screens/exam_screen.dart`
- Create: `apps/mobile/lib/features/exam/presentation/widgets/exam_question_card.dart`
- Create: `apps/mobile/lib/features/exam/presentation/widgets/exam_bottom_bar.dart`
- Create: `apps/mobile/lib/features/exam/presentation/widgets/exam_app_bar.dart`
- Create: `apps/mobile/lib/features/exam/presentation/widgets/submit_dialog.dart`

**Problem:** 705 lines — network calls, business logic, socket, and widgets all in one file.

- [ ] **Extract ExamQuestionCard widget**

```dart
// exam_question_card.dart:
class ExamQuestionCard extends StatelessWidget {
  final QuestionData question;
  final String? selectedAnswer;
  final ValueChanged<String> onAnswer;
  final bool isFlagged;
  final VoidCallback onToggleFlag;

  Widget build(BuildContext context) {
    return SingleChildScrollView(
      padding: EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Question number, flag button, question text
          // Options list (radio buttons for single choice, checkboxes for multi)
        ],
      ),
    );
  }
}
```

- [ ] **Extract ExamBottomBar**

```dart
// exam_bottom_bar.dart:
class ExamBottomBar extends StatelessWidget {
  final int currentIndex;
  final int totalQuestions;
  final Set<String> flagged;
  final VoidCallback onPaletteTap;
  final VoidCallback onSubmit;

  Widget build(BuildContext context) {
    return Container(
      padding: EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      child: Row(
        children: [
          // Question counter "3/10"
          // Flag icon button
          // Palette button "📋"
          // Spacer
          // Submit button
        ],
      ),
    );
  }
}
```

- [ ] **Extract ExamAppBar**

```dart
// exam_app_bar.dart:
class ExamAppBar extends StatelessWidget implements PreferredSizeWidget {
  final int warningCount;
  final int warningLimit;

  Widget build(BuildContext context) {
    return AppBar(
      title: Text('Ujian'),
      actions: [
        // Warning badge chip
      ],
    );
  }
}
```

- [ ] **Extract SubmitDialog**

```dart
// submit_dialog.dart:
class SubmitDialog {
  static Future<bool> show(BuildContext context) {
    return showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text('Submit Exam'),
        content: Text('Are you sure you want to submit?'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: Text('Cancel')),
          ElevatedButton(onPressed: () => Navigator.pop(ctx, true), child: Text('Submit')),
        ],
      ),
    ) ?? false;
  }
}
```

- [ ] **Wire up in exam_screen.dart** (reduces from 705 to ~200 lines)

- [ ] **Fix `_forceSubmit` error handling: don't navigate on failure**

```dart
Future<void> _forceSubmit() async {
  if (_submitting) return;
  _submitting = true;
  try {
    await _dio.post('/sessions/submit', data: { ... });
    ref.read(examProvider.notifier).markSubmitted();
    if (mounted) context.goNamed('result');
  } catch (e) {
    _submitting = false;
    AppLogger.error('Force submit failed', e);
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Gagal mengumpulkan ujian. Coba lagi.')),
      );
    }
  }
}
```

- [ ] **Pause timer on app background**

```dart
// exam_screen.dart, _onLifecycleChange:
void _onLifecycleChange(AppLifecycleState state) {
  if (state == AppLifecycleState.paused || state == AppLifecycleState.inactive) {
    ref.read(examProvider.notifier).pauseTimer();
  } else if (state == AppLifecycleState.resumed) {
    ref.read(examProvider.notifier).resumeTimer();
  }
}
```

- [ ] **Verify**

```bash
cd apps/mobile && flutter analyze
```

- [ ] **Commit**

```bash
git add apps/mobile/lib/features/exam/
git commit -m("refactor: split 705-line exam_screen into focused widgets, fix force-submit error handling, pause timer on background")
```

---

### Task 6.2: Wire up or delete Drift offline database

**Files:**
- Modify: `apps/mobile/lib/features/exam/providers/exam_provider.dart`
- Modify: `apps/mobile/lib/core/database/local_database.dart`
- Create: `apps/mobile/lib/core/database/database_provider.dart`

**Problems:** 107 lines of dead code. Offline-first architecture is non-functional.

- [ ] **Create Riverpod provider for LocalDatabase**

```dart
// apps/mobile/lib/core/database/database_provider.dart:
import 'package:riverpod/riverpod.dart';
import 'local_database.dart';

final localDatabaseProvider = Provider<LocalDatabase>((ref) {
  final db = LocalDatabase();
  ref.onDispose(() => db.close());
  return db;
});
```

- [ ] **Update saveAnswer to write locally first, then sync**

```dart
// exam_provider.dart, saveAnswer():
Future<void> saveAnswer({
  required String questionId,
  required String answer,
}) async {
  state = state.copyWith(answers: {...state.answers, questionId: answer});

  // Write locally first
  try {
    await ref.read(localDatabaseProvider).saveAnswer(
      sessionId: state.sessionId!,
      questionId: questionId,
      answer: answer,
    );
  } catch (e) {
    AppLogger.error('Failed to save locally', e);
  }

  // Sync to server
  try {
    await dio.post('/answers/save', data: {
      'exam_session_id': state.sessionId,
      'question_id': questionId,
      'answer': answer,
    });
    // Mark synced
    await ref.read(localDatabaseProvider).markSynced(state.sessionId!, questionId);
  } catch (e) {
    AppLogger.debug('Network unavailable, queued locally', e);
  }
}
```

- [ ] **Add syncPendingAnswers on session start**

```dart
// exam_provider.dart, loadSession():
Future<void> loadSession(String sessionId, Dio dio) async {
  // Sync pending answers first
  final pending = await ref.read(localDatabaseProvider).getPendingAnswers();
  if (pending.isNotEmpty) {
    // batch sync
    await dio.post('/answers/batch-sync', data: { ... });
  }
  // ... continue with normal session load
}
```

- [ ] **Verify**

```bash
cd apps/mobile && flutter analyze
```

- [ ] **Commit**

```bash
git add apps/mobile/lib/core/database/ apps/mobile/lib/features/exam/providers/
git commit -m("feat: wire up Drift offline database — write locally first, sync async, retry pending on session start")
```

---

### Task 6.3: Fix router auth redirect (stale closure) and add route constants

**Files:**
- Modify: `apps/mobile/lib/app/router.dart`
- Create: `apps/mobile/lib/app/route_names.dart`

**Problems:** Auth redirect closes over stale value. Route names are raw strings everywhere.

- [ ] **Create route name constants**

```dart
// apps/mobile/lib/app/route_names.dart:
class RouteNames {
  static const login = 'login';
  static const home = 'home';
  static const exams = 'exams';
  static const history = 'history';
  static const profile = 'profile';
  static const examDetail = 'exam-detail';
  static const token = 'token';
  static const exam = 'exam';
  static const result = 'result';
}
```

- [ ] **Fix router to read auth state inside redirect callback**

```dart
// router.dart:
final routerProvider = Provider<GoRouter>((ref) {
  return GoRouter(
    initialLocation: '/login',
    redirect: (context, state) {
      final authState = ref.read(authProvider);  // read, not watch
      final isLoggedIn = authState.isAuthenticated;
      final isOnLogin = state.matchedLocation == '/login';
      final isOnAuthPage = state.matchedLocation.startsWith('/token') ||
                           state.matchedLocation.startsWith('/exam');

      if (!isLoggedIn && !isOnLogin) return '/login';
      if (isLoggedIn && isOnLogin) return '/home';
      return null;
    },
    routes: [
      GoRoute(path: '/login', name: RouteNames.login, builder: ...),
      // ...
    ],
  );
});
```

- [ ] **Verify**

```bash
cd apps/mobile && flutter analyze
```

- [ ] **Commit**

```bash
git add apps/mobile/lib/app/router.dart apps/mobile/lib/app/route_names.dart
git commit -m("fix: read auth state inside redirect callback, add route name constants")
```

---

### Task 6.4: Extract WIB utils and shared widgets

**Files:**
- Create: `apps/mobile/lib/core/utils/date_utils.dart`
- Create: `apps/mobile/lib/core/widgets/app_card.dart`
- Create: `apps/mobile/lib/core/widgets/app_icon_box.dart`
- Create: `apps/mobile/lib/core/widgets/empty_state.dart`
- Modify: All screens that duplicate these patterns

**Problems:** WIB conversion duplicated in 3+ files. Card/icon/empty-state patterns rebuilt inline.

- [ ] **Create date utils**

```dart
// apps/mobile/lib/core/utils/date_utils.dart:
import 'package:intl/intl.dart';

const _wibOffset = Duration(hours: 7);

DateTime toWIB(DateTime utc) => utc.add(_wibOffset);

String formatDateTimeWIB(DateTime utc) {
  final wib = toWIB(utc);
  return DateFormat('dd MMMM yyyy, HH:mm', 'id_ID').format(wib) + ' WIB';
}

String formatDateWIB(DateTime utc) {
  final wib = toWIB(utc);
  return DateFormat('dd MMMM yyyy', 'id_ID').format(wib) + ' WIB';
}
```

- [ ] **Create AppCard, AppIconBox, EmptyState widgets**

- [ ] **Refactor all screens to use shared widgets**

- [ ] **Verify**

```bash
cd apps/mobile && flutter analyze
```

- [ ] **Commit**

```bash
git add apps/mobile/lib/core/utils/ apps/mobile/lib/core/widgets/ apps/mobile/lib/features/
git commit -m("refactor: extract shared WIB date utils, AppCard, AppIconBox, EmptyState widgets")
```

---

## Phase 7: Testing

### Task 7.1: Add unit tests for critical backend services

**Files:**
- Create: `apps/backend/src/modules/session/__tests__/session.service.spec.ts`
- Create: `apps/backend/src/modules/grading/__tests__/grading.service.spec.ts`
- Create: `apps/backend/src/modules/answer/__tests__/answer.service.spec.ts`
- Create: `apps/backend/src/modules/auth/__tests__/auth.service.spec.ts`

**Problem:** Zero unit tests across 14 service files.

- [ ] **Add Vitest unit test config**

```typescript
// apps/backend/vitest.config.ts:
import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/__tests__/**/*.spec.ts'],
    root: '.',
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, 'src') },
  },
});
```

- [ ] **Write session.service tests** (start, resume, submit, autoSubmit)

```typescript
// session.service.spec.ts:
import { Test, TestingModule } from '@nestjs/testing';
import { SessionService } from '../session.service';
import { PrismaService } from '@/common/prisma/prisma.service';
import { GradingService } from '@/modules/grading/grading.service';
import { MonitoringGateway } from '@/modules/monitoring/monitoring.gateway';
import { BadRequestException, NotFoundException } from '@nestjs/common';

describe('SessionService', () => {
  let service: SessionService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SessionService,
        { provide: PrismaService, useValue: { $transaction: jest.fn(), examSession: { findUnique: jest.fn(), create: jest.fn(), update: jest.fn() }, exam: { findUnique: jest.fn() }, student: { findUnique: jest.fn() } } },
        { provide: GradingService, useValue: { calculateTotalScore: jest.fn() } },
        { provide: MonitoringGateway, useValue: { notifySessionFinished: jest.fn() } },
      ],
    }).compile();

    service = module.get<SessionService>(SessionService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  describe('start', () => {
    it('should throw BadRequestException for already completed exam', async () => {
      jest.spyOn(prisma.examSession, 'findFirst').mockResolvedValue({ status: 'SUBMITTED' } as any);
      await expect(service.start('token', 'userId')).rejects.toThrow(BadRequestException);
    });

    it('should create a new session for valid token', async () => {
      jest.spyOn(prisma.exam, 'findUnique').mockResolvedValue({ id: 'exam1', duration_minutes: 60, status: 'PUBLISHED', start_at: new Date(Date.now() - 10000), end_at: new Date(Date.now() + 3600000) } as any);
      jest.spyOn(prisma.student, 'findUnique').mockResolvedValue({ id: 'student1' } as any);
      jest.spyOn(prisma.examSession, 'findFirst').mockResolvedValue(null);
      jest.spyOn(prisma.examSession, 'create').mockResolvedValue({ id: 'session1' } as any);
      const result = await service.start('validToken', 'userId');
      expect(result).toBeDefined();
    });
  });
});
```

- [ ] **Write grading.service tests** (gradeEssay, calculateTotalScore with transaction)

- [ ] **Write answer.service tests** (batchSync with transaction rollback)

- [ ] **Write auth.service tests** (login, refresh, token rotation)

- [ ] **Verify**

```bash
pnpm --filter @secure-cbt/backend run test
```

- [ ] **Commit**

```bash
git add apps/backend/vitest.config.ts apps/backend/src/modules/*/__tests__/
git commit -m("test: add unit tests for session, grading, answer, and auth services")
```

---

### Task 7.2: Add comprehensive E2E tests

**Files:**
- Modify: `apps/backend/test/auth.e2e-spec.ts`
- Modify: `apps/backend/test/exam.e2e-spec.ts`
- Create: `apps/backend/test/session.e2e-spec.ts`
- Create: `apps/backend/test/grading.e2e-spec.ts`
- Create: `apps/backend/test/academic.e2e-spec.ts`

**Problems:** Only 2 E2E files. Missing sessions, grading, reports, monitoring, academic CRUD.

- [ ] **Add student session flow E2E test** (login → get token → start → answer → submit → resume)

```typescript
// session.e2e-spec.ts:
describe('Session Flow (e2e)', () => {
  let app: INestApplication;
  let studentToken: string;
  let sessionId: string;

  beforeAll(async () => {
    // Bootstrap app
    // Login as student
    const loginRes = await request(app.getHttpServer()).post('/auth/login').send({ username: '1234567890', password: '1234567890' });
    studentToken = loginRes.body.data.access_token;
  });

  it('should start a session with valid token', async () => {
    const res = await request(app.getHttpServer()).post('/sessions/start').set('Authorization', `Bearer ${studentToken}`).send({ token: '83F4D2B0' });
    expect(res.status).toBe(201);
    expect(res.body.data.questions).toBeDefined();
    sessionId = res.body.data.sessionId;
  });

  it('should save an answer', async () => { ... });
  it('should submit the exam', async () => { ... });
  it('should reject retake after submission', async () => { ... });
});
```

- [ ] **Add academic CRUD E2E tests** (create/update/delete years, majors, classes, subjects)

- [ ] **Add grading E2E tests** (essay scoring, auto-grade, grade calculation)

- [ ] **Clean up beforeAll/beforeEach hooks** — remove cleanup for auth-only tests, use beforeAll, remove hardcoded UUIDs

- [ ] **Verify**

```bash
pnpm --filter @secure-cbt/backend run test:e2e
```

- [ ] **Commit**

```bash
git add apps/backend/test/
git commit -m("test: add E2E tests for session flow, academic CRUD, grading; clean up test infrastructure")
```

---

## Phase 8: Polish & Medium Issues

### Task 8.1: Add Prisma indexes for query performance

**Files:**
- Modify: `apps/backend/prisma/schema.prisma`

- [ ] **Add indexes**

```prisma
// schema.prisma:
model SessionLog {
  @@index([exam_session_id])
}

model ExamSession {
  @@index([status])
}

model Question {
  @@index([question_bank_id])
}

model QuestionOption {
  @@index([question_id])
}

model Score {
  @@index([exam_session_id])
}
```

- [ ] **Run migration**

```bash
npx prisma migrate dev --name add_performance_indexes
```

- [ ] **Commit**

```bash
git add apps/backend/prisma/
git commit -m("perf: add database indexes for frequently queried columns")
```

---

### Task 8.2: Add soft-delete to academic entities

**Files:**
- Modify: `apps/backend/prisma/schema.prisma`
- Modify: `apps/backend/src/modules/academic/academic.service.ts`
- Modify: `apps/backend/src/modules/academic/academic.controller.ts`

- [ ] **Add `deleted_at` to AcademicYear, Major, Class, Subject**

```prisma
model AcademicYear {
  deleted_at DateTime?
}
model Major {
  deleted_at DateTime?
}
model Class {
  deleted_at DateTime?
}
model Subject {
  deleted_at DateTime?
}
```

- [ ] **Update delete methods to soft-delete**

```typescript
// academic.service.ts, deleteMajor:
async deleteMajor(id: string) {
  await this.prisma.major.update({ where: { id }, data: { deleted_at: new Date() } });
  return { success: true, message: 'Jurusan berhasil dihapus' };
}
```

- [ ] **Add `where: { deleted_at: null }` filters to findAll queries**

- [ ] **Run migration**

```bash
npx prisma migrate dev --name add_soft_delete_academic
```

- [ ] **Commit**

```bash
git add apps/backend/prisma/ apps/backend/src/modules/academic/
git commit -m("feat: add soft-delete to academic entities (years, majors, classes, subjects)")
```

---

### Task 8.3: Connect SecurityDefaults to Throttler config

**Files:**
- Modify: `apps/backend/src/app.module.ts`
- Modify: `packages/shared/src/constants/security.ts`

- [ ] **Import and use SecurityDefaults in app.module.ts**

```typescript
// app.module.ts:
import { SecurityDefaults } from '@secure-cbt/shared';

ThrottlerModule.forRoot([{
  ttl: parseInt(process.env.THROTTLE_TTL, 10) || SecurityDefaults.RATE_LIMIT_TTL,
  limit: parseInt(process.env.THROTTLE_LIMIT, 10) || SecurityDefaults.RATE_LIMIT_PER_MINUTE,
}]),
```

- [ ] **Commit**

```bash
git add apps/backend/src/app.module.ts packages/shared/src/constants/security.ts
git commit -m("feat: wire SecurityDefaults to Throttler config")
```

---

### Task 8.4: Fix remaining low-severity issues

**Files:** Various

- [ ] **Remove unnecessary `@Inject()` decorators** from auth/exam controllers and services
- [ ] **Fix console.log in e2e test** (`exam.e2e-spec.ts:240`)
- [ ] **Fix dashboard `useMemo` in reports page** (`reports/page.tsx:107`)
- [ ] **Use `UserRole.ADMIN` enum instead of `'ADMIN'` string** (`dashboard/page.tsx:190`)
- [ ] **Login screen error handling** — use proper regex instead of `replaceAll('Exception: ', '')` (`login_screen.dart:41`)
- [ ] **Fix `Spinner`/`Badge` component misplacement** from `table.tsx` to separate files
- [ ] **Verify**

```bash
pnpm -r run typecheck
pnpm -r run lint
```

- [ ] **Commit**

```bash
git add apps/backend/src/ apps/dashboard/src/ apps/mobile/lib/features/auth/presentation/screens/login_screen.dart apps/dashboard/src/components/ui/
git commit -m("chore: fix various low-severity issues — remove unnecessary @Inject, fix console.log, enum consistency, component placement")
```

---

## Summary

| Phase | Tasks | Issues Fixed | Effort |
|-------|-------|-------------|--------|
| P1: Data Integrity | 5 | 8 critical bugs | 1-2 days |
| P2: Config/Infra | 2 | 10 critical/high issues | 0.5 day |
| P3: Backend Cleanup | 4 | 15 structural issues | 1-2 days |
| P4: Shared Consolidation | 4 | 15 duplication issues | 1 day |
| P5: Dashboard Refactor | 4 | 12 structural issues | 2-3 days |
| P6: Mobile Refactor | 4 | 14 structural issues | 2-3 days |
| P7: Testing | 2 | 3 critical gaps | 2-3 days |
| P8: Polish | 4 | ~15 medium/low issues | 0.5 day |

**Total: 29 tasks, ~137 issues, ~10-15 engineering days**
