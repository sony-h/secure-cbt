# Progress Note: Secure CBT Platform

**Current Phase:** Phase 7 & 8 - Testing & Polish - COMPLETE
**Target Platform:** Indonesian High Schools (SMA/SMK)
**Architecture:** Modular Monolith (Backend) + Flutter (Student Mobile App) + Next.js (Admin/Teacher Dashboard)
**Last Updated:** 2026-06-29

## Current Workspace State
*   `docs/`: Complete PRD, UI/UX specs, tech arch, domain modules, database design, mobile security, roadmap (`01` through `08`).
*   `apps/backend/`: **NestJS with 14 business modules + full infrastructure** (Redis, BullMQ, Socket.io, Exception Filter, Response Interceptor, Logging, Throttler). Prisma schema with 23 tables. Seed script ready.
*   `apps/dashboard/`: **Next.js App Router scaffolded** with Tailwind + Shadcn UI + TanStack Query. Auth (login, logout, token refresh), Dashboard layout with sidebar, CRUD pages for Students, Teachers, Academic. Complete pages for Questions, Exams, Monitoring, Reports, Settings.
*   `apps/mobile/`: **Flutter project scaffolded and platform files generated** with Riverpod (auth + exam state), Drift (offline-first SQLite), Dio (HTTP + retry + auto-refresh). Android app security setup configured on Kotlin & manifest levels.
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

### 2. Docker Infrastructure - RUNNING & HEALTHY
- PostgreSQL 16 (healthy), Redis 7 (healthy), MinIO (healthy) via `docker compose up -d`
- **Fixed:** Redis/BullMQ environment variables inside `docker-compose.yml` for the backend service (`BULLMQ_REDIS_HOST: redis` and `BULLMQ_REDIS_PORT: 6379`) to resolve startup crashes.

### 3. Database - MIGRATED & SEEDED
- **Initial migration** `20260624000000_init` created and applied on both container and host (23 tables, 6 enums)
- **Seed completed:** admin/admin123, operator/operator123, teacher/teacher123, 30 students (NIS-based login), 12 subjects, 5 sample questions

### 4. Flutter Platform Scaffold - GENERATED
- **Platform Files Created:** Ran `flutter create --org com.securecbt --platforms=android .` inside `apps/mobile`.
- **Kotlin Security Plugin:** Configured `MainActivity.kt` with window security flags (`FLAG_SECURE` to block screenshots/screencasts) and registered MethodChannels.
- **Manifest Permissions:** Added permissions for Kiosk/Lock TaskMode, Wake Lock, Internet, and network states to `AndroidManifest.xml`.
- **Drift/Riverpod Code Generation:** Successfully compiled dependencies (`flutter pub get`) and executed `build_runner` generation.

### 5. Monorepo Build and Types - VERIFIED & COMPILING
- **Dashboard Type Fixes:** Fixed `colSpan` type definitions in `table.tsx` and added `secondary`/`outline` variants in `Badge` component to prevent compilation errors.
- **Linter Tuning:** Configured ESLint rules (`.eslintrc.js`) to ignore Next.js specific directories in the root linter.
- **Full Compile Check:** Successfully executed `pnpm build` verifying that NestJS, packages/shared, and Next.js projects compile cleanly without errors.

### 6. Backend Integration Tests - CREATED & PASSING
- **Test Suites Created:** Auth (`test/auth.e2e-spec.ts`) and Exam Flow (`test/exam.e2e-spec.ts`) E2E tests written using supertest + Vitest.
- **Test Runners:** Setup `vitest.config.e2e.ts` pointing to localhost databases and verified tests pass successfully.

### 7. Dashboard CRUD Dialogs - BUILT
- **Student Dialog:** Create/Edit modal with NIS, full_name, class_id (dropdown from /academic/classes), status (ACTIVE/INACTIVE/GRADUATED). Wired with TanStack mutations (POST/PATCH/DELETE).
- **Teacher Dialog:** Create/Edit modal with NIP, full_name, subject_ids (checkbox list from /academic/subjects). Wired with TanStack mutations (POST/PATCH/DELETE).
- **Academic Dialogs:** Year, Major, Class, and Subject creation dialogs replacing browser prompt() calls. Class dialog includes major/year dropdowns and grade_level selector. Subject dialog includes optional major assignment.

### 8. Flutter BYOD Security Layer - IMPLEMENTED
- **Fullscreen Enforcement:** Exam screen now sets `SystemUiMode.immersiveSticky` on entry and restores `edgeToEdge` on exit.
- **Lifecycle Violation Detection:** `didChangeAppLifecycleState` handles all states (paused, inactive, hidden, detached) and logs violations with descriptive events.
- **Warning Limit Auto-Submit:** When `warningCount >= warningLimit`, the exam auto-submits via `POST /sessions/submit` and navigates to the result screen.
- **Violation UI:** Warning badge in AppBar showing current/total warnings. Snackbar alerts for each violation event.

---

## Phase 3 Progress (2026-06-25)

### 9. Dashboard Bug Fixes — 11 bugs resolved
- **🔴 CRITICAL:** Dashboard home stats were hardcoded (`30`, `1`, `12`, `0`) → replaced with live `useQuery` API calls
- **🔴 CRITICAL:** Students & Teachers pages had data format mismatch — `useQuery` returned raw array but render expected `data?.data?.map` → fixed to return full API response body
- **🔴 CRITICAL:** Reports page complete API response shape mismatch — backend `{ score, nis, student_name }` vs frontend `{ total_score, student: { nis, full_name } }` → added mapping layer
- **🔴 CRITICAL:** Monitoring page API response shape mismatch — backend `{ student_name, status: 'active' }` vs frontend `{ student: { full_name }, status: 'ACTIVE' }` → added mapping layer
- **🔴 CRITICAL:** Editing an exam wiped all question assignments (`question_ids: []` sent) → `handleEdit` now fetches full exam detail to restore existing questions
- **🔴 CRITICAL:** Academic backend missing PATCH routes for classes/subjects → added `updateClass()` / `updateSubject()` + `@Patch` controllers
- **🟠 HIGH:** Login broken — JWT `sub` mapped to teacher/student ID instead of user ID, `getProfile` lookup failed → reverted `sub` to always be `user.id`, resolved teacher/student IDs per service
- **🟠 HIGH:** Socket.io URL hardcoded `localhost:3000` → uses `NEXT_PUBLIC_API_URL` env var
- **🟡 MEDIUM:** Question bank filter was no-op → fixed to `q.question_bank?.id === bankFilter`
- **🟡 MEDIUM:** Progress bar formula `((p/1)*10)` gave wrong % → fixed to `(p * 100)`
- **🟡 MEDIUM:** `document.querySelector` for tag input replaced with `useRef`

### 10. Comprehensive Database Seed
- **Seed expanded from 30→60 students, 1→3 teachers, 5→25 questions, 0→2 exams**
- Realistic Indonesian student names generated
- 3 question banks (Math, Physics, Indonesian) with 25 questions (MC, True/False, Multi-Select, Essay)
- 2 exams: UTS Matematika (PUBLISHED, token `83F4D2B0`) + Ulangan Fisika (DRAFT)
- 5 demo exam sessions with answers and scores for monitoring/reports testing
- Seed export SQL generated at `seed-csv/00-inserts-only.sql` (444 lines, FK-safe order)
- **Known issue:** SQL export may have issues with multi-line INSERTs from pg_dump

### 11. Backend Service Fixes
- `ExamService.create` now resolves teacher ID from `user_id` before creating exam
- `SessionService.resume/submit` now resolves student ID from `user_id` before authorization check
- `SessionService.start` parameter renamed from `studentId` → `userId` for clarity

### 12. Seed Export SQL Comparison
- Analyzed `seed-csv/00-inserts-only.sql` compared to target Prisma schema. The export order is correct and respects foreign key dependency hierarchy. The values align with UUID formats, native enums, nullable schemas, and Argon2 password hashing. (Custom `\restrict` / `\unrestrict` markers may require a custom loader or shell strip wrapper).

---

## Immediate Next Steps
1. **Start Dashboard:** `pnpm dev` from `apps/dashboard` (port 3001) — login with `admin/admin123`
2. **Build mobile APK / run on emulator:** `flutter build apk --debug` from `apps/mobile`
3. **Mobile Socket.io Events Wire-up:** Connect exam warning/progress events from mobile → teacher monitoring dashboard
4. **Dashboard Enhancement:** Polish monitoring page real-time status indicators
5. **Future Features:** Image questions, exam templates, analytics dashboard (V2)

### 13. Question Bank getBanks — User ID vs Teacher ID Mismatch (2026-06-25)
- **🔴 CRITICAL:** `QuestionBankController.getBanks` passed `req.user.sub` (User ID) to `getBanks()`, which treated it as `teacher_id` filter. Since User ID ≠ Teacher record ID, the `WHERE teacher_id = <user_id>` query returned 0 results for all users (Teacher & Admin).
- **Fix:** `QuestionBankService.getBanks` now resolves `teacher.id` from `user_id` first. Admin/Operator users bypass the teacher filter entirely (see all banks from all teachers).
- Same fix applied to `createBank` — resolves Teacher record from User ID before linking the bank.
- **Backend restart required** after build for fix to take effect in running process.
- Also fixed: `questions/list` page query `data.data` unwrap in dashboard, pagination `Number()` casts across 5 services, E2E test FK cleanup order (added `score` and `session_log` before `exam_session`).

### 14. Dashboard Settings Page — Data Model Mismatch (2026-06-25)
- **🔴 CRITICAL:** Settings page was designed for a non-existent key-value table schema (`{ id, key, value, description }`), but the backend returns a single flat row with typed columns (`warning_limit`, `auto_submit_enabled`, `fullscreen_required`, `lock_task_mode`, `autosave_interval`, `session_timeout`).
- **Frontend expected:** `SystemSettings[]` array with `.filter(s => group.items.includes(s.key))` and `.map()`.
- **Backend returned:** Single settings object. `.filter()` and `.map()` failed silently → page blank.
- **Update mutation also broken:** Sent `{ key, value }` but backend expects column names like `{ warning_limit: 3 }`.
- **Fix:** Rewrote settings page to match actual API. Number inputs for `warning_limit`, `autosave_interval`, `session_timeout`. Toggle buttons for `auto_submit_enabled`, `fullscreen_required`, `lock_task_mode`. Per-field save with change detection.

### 15. Role-Based Dashboard Visibility & Permissions (2026-06-25)
- **Sidebar filtering:** `navItems` in `layout.tsx` now includes `roles: UserRole[]` per item. Only items matching `user.role` appear in the sidebar.
- **Route-level protection:** Pages now redirect to `/dashboard` if the user's role is not in the allowed list (questions, monitoring, reports, settings, teachers).
- **Backend role expansion:** Added `TEACHER` to `StudentController.findAll` and `TeacherController.findAll` GET endpoints so teachers can view student and teacher data in the dashboard.
- **Academic page read-only mode:** Years/Majors tabs hide Add/Delete for non-admin. Classes/Subjects tabs hide Add/Edit/Delete for Teacher (Operator still has CRUD).
- **Students page filters:** Added class dropdown filter to let teachers/admins narrow student lists by class.
- **Students page read-only for Teacher:** Add/Edit/Delete buttons hidden when `user.role === TEACHER`.

**Final role → page visibility:**

| Page | Admin | Operator | Teacher |
|------|:-----:|:--------:|:-------:|
| Dashboard | ✅ | ✅ | ✅ |
| Akademik | ✅ CRUD | ✅ CRUD classes/subjects | ✅ view |
| Siswa | ✅ CRUD | ✅ CRUD | ✅ view + filter |
| Guru | ✅ CRUD | ✅ CRUD | ❌ hidden |
| Bank Soal | ✅ | ❌ hidden | ✅ |
| Ujian | ✅ | ✅ view | ✅ |
| Monitoring | ✅ | ❌ hidden | ✅ |
| Laporan | ✅ | ❌ hidden | ✅ |
| Pengaturan | ✅ | ❌ hidden | ❌ hidden |

### 16. Academic Edit Modals — Years & Majors (2026-06-25)
- **YearDialog upgraded:** Now supports edit mode with pre-filled name + `is_active` toggle checkbox on both create and edit.
- **MajorDialog upgraded:** Now supports edit mode with pre-filled name and code. Code is editable.
- **Backend additions:** Added `updateMajorSchema`, `UpdateMajorDto`, `updateMajor()` in AcademicService, `PATCH /academic/majors/:id` in controller.
- **Edit buttons:** Pencil icon added to each Year and Major row (Admin only, consistent with existing read-only mode).
- **`createYear` mutation** now passes `is_active` from the dialog instead of hardcoding `false`.

### 17. Mobile Exam Selection & Token Flow (2026-06-25)
- **New screen:** `ExamSelectScreen` — shows student identity card (NIS, Full Name, Class) + list of available exams fetched from `GET /exams/student`.
- **Flow change:** Login → Exam Select → Token → Exam (was: Login → Token → Exam).
- **Token screen:** Now displays the selected exam title above the token input.
- **Backend:** `AuthService.login/refresh` now returns `nis` and `class_name` for student users.
- **Token expiry:** Changed from `exam.end_at` to **3 days from generation time** in `generateToken`.
- **Seed exam dates:** Extended from ±1h to -1d/+30d so exams don't expire during development.
- **Dashboard exams:** Edit and Delete buttons now visible for all exam statuses (DRAFT, PUBLISHED, ONGOING, FINISHED, CANCELLED).

### 18. Mobile Exam Screen Bug Fixes (2026-06-25)
- **🔴 CRITICAL:** Submit button not appearing — bottom bar was inside `Scaffold.body` as `Column` child alongside `Expanded(PageView)`, causing clipping on some devices. Moved to `Scaffold.bottomNavigationBar` (native SafeArea + pinning).
- **🔴 CRITICAL:** Question numbering starts from 2 — `_buildQuestionCard` displayed raw backend `position` value. Changed to `index + 1` (list position), matching the palette widget. Also removed unused `position` variable.
- **🟠 HIGH:** Warning count starts from 3, not 0 — `warningCount` correctly initialized to 0 in state, but chip was hidden (`warningCount > 0`). Chip now always visible with grey "0/3" styling, turning red on violation.
- **🟠 HIGH:** Warning violations triggered during immersive-mode transition — system UI mode change (`immersiveSticky`) sends lifecycle events. Observer registration now delayed 1.5s after session load to let transitions settle.
- **🟡 MEDIUM:** `warningLimit` hardcoded to 3 — now parsed from `session['exam']['warning_limit']` in `_loadSessionData()` so backend exam settings are respected.
- **🟡 MEDIUM:** `ExamNotifier.loadSession` not resetting state between sessions — now explicitly resets `currentIndex: 0`, `warningCount: 0`, `violations: []`, `answers: {}`, and cancels old timers.

---

## Phase 3 Progress Continuation (2026-06-28)

### 19. Backend Core Fixes & Enhancements
- **Computed exam status:** `ExamService.getExamsForStudent()` and `findAll()` now derive status from time window (`start_at`/`end_at` vs `now`) instead of relying on the static DB field. PUBLISHED exams within time window → ONGOING for display. Ended exams → FINISHED.
- **Retake prevention:** `SessionService.start()` now checks for existing `SUBMITTED`/`AUTO_SUBMITTED`/`EXPIRED` sessions and throws `BadRequestException` to block retakes. Same guard added to `submit()` and `resume()`.
- **Token-exam validation:** `POST /sessions/start` now accepts optional `exam_id`. If provided, validates token belongs to the expected exam → generic "Token tidak valid" error instead of misleading "Anda sudah menyelesaikan ujian ini" if token is for a different exam.
- **Question & answer randomization:** `SessionService.start()` and `resume()` now shuffle question order and option order when `randomize_questions`/`randomize_answers` flags are true. Each student gets a unique order per session.
- **Auth display name:** `AuthService.getProfile()` now flattens `full_name`, `nis`, and `class_name` from Teacher/Student relations, matching the login response format. Admin/Operator get role-based labels ("Administrator", "Operator").
- **Auto-publish on create:** `ExamService.create()` now sets `status: ExamStatus.PUBLISHED` — newly created exams appear immediately on mobile (no separate publish step needed).
- **Exam schedule filter:** Removed `start_at: { lte: now }` from `getExamsForStudent()` so upcoming exams appear in the "Akan Datang" section. Added `id: { notIn: completedIds }` to hide already-completed exams.
- **E2E test updated:** Removed `/exams/:id/publish` test (exams auto-publish). 4 tests passing.

### 20. Comprehensive Database Seed
- **Expanded to 5 exams, 4 teachers, 30 questions across 4 banks:**
  - UTS Matematika (PUBLISHED — IPA, active time window)
  - Ulangan Fisika (PUBLISHED — IPA, upcoming, 2 days ahead)
  - UTS Ekonomi (FINISHED — IPS, 20 students completed)
  - Latihan Bahasa Jepang (ONGOING — BAH, 2 active sessions)
  - Tryout PKN (PUBLISHED — ALL classes, upcoming, 7 days ahead)
- **4th teacher:** Siti Rahmawati (IPS subjects: Ekonomi, Geografi, Sosiologi)
- **30 questions:** 10 Math, 8 Physics, 7 Indonesian, 5 Economics
- **5 demo IPA sessions + 20 IPS completed sessions + 2 BAH active sessions** for monitoring/reports testing.

### 21. Dashboard Redesign — Layout & Navigation
- **Sidebar + top nav hybrid:** Dark sidebar restored with nav items + user info at bottom. Sticky top header with dynamic page title, search bar, notification bell with badge, profile avatar circle with dropdown (name, role, logout).
- **Role labels:** Raw `ADMIN`/`OPERATOR`/`TEACHER` replaced with Indonesian labels ("Administrator", "Operator", "Guru").
- **User display name:** Sidebar and header now show `full_name` correctly on page refresh (fixed `getProfile()` flattening nis/class_name).
- **Active state fix:** Dashboard link only highlights on exact `/dashboard` path, not sub-pages.
- **Logout flow:** All logout buttons properly redirect to `/login` via router.

### 22. Dashboard Home — Charts & Stats
- **Recharts donut chart:** Status distribution of all exams (Draft/Terbit/Aktif/Selesai) with color-coded legend.
- **Gradient stat cards:** Each card uses a color gradient (indigo, emerald, violet, amber) with white text and glass-morphism icon container.
- **Exam list:** Scrollable list of up to 8 exams with status badges, sorted by creation date.

### 23. Dashboard Exams Page — Dates, WIB, Modal Fixes
- **Date columns:** Added "Mulai" and "Selesai" columns with calendar icons and `formatDate()` to the exams table.
- **WIB timezone:** `formatDate()` in `utils.ts` now uses `timeZone: 'Asia/Jakarta'` forcing WIB display. Edit form converts UTC ↔ WIB for datetime-local inputs. Save correctly parses `+07:00` to UTC.
- **Modal step reset:** Added `useEffect` in `CreateExamModal` that resets step to 0 when modal opens.
- **Publish button:** Exams created via dashboard now auto-publish (status defaults to `PUBLISHED` in the backend).
- **Computed exam badges:** Status column shows time-derived status (FINISHED for past exams, ONGOING for current).

### 24. Dashboard Monitoring, Reports, Settings — Timezone Fixes
- **Monitoring page:** Session log timestamps use `Intl.DateTimeFormat` with `timeZone: Asia/Jakarta`.
- **Settings page:** Updated timestamp uses `formatDate()` with WIB timezone.
- **Academic edit modals:** PATCH routes added for classes/subjects, major edit with code field, year edit with `is_active` toggle.

### 25. Mobile — Exam Detail Screen & New Flow
- **New screen:** `ExamDetailScreen` — displays exam title, subject badge, duration, question count, schedule in WIB, description. "LANJUTKAN" button navigates to token screen.
- **Flow change:** Exams/Home → tap exam → Exam Detail → LANJUTKAN → Token (enter token + rules) → Exam.
- **Token-exam binding:** Token screen now sends `exam_id` in POST body. Backend validates token belongs to the expected exam, returning generic error if mismatch.
- **Question palette:** Replaced subtle 3px dot indicators with `"3/10 📋 ▼"` counter button that opens the palette modal.
- **Flagged questions:** Added `Set<String> flagged` to `ExamState` with `toggleFlag()`. Flag icon on question card. Flagged state shown in palette grid (orange tint + flag icon) and legend.
- **Difficulty badges removed:** Question difficulty ("Mudah", "Sedang", "Sulit") removed from student-facing screens (teacher-only data).
- **Submit text changed to English:** All "Kumpulkan"/"KUMPULKAN" → "Submit"/"SUBMIT". Confirmation dialogs use English throughout.
- **Auth guard added:** `router.dart` now has `redirect` logic preventing unauthenticated access. Protected routes redirect to `/login`.
- **`tryAutoLogin()` fixed:** Now populates `nis` and `className` from `/auth/me` response.
- **Token screen back button:** Now navigates back to exams tab instead of home.

### 26. Mobile — WIB Timezone & Auth Listener Fixes
- **All date displays:** `_formatDateTime` and `_formatDate` now call `_toWIB()` (adds 7 hours) before formatting. Appends " WIB" suffix. Uses full Indonesian month names.
- **Auth listener on all screens:** `ref.listen(authProvider, ...)` added to `HomeScreen`, `ExamsScreen`, `HistoryScreen` — reloads data when user transitions from unauthenticated → authenticated (login switch).
- **Dead widgets removed:** `question_card.dart`, `navigation_panel.dart`, `timer_widget.dart` deleted (unused — exam screen has inline implementations).

### 27. Mobile — Theme & Shadow Improvements
- **AppBar shadow:** `elevation: 0` → `elevation: 1` with soft `shadowColor` on both light and dark themes.
- **Card elevation:** Global `CardThemeData` elevation changed from `0` to `1`, border removed for cleaner Material shadow separation.
- **Bottom nav shadow:** Reduced from `elevation: 8` to `elevation: 3` with softer shadow color.
- **Background colors:** Bottom nav now uses `theme.colorScheme.surface` instead of hardcoded `Colors.white`.
- **Theme token migration:** `exam_screen.dart` and `question_palette.dart` now use `theme.colorScheme` (`.primary`, `.error`, `.tertiary`, `.surface`, `.outline`, `.outlineVariant`, `.errorContainer`, `.surfaceContainerHighest`) instead of hardcoded `Colors.grey/red/green/orange` and raw `Color(0xFF...)` values.

### 28. Docker & Config
- **Timezone:** Added `TZ: Asia/Jakarta` to PostgreSQL and backend services in `docker-compose.yml`.
- **Gitignore:** Updated with additional patterns.
- **Prisma migrations:** 3 new migrations added for `passing_grade`, `feedback`, `total_questions` fields.
