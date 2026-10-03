# 🛡️ Secure CBT Platform

> **Enterprise-Grade Computer-Based Testing & Proctoring System for Indonesian Schools (SMA/SMK)**

[![Node.js](https://img.shields.io/badge/Node.js-22_LTS-339933?logo=node.js&logoColor=white)](https://nodejs.org)
[![pnpm](https://img.shields.io/badge/pnpm-9.15.4-F69220?logo=pnpm&logoColor=white)](https://pnpm.io)
[![Flutter](https://img.shields.io/badge/Flutter-3.22+-02569B?logo=flutter&logoColor=white)](https://flutter.dev)
[![NestJS](https://img.shields.io/badge/NestJS-10.x-E0234E?logo=nestjs&logoColor=white)](https://nestjs.com)
[![Next.js](https://img.shields.io/badge/Next.js-14_App_Router-000000?logo=next.js&logoColor=white)](https://nextjs.org)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16_Alpine-4169E1?logo=postgresql&logoColor=white)](https://www.postgresql.org)
[![Redis](https://img.shields.io/badge/Redis-7_Alpine-DC382D?logo=redis&logoColor=white)](https://redis.io)
[![Tests](https://img.shields.io/badge/Backend_Tests-31%2F31_Passed-success)](https://vitest.dev)
[![Code Quality](https://img.shields.io/badge/Linter-0_Errors-brightgreen)](https://eslint.org)
[![License](https://img.shields.io/badge/License-Proprietary-blue.svg)](#license)

---

## 📖 Executive Summary & Product Vision

**Secure CBT** is a cloud-native, zero-trust digital examination platform engineered specifically for the demands of Indonesian high schools (_Sekolah Menengah Atas / Kejuruan_).

Traditional digital exam systems in Indonesian schools suffer from catastrophic single points of failure: flaky on-premise local servers, unreliable Wi-Fi in classrooms, rampant student cheating via split-screen or background apps, and lost answers when connectivity drops.

Secure CBT solves this through a **Reliability-First** and **Integrity-First** philosophy:

- **Zero Answer Loss:** Every answer is stored offline in local SQLite before network transmission, with automatic exponential retry and background batch synchronization.
- **OS-Level Anti-Cheat:** System-wide screenshot and screen recording blocking (`FLAG_SECURE`), forced immersive full-screen mode, background departure detection, and automated submission upon reaching violation limits.
- **Real-Time Live Proctoring:** Teachers monitor live student exam progress, answer submissions, network state, and cheating attempts in real-time over Socket.io WebSockets.
- **Modern Minimalist & Vibrant UX:** An engaging, light-mode-only mobile experience ("_Heroic Scholar_") featuring dynamic subject-themed palettes, tactile micro-interactions, and celebratory particle animations upon passing.

---

## 🏛️ High-Level System Architecture

```text
               ┌────────────────────────────────────────────────────────┐
               │              STUDENT MOBILE CLIENT (Flutter)           │
               │  • Offline-first SQLite (Drift)    • Riverpod State    │
               │  • FLAG_SECURE Anti-Screenshot     • Lifecycle Monitor │
               └───────────────────────┬────────────────────────────────┘
                                       │ HTTP / WebSockets
                                       ▼
                     ┌───────────────────────────────────┐
                     │    NGINX Reverse Proxy (HTTPS)    │
                     │    api.domain.com | cbt.domain.com │
                     └─────────────────┬─────────────────┘
                                       │
            ┌──────────────────────────┴──────────────────────────┐
            ▼                                                     ▼
┌───────────────────────────────┐             ┌───────────────────────────────┐
│     BACKEND API (NestJS)      │             │    ADMIN DASHBOARD (Next.js)  │
│ • Modular Monolith            │             │ • App Router (Next.js 14)     │
│ • JWT + Role-based Guards     │◄────────────┤ • TanStack Query & Table      │
│ • Prisma ORM & Soft-Deletes   │ (REST/WS)   │ • Real-time Monitoring        │
│ • Socket.io Proctoring        │             │ • Analytics & Score Reports   │
│ • BullMQ Async Job Queues     │             └───────────────────────────────┘
└───────────────┬───────────────┘
                │
    ┌───────────┴───────────┬───────────────────────┐
    ▼                       ▼                       ▼
┌──────────────┐    ┌──────────────┐        ┌──────────────┐
│  PostgreSQL  │    │   Redis 7    │        │   MinIO S3   │
│  (23 Tables) │    │ (Queue/WS)   │        │ (Assets/PDF) │
└──────────────┘    └──────────────┘        └──────────────┘
```

---

## 🌟 Key Features

### 1. 🛡️ Mobile Anti-Cheat & Security Engine

- **Screen Shielding (`FLAG_SECURE`):** Managed via native Kotlin `MethodChannel`. Prevents all screenshots, screen recording, and task-switcher previews while an exam session is loaded. Automatically enabled on exam entry and disabled on submit.
- **Full-Screen Immersion:** Locks Android navigation and status bars (`SystemUiMode.immersiveSticky`).
- **App Departure Tracking:** Watches `WidgetsBindingObserver` lifecycle state changes. Leaving the app, opening floating calculator apps, or switching tabs logs an immediate `APP_MINIMIZED` violation.
- **Transition Buffer:** A 1.5-second stabilization window on exam launch prevents false-positive warnings during screen orientation and immersion changes.
- **Automated Auto-Submit:** When a student exceeds the exam's configured warning threshold (default: 3 warnings), the exam is atomically closed, auto-submitted, and graded on the server.
- **Idempotent Submission:** Server-side idempotent handling prevents HTTP 400 race conditions if an auto-submit and student submission occur simultaneously.

### 2. 📶 Offline-First Answer Engine

- **Local Persistence (Drift SQLite):** Every tap on a multiple-choice or essay field writes to the device's local database before dispatching an HTTP request.
- **Smart Retry & Background Batch Sync:** Uses Dio with exponential backoff. If the classroom Wi-Fi disconnects, the student continues unhindered; pending answers synchronize automatically once the network recovers.

### 3. 👁️ Real-Time Proctoring & Monitoring

- **Teacher WebSocket Rooms:** Teachers join dynamic `exam:{examId}` Socket.io rooms.
- **Live Status Signals:** Shows student connectivity (`CONNECTED` / `DISCONNECTED`), answer progress percentage, warnings triggered, and completion status in real-time.
- **Manual Warning & Broadcasts:** Teachers can issue direct warnings to specific student devices from the dashboard.

### 4. 🎨 "Heroic Scholar" Mobile Experience (Light Mode Only)

- **Distraction-Free Palette:** Pure white (`#FFFFFF`) and porcelain slate (`#F8FAFC`) surfaces with zero harsh black borders and organic soft multi-layered shadows.
- **Subject-Themed Colors:** Automatically detects exam subjects to color-code cards and chips:
  - 📐 **Math & Exact Sciences:** Royal Violet (`#7C3AED`) & Orchid Wash
  - ⚡ **Physics & Chemistry:** Electric Cyan (`#0284C7`) & Deep Ocean
  - 🌱 **Biology & Environmental:** Forest Emerald (`#059669`) & Mint
  - 📖 **Languages & Literature:** Sunset Tangerine (`#EA580C`) & Amber
  - 📊 **Social & Economics:** Crimson Rose (`#E11D48`) & Soft Coral
- **Native Particle Celebration:** Lightweight `CustomPainter` star & confetti particle burst animation that triggers upon passing an exam with no external dependencies.
- **Tactile Micro-Interactions:** Consistent `scale(0.96)` scale-on-press physics across all buttons, question option tiles, and filter pills.
- **Tabular Figures:** Numbers formatted with `FontFeature.tabularFigures()` to prevent layout shifts on countdown timers and score counters.

---

## 📁 Monorepo Directory Structure

```text
secure-cbt/
├── apps/
│   ├── backend/               # NestJS 10 REST & WebSocket API
│   │   ├── prisma/            # Prisma schema, migrations, seed script
│   │   ├── src/
│   │   │   ├── common/        # Filters, guards, interceptors, queues, helpers
│   │   │   ├── modules/       # 14 domain modules (auth, exam, session, grading, etc.)
│   │   │   └── prisma/        # Prisma service & soft-delete middleware
│   │   └── test/              # E2E integration test suites
│   ├── dashboard/             # Next.js 14 App Router Admin/Teacher Portal
│   │   ├── src/
│   │   │   ├── app/           # App router pages (academic, exams, monitoring, etc.)
│   │   │   ├── components/    # Reusable Shadcn UI & domain dialogs
│   │   │   ├── hooks/         # Custom hooks (useCrud, useRoleGuard)
│   │   │   └── lib/           # Axios instance, token refresh interceptor, utils
│   │   └── tailwind.config.js # Tailwind CSS design tokens
│   └── mobile/                # Flutter 3.22+ Student Exam Client
│       ├── android/           # Android platform files & Kotlin Security Plugin
│       ├── lib/
│       │   ├── app/           # Router, routes, and Floating Island navigation bar
│       │   ├── core/          # Theme tokens, Drift database, Dio client, ScreenSecurity
│       │   └── features/      # Feature screens (auth, exam, exams, home, history, profile)
│       └── pubspec.yaml       # Flutter dependencies & assets
├── packages/
│   └── shared/                # Universal TypeScript library
│       ├── src/
│       │   ├── constants/     # Queue names, Cache TTLs, Security defaults
│       │   ├── enums/         # UserRole, ExamStatus, SessionStatus, QuestionType
│       │   ├── schemas/       # 13 Zod validation schemas with Indonesian errors
│       │   ├── types/         # Inferred Zod types, ApiResponse, Pagination
│       │   └── utils/         # Fisher-Yates shuffle utility
│       └── package.json
├── deploy/                    # VPS Production Deployment Configuration
│   ├── nginx/secure-cbt.conf  # Nginx reverse proxy with WebSocket support
│   ├── README_VPS.md          # Step-by-step Indonesian VPS deployment guide
│   ├── setup-vps.sh           # Automated fresh VPS provisioning script
│   └── update.sh              # One-click zero-downtime update script
├── docker/                    # Multi-stage container definitions
│   ├── Dockerfile.backend     # 3-stage NestJS image (build, prod-deps, runtime)
│   └── Dockerfile.prisma      # Migration & seed runner container
├── docs/                      # Master PRD, Architecture, and UI/UX design specifications
├── docker-compose.yml         # Local development infrastructure
├── docker-compose.prod.yml    # Production infrastructure (ports locked to 127.0.0.1)
├── ecosystem.config.cjs       # Root PM2 process manager configuration
├── pnpm-workspace.yaml        # Monorepo workspace configuration
└── package.json               # Root scripts & orchestration
```

---

## 💻 Tech Stack Matrix

| Layer                     | Technologies & Libraries                   | Key Responsibilities                                      |
| ------------------------- | ------------------------------------------ | --------------------------------------------------------- |
| **Backend API**           | NestJS 10, TypeScript 5, Express           | Modular monolith architecture, validation, business logic |
| **Database & ORM**        | PostgreSQL 16, Prisma ORM 5.22             | 23 tables, soft-delete middleware, relational integrity   |
| **Cache & Queues**        | Redis 7, BullMQ, ioredis                   | Async jobs (PDF export, email, report gen, cleanup)       |
| **Realtime WebSockets**   | Socket.io, `@nestjs/websockets`            | Exam room presence, student monitoring, live warnings     |
| **Security & Auth**       | Argon2id, Passport.js, JWT, Helmet         | Password hashing, token rotation, rate limiting           |
| **Dashboard**             | Next.js 14, React 18, Tailwind CSS         | App Router, Shadcn UI components, responsive admin layout |
| **State & Data Fetching** | TanStack Query v5, Zustand, Axios          | Server-state caching, 401 token refresh rotation          |
| **Data Visualization**    | Recharts (lazy-loaded via `next/dynamic`)  | Exam status distribution donut chart                      |
| **Mobile Application**    | Flutter 3.22+, Dart 3.4+                   | Android & iOS native student exam application             |
| **Mobile State**          | Flutter Riverpod 2.6                       | Reactive auth, exam timer, answers, and violation states  |
| **Mobile Local DB**       | Drift (SQLite), `sqlite3_flutter_libs`     | Offline-first answer persistence & background sync        |
| **Mobile Networking**     | Dio 5.9, `dio_smart_retry`, Socket.io      | HTTP retry with exponential backoff, WebSocket client     |
| **Mobile Security**       | Kotlin Native MethodChannel, `FLAG_SECURE` | OS-level screenshot blocking & kiosk immersion            |
| **Monorepo & DevOps**     | pnpm 9, PM2, Docker, Nginx, Let's Encrypt  | Workspace orchestration, reverse proxy, zero-downtime     |

---

## 🗄️ Database Architecture (23 Tables)

```text
 ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
 │    users     │────<│   students   │────<│exam_sessions │
 └──────┬───────┘     └──────────────┘     └──────┬───────┘
        │                                         │
        │             ┌──────────────┐            ├──< answers
        ├────────────<│   teachers   │            ├──< scores
        │             └──────┬───────┘            └──< session_logs
        │                    │
        ▼                    ▼
 ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
 │refresh_tokens│     │question_banks│────<│  questions   │
 └──────────────┘     └──────────────┘     └──────┬───────┘
                             │                    ├──< question_options
                             ▼                    └──< question_tags
                      ┌──────────────┐
                      │    exams     │────< exam_questions (packages A/B/C/D)
                      └──────┬───────┘────< exam_classes
                             └───< exam_tokens
```

### Table Summary:

1. **Identity & Auth (5 tables):** `users`, `students`, `teachers`, `teacher_subjects`, `refresh_tokens`.
2. **Academic Structure (4 tables):** `academic_years`, `majors`, `classes`, `subjects`.
3. **Question Bank (4 tables):** `question_banks`, `questions`, `question_options`, `question_tags`.
4. **Exam Management (5 tables):** `exams`, `exam_tokens`, `exam_packages`, `exam_questions`, `exam_classes`.
5. **Session & Grading (5 tables):** `exam_sessions`, `session_logs`, `answers`, `scores`, `settings`.

_All core entities support soft deletes via `deleted_at: DateTime?`. Prisma middleware automatically injects `deleted_at: null` across all queries._

---

## 🚀 Local Development Setup

### Prerequisites

- **Node.js**: `v22.x LTS` (see `.nvmrc`)
- **pnpm**: `v9.15.4+` (`corepack enable && corepack prepare pnpm@9.15.4 --activate`)
- **Docker Desktop**: Running locally
- **Flutter SDK**: `v3.22+` & **Android Studio** (API 33 or 34 SDK)

### Step 1: Install Dependencies & Build Shared Library

```powershell
# From the repository root
pnpm install

# Build shared TypeScript package (enums, schemas, types)
cd packages/shared
pnpm run build
cd ../..
```

### Step 2: Launch Docker Infrastructure

```powershell
# Starts PostgreSQL (5433), Redis (6379), and MinIO (9000/9001)
docker compose up -d postgres redis minio
```

### Step 3: Database Migration & Seeding

```powershell
# Apply Prisma migrations
pnpm db:migrate

# Seed realistic Indonesian school data (Admin, Teachers, 60 Students, Exams)
pnpm db:seed
```

### Step 4: Run Backend API (NestJS)

```powershell
cd apps/backend
pnpm dev
```

- **API Endpoint:** `http://localhost:3000`
- **Interactive Swagger Documentation:** `http://localhost:3000/api/docs`

### Step 5: Run Dashboard (Next.js)

Open a new terminal:

```powershell
cd apps/dashboard
pnpm dev
```

- **Web Portal:** `http://localhost:3001`

---

## 📱 Running the Mobile App (Student Client)

### Option A: Physical Android Device (Recommended)

1. Enable **Developer Options** and **USB Debugging** on your Android phone.
2. Connect your phone via USB cable and allow debugging.
3. Open a terminal and setup USB port forwarding:
   ```powershell
   adb reverse tcp:3000 tcp:3000
   ```
4. Run the app:
   ```powershell
   cd apps/mobile
   flutter run -d <DEVICE_ID> --dart-define=API_URL=http://localhost:3000
   ```
   _(Find `<DEVICE_ID>` by running `flutter devices`)._

### Option B: Android Emulator

Launch a 64-bit emulator (e.g. Android 13 API 33 `x86_64`):

```powershell
cd apps/mobile
flutter run
```

---

## 🔑 Default Seeded Accounts & Credentials

### 1. Dashboard Portals (`http://localhost:3001`)

| Role                    | Username             | Password      | Assigned Responsibilities                       |
| ----------------------- | -------------------- | ------------- | ----------------------------------------------- |
| **Administrator**       | `admin`              | `admin123`    | Full access (Users, Academic, Exams, Settings)  |
| **Operator**            | `operator`           | `operator123` | Academic Years, Classes, Majors, Subjects       |
| **Teacher (Math)**      | `198501012010011001` | `teacher123`  | Math Question Bank, Exams, Real-time Monitoring |
| **Teacher (Physics)**   | `199003152014012002` | `teacher123`  | Physics/Chemistry Banks, Essay Grading          |
| **Teacher (Biology)**   | `198807202012011003` | `teacher123`  | Biology & Indonesian Banks                      |
| **Teacher (Economics)** | `199107152018012004` | `teacher123`  | Economics, Geography, Sociology Banks           |

### 2. Student Mobile Login (`apps/mobile`)

| Format         | Credentials                 | Description                                                          |
| -------------- | --------------------------- | -------------------------------------------------------------------- |
| **Username**   | `202501001` s/d `202506010` | 60 seeded students (Format: `YYYY` + Class `01-06` + Roll `001-010`) |
| **Password**   | Sama dengan NIS             | Password default sama persis dengan NIS siswa                        |
| **Exam Token** | Dinamis (8 karakter)        | Lihat token di Dashboard pada menu **Ujian** ➔ Tombol 🔑 (Token)     |

---

## 🌐 Production VPS Deployment (Hybrid Architecture)

For production deployment on Linux VPS (Ubuntu 22.04/24.04, 4 vCPU, 12 GB RAM), we use a high-performance **Hybrid Model**:

- **Docker:** Runs PostgreSQL 16, Redis 7 (with password), and MinIO. All ports bound strictly to `127.0.0.1` for maximum security.
- **PM2:** Manages NestJS Backend (port 3000) and Next.js Dashboard (port 3001) natively on the host with zero container overhead and automatic memory restart guards.
- **Nginx:** Acts as the reverse proxy on port 80/443 with automated Let's Encrypt SSL and full WebSocket upgrade support.

### Quick Deployment Steps

Detailed step-by-step instructions are available in [deploy/README_VPS.md](deploy/README_VPS.md).

```bash
# 1. SSH into fresh VPS and clone repo
ssh root@<VPS_IP>
git clone <REPO_URL> /var/www/secure-cbt
cd /var/www/secure-cbt

# 2. Run one-shot automated setup script (installs Docker, Node 22, pnpm, PM2, Nginx, UFW)
bash deploy/setup-vps.sh

# 3. Configure production environment files
cp .env.prod.infra.example .env
cp apps/backend/.env.production.example apps/backend/.env
cp apps/dashboard/.env.production.example apps/dashboard/.env.production

# 4. Start internal databases & run migrations
docker compose -f docker-compose.prod.yml up -d
pnpm install
cd packages/shared && pnpm run build && cd ../..
cd apps/backend && npx prisma migrate deploy && cd ../..

# 5. Build and launch apps with PM2
pnpm run build
pm2 start ecosystem.config.cjs
pm2 save && pm2 startup

# 6. Configure Nginx & SSL
sudo cp deploy/nginx/secure-cbt.conf /etc/nginx/sites-available/secure-cbt
sudo ln -s /etc/nginx/sites-available/secure-cbt /etc/nginx/sites-enabled/
sudo certbot --nginx -d cbt.domainanda.com -d api.domainanda.com
```

### Future One-Click Updates

Whenever you push changes to GitHub, deploy them to your VPS with zero downtime:

```bash
./deploy/update.sh
```

---

## 🧪 Quality Assurance & Test Suites

The project enforces strict code quality and rigorous unit testing before any release:

```powershell
# 1. Run all Backend Unit Tests (31 test cases across 5 domain services)
pnpm --filter @secure-cbt/backend test

# 2. Run Backend End-to-End Integration Tests
pnpm --filter @secure-cbt/backend test:e2e

# 3. Check TypeScript compile health across monorepo
pnpm run typecheck

# 4. Analyze Flutter Mobile static types and lint rules
cd apps/mobile
flutter analyze lib/
```

---

## 📡 Real-Time WebSocket Events (`/monitoring`)

The monitoring gateway enables real-time communication between student mobile devices and the teacher proctoring dashboard:

| Event Name             | Direction                    | Payload                                         | Description                                         |
| ---------------------- | ---------------------------- | ----------------------------------------------- | --------------------------------------------------- |
| `student.connected`    | Client ➔ Gateway ➔ Dashboard | `{ studentId, studentName, examId, deviceId }`  | Broadcasts when student enters the exam screen      |
| `student.disconnected` | Gateway ➔ Dashboard          | `{ studentId, examId, timestamp }`              | Fires automatically when client drops connection    |
| `answer.saved`         | Client ➔ Gateway ➔ Dashboard | `{ sessionId, questionId, examId }`             | Updates live progress bar on dashboard              |
| `warning.triggered`    | Client ➔ Gateway ➔ Dashboard | `{ sessionId, examId, count, event }`           | Alerts teacher of cheating attempt (app minimized)  |
| `exam.submitted`       | Client ➔ Gateway ➔ Dashboard | `{ sessionId, examId, studentId, studentName }` | Marks student as finished on dashboard in real-time |

---

## 🗺️ Roadmap & Upcoming Milestones

- [x] **Phase 1-8:** Monorepo setup, NestJS backend, Next.js dashboard, Flutter app foundation.
- [x] **Phase 9:** Thermo-Nuclear code quality audit, DTO elimination, Soft-delete middleware.
- [x] **Phase 10:** Post-audit hardening, type safety, admin exam authoring, Fisher-Yates shuffle.
- [x] **Phase 11:** Mobile UI/UX overhaul to Modern Minimalist Academic (Light Mode Only).
- [x] **Phase 12:** "Heroic Scholar" vibrant EdTech theme, dynamic subject palettes, native confetti.
- [x] **Phase 13:** Production VPS readiness, PM2 monorepo configuration, and Nginx reverse proxy.
- [ ] **Phase 14 (Next):** Audio/Image asset question attachments via MinIO pre-signed URLs.
- [ ] **Phase 15:** Automated Excel question bank import via BullMQ background queue.
- [ ] **Phase 16:** School-wide comparative analytics & PDF report card export.

---

## 📄 License & Intellectual Property

Copyright © 2026 **Secure CBT Platform**. Developed for Indonesian Secondary Schools.  
All rights reserved. Proprietary software. Unauthorized copying, distribution, or deployment without explicit authorization is strictly prohibited.
