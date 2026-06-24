# Progress Note: Secure CBT Platform

**Current Phase:** Phase 2 - Infrastructure & Frontend Scaffolding - COMPLETED → Moving to Phase 3
**Target Platform:** Indonesian High Schools (SMA/SMK)
**Architecture:** Modular Monolith (Backend) + Flutter (Student Mobile App) + Next.js (Admin/Teacher Dashboard)
**Last Updated:** 2026-06-24

## Current Workspace State
*   `docs/`: Complete PRD, UI/UX specs, tech arch, domain modules, database design, mobile security, roadmap (`01` through `08`).
*   `apps/backend/`: **NestJS with 14 business modules + full infrastructure** (Redis, BullMQ, Socket.io, Exception Filter, Response Interceptor, Logging, Throttler). Prisma schema with 23 tables. Seed script ready.
*   `apps/dashboard/`: **Next.js App Router scaffolded** with Tailwind + Shadcn UI + TanStack Query. Auth (login, logout, token refresh), Dashboard layout with sidebar, CRUD pages for Students, Teachers, Academic. Placeholder pages for Questions, Exams, Monitoring, Reports, Settings.
*   `apps/mobile/`: **Flutter project scaffolded** with Riverpod (auth + exam state), Drift (offline-first SQLite), Dio (HTTP + retry + auto-refresh). Login screen, Token screen, Exam screen (with timer, navigation panel, answer cards), Result screen. Android security setup documented.
*   `packages/shared/`: **Complete** - Shared enums, DTOs, Zod schemas, event constants, security configuration.
*   `docker/`: Dockerfiles for backend development and production, Prisma migration runner.
*   `docker-compose.yml`: PostgreSQL 16, Redis 7, MinIO for local development.

## Approved Tech Stack
*   **Backend:** NestJS, Prisma ORM, PostgreSQL, Redis (ioredis, BullMQ, Socket.io presence & monitoring).
*   **Dashboard:** Next.js (App Router), Shadcn UI, TanStack Query, React Hook Form, Zustand, Recharts.
*   **Mobile App:** Flutter, Riverpod, Drift (local SQLite), Dio (retry + auto-refresh), GoRouter, Flutter Secure Storage, Socket.io Client.

---

## Phase 1 Completion Summary

### 1. Monorepo Configuration
- `pnpm-workspace.yaml` configured for `apps/*` and `packages/*`
- Root `package.json` with orchestration scripts
- Base `tsconfig.json`, `.prettierrc`, `.eslintrc.js`, `.gitignore` configured

### 2. Shared Library (`packages/shared`) - COMPLETE
- Enums, DTOs (13 groups), Zod Schemas (12 groups), Event constants (28 events), Security defaults

### 3. Backend App (`apps/backend`) - Phase 1 Business Logic
- 14 modules with full CRUD + business logic (Auth, User, Academic, Student, Teacher, QuestionBank, Exam, Session, Answer, Monitoring, Grading, Report, Settings, Health)
- Prisma schema (23 tables), JWT + RBAC guards, Swagger docs at `/api/docs`

### 4. Database Schema (23 tables)
users, students, teachers, teacher_subjects, academic_years, majors, classes, subjects, question_banks, questions, question_options, question_tags, exams, exam_tokens, exam_packages, exam_questions, exam_classes, exam_sessions, session_logs, answers, scores, settings, refresh_tokens

---

## Phase 2 Completion Summary

### 1. Docker & Database Infrastructure
- **`docker-compose.yml`**: PostgreSQL 16, Redis 7, MinIO with health checks and persistent volumes
- **`docker/Dockerfile.prisma`**: Node 22 Alpine image for running Prisma migrations and seeds
- **`docker/Dockerfile.backend`**: Multi-stage (dev + production) Dockerfile for the NestJS app
- **`apps/backend/.env`**: Complete environment variable file for local development
- **`prisma/seed.ts`**: Comprehensive seed script creating admin, operator, teacher, 30 students, 12 subjects, 5 sample questions with options and tags

### 2. Backend Infrastructure Hardening
- **`GlobalExceptionFilter`**: Catches all exceptions, handles Prisma errors (P2002, P2025, P2003, P2014), NestJS HTTP exceptions, and unknown errors with proper status codes and logging
- **`ResponseInterceptor`**: Wraps all successful responses in `{ success, message, data }` format; passes through already-formatted responses
- **`LoggingInterceptor`**: Adds `X-Request-Id` header, logs request method, URL, status code, and duration
- **`RedisModule` + `RedisService`**: Global Redis connection via ioredis with retry strategy, connect/disconnect lifecycle hooks (lazyConnect for BullMQ compatibility)
- **`QueueModule`**: BullMQ configuration with 6 queues (Question Import, Excel Processing, PDF Generation, Email Sending, Report Generation, Background Cleanup), exponential backoff
- **`ThrottlerModule`**: Global rate limiting (60 req/min default) via `@nestjs/throttler`
- **`main.ts`**: Updated with global exception filter, response + logging interceptors, rate limiting, proxy trust

### 3. Socket.io Realtime Gateway
- **`MonitoringGateway`** (`/monitoring` namespace): Handles student/teacher connections, broadcasts connect/disconnect events per exam room, relays answer saved, progress updated, exam submitted, and warning triggered events
- Student-teacher room mapping with `exam:{examId}` rooms
- `sendWarningToStudent()`, `notifySessionFinished()`, `isStudentConnected()` utility methods

### 4. Dashboard App (`apps/dashboard`) - Scaffolded
- **Next.js 14+ App Router** with TypeScript, Tailwind CSS, Shadcn UI components
- **Package dependencies**: Radix UI primitives, TanStack Query/Table, React Hook Form, Zod, Zustand, Axios, Lucide icons, date-fns, Recharts, Sonner toasts, next-themes
- **`src/lib/api.ts`**: Axios client with base URL, auth token interceptor, automatic 401 refresh token rotation
- **`src/lib/utils.ts`**: cn() utility, formatDate(), formatScore(), getStatusColor(), getStatusLabel() helpers for Indonesian locale
- **`src/stores/auth.store.ts`**: Zustand store with login(), logout(), checkAuth() - persists tokens in localStorage
- **`src/providers/`**: AuthProvider (auto-check auth on mount), Providers (QueryClient + Toaster wrapper)
- **`src/app/layout.tsx`**: Root layout with Inter font, metadata, providers
- **`src/app/login/page.tsx`**: Login form with username/password, loading state, error handling, auto-redirect if authenticated
- **`src/app/dashboard/layout.tsx`**: Responsive sidebar layout with mobile hamburger menu, nav items with active state, user info + logout button
- **`src/app/dashboard/page.tsx`**: Dashboard home with stats cards (Students, Teachers, Subjects, Active Exams) and quick start guide
- **`src/app/dashboard/students/page.tsx`**: Data table with search, pagination, delete confirmation
- **`src/app/dashboard/teachers/page.tsx`**: Data table with search, pagination, subject badges
- **`src/app/dashboard/academic/page.tsx`**: Tabbed interface (Years, Majors, Classes, Subjects) with add/delete
- **Placeholder pages**: Questions, Exams, Monitoring, Reports, Settings
- **UI Components**: Button, Input, Card, Label, Table, Badge, Spinner, Tabs

### 5. Mobile App (`apps/mobile`) - Scaffolded
- **`pubspec.yaml`**: Flutter 3.22+, Riverpod, Drift (SQLite), Dio (with smart_retry), GoRouter, Flutter Secure Storage, Socket.io Client, Freezed, json_serializable, Wakelock Plus
- **`lib/main.dart`**: Entry point with Android security configurations (portrait lock, system UI), global error handling via PlatformDispatcher
- **`lib/app/app.dart`**: MaterialApp.router with GoRouter, light theme
- **`lib/app/router.dart`**: Routes: /login, /token, /exam, /result
- **`lib/core/theme/theme.dart`**: Material 3 light theme with Inter font, custom input/card/button styles
- **`lib/core/logger/logger.dart`**: Pretty logger wrapper
- **`lib/core/network/dio_client.dart`**: Dio with auth interceptor (Bearer token), auto-refresh on 401, retry interceptor (3 retries with exponential backoff)
- **`lib/core/database/local_database.dart`**: Drift database with LocalAnswers (offline answer storage) and LocalExams (question cache) tables, saveAnswer(), getPendingAnswers(), markSynced(), cacheExam()
- **`lib/features/auth/providers/auth_provider.dart`**: Riverpod StateNotifier with login(), logout(), tryAutoLogin() - secure storage integration
- **`lib/features/auth/presentation/screens/login_screen.dart`**: Login form with password visibility toggle, validation, loading state, error snackbar
- **`lib/features/auth/presentation/screens/token_screen.dart`**: 8-character token input, uppercase auto-formatting, POST to /sessions/start, navigates to exam
- **`lib/features/exam/providers/exam_provider.dart`**: Exam state management (questions, answers, timer, warnings), autosave timer (5s), app lifecycle observer (background detection = violation)
- **`lib/features/exam/presentation/screens/exam_screen.dart`**: PageView with PopScope prevention, app lifecycle observer for background detection, submit dialog
- **`lib/features/exam/presentation/screens/result_screen.dart`**: Success screen with checkmark, message, back button
- **`lib/features/exam/presentation/widgets/question_card.dart`**: Question display with A/B/C/D option circles, selection state
- **`lib/features/exam/presentation/widgets/navigation_panel.dart`**: Scrollable question number grid (answered/unanswered/current states), progress text, submit button with confirmation dialog
- **`lib/features/exam/presentation/widgets/timer_widget.dart`**: MM:SS countdown display, red warning when < 5 minutes
- **`ANDROID_SETUP.md`**: Documents Android build.gradle, AndroidManifest.xml, and MainActivity.kt configuration for FLAG_SECURE, Lock Task Mode, and Kotlin Native plugins
- **`analysis_options.yaml`**: Flutter linting rules

---

## Environment Bootstrapped (2026-06-24)

### 1. Git Repository
- Initialized git repository with 169 files (15,877 lines)
- `.gitignore` covers node_modules, build outputs, .env, IDE files, mobile platforms

### 2. Docker Infrastructure - RUNNING
- PostgreSQL 16 (healthy), Redis 7 (healthy), MinIO (healthy) via `docker compose up -d`
- **Fixed:** Removed obsolete `version` field from docker-compose.yml
- **Fixed:** `docker/Dockerfile.prisma` - now installs `openssl` (required by Prisma engine), uses pnpm for workspace protocol, bind-mounts prisma directory for migration persistence

### 3. Database - MIGRATED & SEEDED
- **Initial migration** `20260624000000_init` created and applied (23 tables, 6 enums)
- **Schema fix:** `Subject.major` changed from `Major` to `Major?` (matching optional `major_id`)
- **Seed completed:** admin/admin123, operator/operator123, teacher/teacher123, 30 students (NIS-based login), 12 subjects, 5 sample questions
- **Seed fixes:** Fixed relative import paths (`../../src/` → `../src/`), added `prisma.seed` config to `package.json`

## Known Issues
- **Prisma Client Generation:** Prisma 5.22.0 WASM engine incompatible with Node.js v24.15.0 on Windows. **Solution:** Use Docker (`docker compose --profile setup run --rm prisma-migrate`) ✓ Works
- **PowerShell Execution Policy:** Windows PowerShell blocks `pnpm`, `npx`, `npm` script execution. **Solution:** Use `cmd /c` prefix or Docker for dependency installation.
- **Dashboard dependencies not installed:** `pnpm install` needs to be run (blocked by execution policy). Use Docker or set ExecutionPolicy to RemoteSigned.
- **Flutter not installed:** Cannot build mobile app. Need to install Flutter SDK.
- **No Node v22 on host:** Prisma WASM engine needs Node v22. Docker uses Node 22 Alpine image - works.

---

## Immediate Next Steps (Phase 3)
1. ~~**Run Docker Infrastructure:**~~ ✓ Done
   - `docker compose up -d` ✓
   - `docker compose --profile setup run --rm prisma-migrate` ✓
   - `docker compose --profile setup run --rm prisma-seed` ✓
2. **Start Backend API:** `docker compose up backend` or run locally
3. **Install & Run Dashboard:**
   - `pnpm install` then `pnpm dev` from `apps/dashboard` (runs on port 3001)
   - Or: Create a Dockerfile for the dashboard
4. **Setup Flutter Project:**
   - Install Flutter SDK
   - Run `flutter create` in `apps/mobile` to generate platform files
   - Copy source files from `lib/` into the generated project
   - Run `flutter pub get && dart run build_runner build`
   - Build and test on Android emulator
5. **Backend Testing:**
   - Write unit tests (Vitest) for Auth, Exam, Session, Grading services
   - Write E2E tests (Playwright) for critical user flows
6. **Remaining Dashboard Pages:**
   - Build Question Bank CRUD (list, create/edit, duplicate)
   - Build Exam management (create wizard, publish, monitoring)
   - Build Real-time Monitoring page (Socket.io connection)
   - Build Reports page (charts with Recharts)
   - Build Settings page
7. **Flutter Native Plugins:**
   - Implement Kotlin Native plugins for FLAG_SECURE, Lock Task Mode
   - Implement app background / split-screen detection
   - Implement fullscreen enforcement during exam
8. **Load Testing:**
   - k6 scripts for 100/500/1000 concurrent students
   - Performance tuning based on results
