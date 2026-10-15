# CBT Enhancements: Parser Safety, Skeletons, Mission Control Superpowers, Formal Reports & Grading History Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement 6 critical CBT enhancements: remove syntax `=` from matching question parsers to protect math & code questions, add modern table & card loading skeletons, introduce mission control proctor controls & real-time broadcast alerts, generate formal school PDF reports with customizable 2+ signatures matching the Wonosobo standard, provide elegant Excel question templates and score sheets, and add essay grading revision history with audit logs.

**Architecture:**
- Remove `=` from matching question regex in `WordParserService` and `ExcelParserService`.
- Extend `DataTable` with animated `skeletonRows` matching column layouts.
- Add proctor control endpoints (`force-submit`, `reset-warnings`, `extend-time`, `unlock`, `broadcast`) in backend, handle real-time alerts via `MonitoringGateway`, and add search/class filters + proctor buttons in dashboard monitoring.
- Build printable formal PDF report dialog in `reports/page.tsx` adhering to the official layout in `assets/KKA-X AKL.pdf` with customizable signatures (Jabatan, Nama & Gelar) and local storage memory.
- Produce elegant `.xlsx` downloads using `exceljs` with school kop, summary statistics, and signature lines.
- Implement essay revision audit trails in `GradingService`, add `/grading/session/:sessionId/question/:questionId/history`, and provide "Belum Dinilai" vs "Sudah Dinilai" tabs with revision timelines in `/dashboard/grading`.

**Tech Stack:** NestJS, Prisma ORM, Socket.io, Vitest, Next.js 14, TanStack React Table v8, Lucide React, ExcelJS, Tailwind CSS.

---

## Global Constraints
- Equations (e.g. $y = 2x + 1$) and programming syntax (e.g. `const x = 10;`) must NEVER trigger matching question parsing or get split at `=`. Matching questions must only recognize arrows (`->`, `→`, `➔`, `➜`, `➡`, `⇒`).
- Formal PDF report layout must reflect the official standard in `assets/KKA-X AKL.pdf`: School logo, centered kop, two-column metadata, score table, left-aligned summary box (Rata-Rata, Terendah, Tertinggi), and right-aligned customizable signatures (Kota, Tanggal, Jabatan, Nama Lengkap & Gelar underlined).
- Proctor broadcast alerts must be delivered via WebSocket with support for Low Alert (soft non-intrusive banner) and High Alert (prominent high-contrast banner).
- Essay grading must preserve all past revision logs (previous score, feedback, revision note, grader, timestamp) without overwriting historical audit trails.

---

## Review Focus
1. **Math & Coding Parser Safety:** An imported question with options containing `=` (e.g. `x = 5`, `y = ax + b`) is parsed as standard Multiple Choice, not Matching.
2. **Proctor Session Controls:** Calling `force-submit` immediately updates session status to `SUBMITTED`, grades answers, and notifies monitoring clients.
3. **Proctor Broadcast Alert:** Calling `broadcast` emits `exam.broadcast` with message and urgency level to all connected exam participants.
4. **Signature Customization:** The PDF report dialog allows configuring 2 or more signers with custom roles and names, saving them to `localStorage`.
5. **Essay Revision Trail:** Updating an essay score creates an audit entry with previous score, new score, revision note, and timestamp.

---

## File Structure

```
apps/backend/src/modules/
├── question-bank/
│   ├── parsers/
│   │   ├── word-parser.service.ts         # Remove = from matching regex
│   │   └── excel-parser.service.ts        # Remove = from matching regex
│   ├── templates/template-generator.ts    # Update guidance to use arrows only
│   └── __tests__/
│       ├── word-parser.service.spec.ts    # Add math/code equation tests
│       └── excel-parser.service.spec.ts   # Add math/code equation tests
├── monitoring/
│   ├── monitoring.controller.ts           # Add POST /monitoring/exams/:id/broadcast
│   ├── monitoring.gateway.ts              # Emit exam.broadcast with urgency
│   └── monitoring.service.ts              # Broadcast logic & payload formatting
├── session/
│   ├── session.controller.ts              # Add proctor control endpoints
│   ├── session.service.ts                 # forceSubmit, resetWarnings, extendTime, unlock
│   └── __tests__/session.service.spec.ts  # Tests for proctor actions
└── grading/
    ├── grading.controller.ts              # Add revision history endpoint & status filter
    ├── grading.service.ts                 # Essay revision logging & history retrieval
    └── __tests__/grading.service.spec.ts  # Test essay revision history
apps/dashboard/src/
├── components/ui/
│   ├── data-table.tsx                     # Add skeleton loading rows
│   └── skeleton.tsx                       # Standard skeleton component
├── components/reports/
│   ├── formal-report-modal.tsx            # Formal Wonosobo-standard PDF modal
│   └── __tests__/formal-report-modal.spec.tsx
├── components/monitoring/
│   ├── proctor-broadcast-modal.tsx        # Announcement modal (Low/High Alert)
│   └── student-action-dialog.tsx          # Proctor force-submit/extend/reset dialog
├── app/dashboard/
│   ├── monitoring/page.tsx                # Class filter, search, proctor actions, broadcast
│   ├── reports/page.tsx                   # Formal PDF modal trigger, elegant Excel export
│   └── grading/page.tsx                   # Pending vs Completed tabs, revision timeline
└── lib/api-service.ts                     # API client methods for proctor & grading actions
```

---

### Task 1: Question Parsers - Remove Syntax `=` from Matching Detection (Math & Code Protection)

**Files:**
- Modify: `apps/backend/src/modules/question-bank/parsers/word-parser.service.ts`
- Modify: `apps/backend/src/modules/question-bank/parsers/excel-parser.service.ts`
- Modify: `apps/backend/src/modules/question-bank/templates/template-generator.ts`
- Test: `apps/backend/src/modules/question-bank/__tests__/word-parser.service.spec.ts`
- Test: `apps/backend/src/modules/question-bank/__tests__/excel-parser.service.spec.ts`

- [ ] **Step 1: Write failing unit test for math formula with `=` and coding snippet with `=`**
  Assert that options such as `y = 2x + 1` or `const count = 0;` are parsed as Multiple Choice options and NOT split into matching pairs.
- [ ] **Step 2: Run tests to verify they fail or demonstrate matching misclassification**
- [ ] **Step 3: Replace `/(?:->|→|➔|➜|➡|⇒|=)/` with `/(?:->|→|➔|➜|➡|⇒)/` in Word & Excel parser services**
- [ ] **Step 4: Update template generator instructions and examples to exclusively showcase arrow delimiters**
- [ ] **Step 5: Run unit tests to verify they pass**
- [ ] **Step 6: Commit changes**

---

### Task 2: Modern Table & Workstation Loading Skeletons

**Files:**
- Modify: `apps/dashboard/src/components/ui/data-table.tsx`
- Test: `apps/dashboard/src/components/ui/__tests__/data-table.spec.tsx`

- [ ] **Step 1: Write unit test in `data-table.spec.tsx` checking skeleton rows render when `loading={true}`**
- [ ] **Step 2: Update `DataTable` to render pulsating skeleton cells matching column widths instead of plain text**
- [ ] **Step 3: Run test to verify it passes**
- [ ] **Step 4: Commit changes**

---

### Task 3: Mission Control Proctor Actions & Real-Time Broadcast

**Files:**
- Modify: `apps/backend/src/modules/session/session.controller.ts`
- Modify: `apps/backend/src/modules/session/session.service.ts`
- Modify: `apps/backend/src/modules/monitoring/monitoring.controller.ts`
- Modify: `apps/backend/src/modules/monitoring/monitoring.gateway.ts`
- Modify: `apps/dashboard/src/lib/api-service.ts`
- Create: `apps/dashboard/src/components/monitoring/proctor-broadcast-modal.tsx`
- Create: `apps/dashboard/src/components/monitoring/student-action-dialog.tsx`
- Modify: `apps/dashboard/src/app/dashboard/monitoring/page.tsx`
- Test: `apps/backend/src/modules/session/__tests__/session.service.spec.ts`

- [ ] **Step 1: Write failing unit tests for session proctor actions (`forceSubmit`, `resetWarnings`, `extendTime`, `unlockSession`)**
- [ ] **Step 2: Implement proctor action methods in `SessionService` and endpoints in `SessionController`**
- [ ] **Step 3: Implement `POST /monitoring/exams/:id/broadcast` endpoint and `MonitoringGateway.broadcastToExam` method**
- [ ] **Step 4: Run backend tests to verify they pass**
- [ ] **Step 5: Add API client methods in `apps/dashboard/src/lib/api-service.ts`**
- [ ] **Step 6: Create `ProctorBroadcastModal` (supporting message, Low Alert, High Alert) and `StudentActionDialog`**
- [ ] **Step 7: Add search bar, class/rombel filter dropdown, proctor action buttons, and broadcast trigger to `monitoring/page.tsx`**
- [ ] **Step 8: Commit changes**

---

### Task 4: Formal School PDF Report with Customizable Signatures (Wonosobo Standard)

**Files:**
- Create: `apps/dashboard/src/components/reports/formal-report-modal.tsx`
- Create: `apps/dashboard/src/components/reports/__tests__/formal-report-modal.spec.tsx`
- Modify: `apps/dashboard/src/app/dashboard/reports/page.tsx`

- [ ] **Step 1: Write unit tests for `FormalReportModal` checking default values, customizable signers (2+), and print preview**
- [ ] **Step 2: Implement `FormalReportModal` with exact layout from `assets/KKA-X AKL.pdf`:**
  - Header: School logo on left, formal centered assessment title, school name, academic year, crisp dividing line.
  - Metadata: 2-column block (Provinsi, Kota/Kabupaten, Sekolah/Rombel, Mata Pelajaran, Tanggal).
  - Clean score table: `NO`, `USERNAME / NIS`, `NAMA SISWA`, `MATA PELAJARAN (KKA)`, `JUMLAH NILAI`.
  - Left summary box: *Rata-Rata*, *Terendah*, *Tertinggi*.
  - Right signature block: City & Date, customizable signers with custom roles and bold underlined names, stored in `localStorage`.
- [ ] **Step 3: Integrate "Cetak Laporan Resmi (PDF)" button and modal in `/dashboard/reports/page.tsx`**
- [ ] **Step 4: Run tests to verify they pass**
- [ ] **Step 5: Commit changes**

---

### Task 5: Tidy & Elegant Excel Templates & Score Report Export

**Files:**
- Modify: `apps/backend/src/modules/question-bank/templates/template-generator.ts`
- Modify: `apps/dashboard/src/app/dashboard/reports/page.tsx`

- [ ] **Step 1: Enhance `generateExcelTemplate()` with elegant styling, formatted instruction cards, and clean examples**
- [ ] **Step 2: Add formatted Excel export (`.xlsx`) to `/dashboard/reports/page.tsx` using `exceljs` featuring school header, student table, formulas (`AVERAGE`, `MIN`, `MAX`), and signature footer**
- [ ] **Step 3: Verify Excel template generation in backend unit tests**
- [ ] **Step 4: Commit changes**

---

### Task 6: Essay Grading Revision History, Audit Trail & Completed Review Tabs

**Files:**
- Modify: `apps/backend/src/modules/grading/grading.controller.ts`
- Modify: `apps/backend/src/modules/grading/grading.service.ts`
- Modify: `apps/dashboard/src/lib/api-service.ts`
- Modify: `apps/dashboard/src/app/dashboard/grading/page.tsx`
- Test: `apps/backend/src/modules/grading/__tests__/grading.service.spec.ts`

- [ ] **Step 1: Write failing unit test for essay revision logging in `GradingService`**
- [ ] **Step 2: Update `GradingService.gradeEssay` to log previous score, feedback, revision note, grader ID, and timestamp into `SessionLog` (`event: 'ESSAY_REVISED'`)**
- [ ] **Step 3: Add `GET /grading/session/:sessionId/question/:questionId/history` endpoint to return audit trail**
- [ ] **Step 4: Support `status?: 'pending' | 'completed' | 'all'` query parameter in `getPendingEssays`**
- [ ] **Step 5: Run backend tests to verify they pass**
- [ ] **Step 6: Update `/dashboard/grading/page.tsx` with "Belum Dinilai" vs "Sudah Dinilai" tabs, Catatan Revisi input, and collapsible audit history timeline**
- [ ] **Step 7: Commit changes**

---

### Task 7: End-to-End Monorepo Verification

- [ ] **Step 1: Run all workspace tests (`cmd.exe /c pnpm -r test`)**
- [ ] **Step 2: Run all workspace builds (`cmd.exe /c pnpm -r build`)**
- [ ] **Step 3: Commit and push to master**
