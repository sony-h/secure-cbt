# 09. Migration Plan & Test Verification Matrix

## 1. Migration Protocol: Zero Breaking Changes
To protect live testing environments and ensure seamless deployments on `https://cbt.sonyhartono.web.id/`:
1. **Database Schema Continuity**: Zero modifications to Prisma schema or PostgreSQL migrations.
2. **NestJS API Contracts**: Zero endpoint changes, route renames, or payload structure alterations.
3. **Session & State Integrity**: Full backward compatibility with existing localStorage tokens, active student exam sessions, and offline SQLite synchronization engines.
4. **Clean Git Branching**: Work isolated on development branch `feat/dashboard-redesign` before final integration.

---

## 2. Test Verification Matrix & Gate Criteria

| Test Suite | Package / App | Minimum Passing Target | Critical Assertions |
|---|---|---|---|
| **Shared Contracts** | `packages/shared` | 14 / 14 (100%) | Audio schema validation, DTO types, exam enum contracts. |
| **Backend Services & SBAC** | `apps/backend` | 225 / 225 (100%) | Teacher access helpers, exam scoping, grading rules, auth recovery, cleanup cron. |
| **Dashboard UI & Integration** | `apps/dashboard` | >= 88 tests (100%) | Sidebar auto-docking rail, floating thumb bar, theme toggle, data tables, changelog modal. |
| **Student Mobile Engine** | `apps/mobile` | 102 / 102 (100%) | Offline SQLite database, audio play limits, countdown transition, violation deterrence. |
| **Production Build** | `apps/dashboard` | 20 / 20 routes | Zero typecheck errors, successful static page generation, optimized bundle output. |

---

## 3. Rollout Checklist
- [x] Branch initialized: `feat/dashboard-redesign`.
- [x] 9 Architecture artifacts documented in `docs/redesign/`.
- [ ] Tailwind & global CSS design tokens upgraded.
- [ ] Auto-Docking Rail & Floating Frosted Thumb Bar implemented in `layout.tsx`.
- [ ] Route-by-route UI enhancements applied across dashboard views.
- [ ] All automated test suites verified green.
- [ ] Production build verified with zero errors.
