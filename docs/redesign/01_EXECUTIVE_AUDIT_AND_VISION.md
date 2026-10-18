# 01. Executive Audit & Vision: Assessia 2.0 Redesign

## 1. Executive Summary & Problem Statement
Assessia has rapidly evolved from a standard computer-based test platform into an enterprise school examination suite supporting high-stakes offline-first mobile testing, teacher Subject-Based Access Control (SBAC), KaTeX formula authoring, audio stimulus questions, and live proctor telemetry.

However, as the feature set expanded through versions 1.0 to 1.7.4, the administrative dashboard accumulated visual fragmentation:
- **Navigation Inefficiency**: Static sidebar navigation consumed valuable horizontal real estate (256px fixed) regardless of whether the user was viewing dense 40-question exam builders, split-pane essay grading, or live 40-seat proctoring grids.
- **Visual Inconsistency**: Elements swung between generic administrative table styling and dark-themed sidebars without unified design tokens for dual Dark/Light mode support.
- **Mobile Ergonomics**: On smartphone and tablet viewports used by mobile proctors, navigation relied on full-screen hamburger drawers that obscured live testing alerts.

## 2. Redesign Objectives & Key Results (OKRs)
1. **Zero Breaking Changes**: Preserve 100% of existing NestJS backend API contracts, database schema, Prisma models, RBAC/SBAC guards, and session state engines.
2. **Linear Academic Visual Identity**: Elevate the visual aesthetic to a futuristic, modern, and elegant academic standard using Electric Indigo (`#6366F1`/`#4F46E5`), Telemetry Cyan (`#06B6D4`), Deep Obsidian (`#07090E`), and Cool Titanium Slate (`#F8FAFC`).
3. **Ergonomic Auto-Docking Rail**: Introduce a collapsible 68px icon rail for dense workspaces with persistent state and contextual tooltips.
4. **Mobile Frosted Thumb Bar**: Provide an ergonomic bottom navigation bar with a live radar pulse trigger for instant proctor telemetry access.
5. **Universal Accessibility & Responsiveness**: Guarantee WCAG 2.2 AA contrast ratios and fluid responsive layouts across all viewports from 360px smartphones to 1440px+ proctoring displays.
6. **100% Automated Test Integrity**: All unit, component, integration, and mobile test suites must maintain a 100% pass rate with zero type-check or build errors.

## 3. User Roles & Target Workflows

| Role | Core Workflow | Primary Pain Point Addressed |
|---|---|---|
| **Administrator / Superadmin** | System configuration, academic structure, user directory, bulk imports. | Rapid access via `Ctrl+K` unified command bar; dense data-table views with optimized horizontal space. |
| **Operator / Proctors** | Session management, live proctoring, student token distribution, seating grid. | Realtime visual telemetry with cyan pulse indicators; mobile bottom-thumb access while walking the exam hall. |
| **Teacher (SBAC)** | Question bank authoring (KaTeX/Audio), exam scheduling, essay manual grading. | Split-pane distraction-free grading; KaTeX formula live preview; clear SBAC scoping indicators. |
| **Student (Mobile / Card Print)** | Examination execution, credential slips, result visibility. | Clean card print templates; high-contrast readability; smooth transition from dashboard exports. |
