# SSOT Versioning System & Dashboard Changelog Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Establish a Single Source of Truth (`version.json`) and automated synchronization script (`scripts/sync-version.mjs`) across monorepo packages, mobile, and dashboard, update the dashboard changelog with recent releases (`v1.7.5`, `v1.8.0`, `v1.9.0`), and document the mandatory release SOP.

**Architecture:** A root `version.json` stores canonical SemVer and Android `buildNumber`. The script `scripts/sync-version.mjs` provides bump, sync, and check operations that automatically propagate version numbers to `package.json` files, `pubspec.yaml`, `app_info.dart`, and shared constants. Dashboard `changelog.ts` and `changelog-modal.tsx` are updated with the latest releases and category filters.

**Tech Stack:** Node.js (ESM), TypeScript, Next.js, Flutter / Dart, Vitest.

**Spec:** In-conversation approved specification on 2026-11-03.

## Global Constraints

- Android `buildNumber` (+N) must always increment on new builds.
- SemVer format `MAJOR.MINOR.PATCH` must remain strictly consistent across all packages.
- Zero external dependencies for `scripts/sync-version.mjs` (uses built-in Node.js `node:fs` and `node:path`).
- All existing tests in dashboard and mobile must remain passing.

## Review Focus

- Malformed version string passed to bump script (must reject with clear error without mutating files).
- Out-of-sync detection in `--check` mode (must return non-zero exit code if any manifest deviates from `version.json`).
- Changelog filter tab switching in dashboard (must display `v1.8-v1.9` releases properly).
- `app_info.dart` format preservation (must preserve brand identity constants untouched while updating version fields).
- Flutter `pubspec.yaml` YAML formatting (must preserve comments and exact line structure).

---

### Task 1: SSOT Versioning Infrastructure (`version.json` & `sync-version.mjs`)

**Files:**
- Create: `version.json`
- Create: `scripts/sync-version.mjs`
- Create: `scripts/__tests__/sync-version.spec.mjs`
- Modify: `package.json`

**Interfaces:**
- Produces: CLI commands `pnpm version:bump <version|patch|minor|major> [buildNumber]`, `pnpm version:sync`, and `pnpm version:check`.

- [ ] **Step 1: Create failing test for `sync-version.mjs`**

Write test verifying bump logic (calculating patch/minor/major, incrementing build number), file sync updates, and check mode detection.

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test scripts/__tests__/sync-version.spec.mjs` or `vitest run scripts/__tests__/sync-version.spec.mjs`
Expected: FAIL (script does not exist).

- [ ] **Step 3: Implement `version.json` and `scripts/sync-version.mjs`**

Implement canonical `version.json` initialized at `{"version": "1.9.0", "buildNumber": 21, "releaseDate": "2026-11-01"}`.
Implement `scripts/sync-version.mjs` reading and updating:
- `version.json`
- `package.json` (root)
- `packages/shared/package.json`
- `apps/backend/package.json`
- `apps/dashboard/package.json`
- `apps/mobile/pubspec.yaml`
- `apps/mobile/lib/core/constants/app_info.dart`
- `packages/shared/src/constants/version.ts`

- [ ] **Step 4: Add npm scripts in root `package.json`**

Add `"version:bump"`, `"version:sync"`, and `"version:check"` scripts.

- [ ] **Step 5: Run tests and verify sync operation**

Run: `node scripts/sync-version.mjs --check`
Expected: PASS (all files in sync).
Run: test suite for `sync-version`.

- [ ] **Step 6: Commit Task 1**

```bash
git add version.json scripts/ package.json
git commit -m "feat(infra): create SSOT versioning infrastructure and sync script"
```

---

### Task 2: Shared Constants & App Info Synchronization

**Files:**
- Create: `packages/shared/src/constants/version.ts`
- Modify: `packages/shared/src/constants/index.ts`
- Modify: `apps/dashboard/src/lib/constants/app-info.ts`

**Interfaces:**
- Produces: `APP_VERSION`, `APP_BUILD_NUMBER`, `APP_VERSION_STRING` exported from `@secure-cbt/shared`.
- Consumes: `APP_VERSION` in `apps/dashboard/src/lib/constants/app-info.ts`.

- [ ] **Step 1: Export version constants in `@secure-cbt/shared`**

Add `packages/shared/src/constants/version.ts` exporting `APP_VERSION = '1.9.0'`, `APP_BUILD_NUMBER = 21`, `APP_VERSION_STRING = '1.9.0+21'`. Re-export in `packages/shared/src/constants/index.ts` and `src/index.ts`.

- [ ] **Step 2: Update dashboard `app-info.ts` to consume shared version**

Update `apps/dashboard/src/lib/constants/app-info.ts` to use `APP_VERSION` from `@secure-cbt/shared`.

- [ ] **Step 3: Compile shared and run dashboard typecheck**

Run: `pnpm --filter @secure-cbt/shared build`
Run: `pnpm --filter @secure-cbt/dashboard typecheck`
Expected: 0 errors.

- [ ] **Step 4: Commit Task 2**

```bash
git add packages/shared/ apps/dashboard/
git commit -m "feat(shared): expose canonical version constants and connect to dashboard app-info"
```

---

### Task 3: Dashboard Changelog Updates (`v1.7.5`, `v1.8.0`, `v1.9.0`) & Filter Group

**Files:**
- Modify: `apps/dashboard/src/lib/constants/changelog.ts`
- Modify: `apps/dashboard/src/components/changelog/changelog-modal.tsx`
- Modify: `apps/dashboard/src/components/changelog/__tests__/changelog-modal.spec.tsx`

**Interfaces:**
- Produces: Changelog entries for `v1.9.0`, `v1.8.0`, `v1.7.5`.
- Produces: Filter group `'v1.8-v1.9'`.

- [ ] **Step 1: Write/update unit test in `changelog-modal.spec.tsx`**

Add test asserting `v1.9.0` appears as latest entry, and filtering by tab `'v1.8-v1.9'` displays `v1.9.0` and `v1.8.0`.

- [ ] **Step 2: Run test to verify failure**

Run: `pnpm --filter @secure-cbt/dashboard test src/components/changelog/__tests__/changelog-modal.spec.tsx`
Expected: FAIL (missing entries / tab).

- [ ] **Step 3: Update `changelog.ts` and `changelog-modal.tsx`**

1. Add `'v1.8-v1.9'` to `ChangelogEntry['versionGroup']` and `VersionGroupFilter`.
2. Add entries for `v1.9.0` (isLatest: true), `v1.8.0`, `v1.7.5`.
3. Set `isLatest: false` on `v1.7.4`.
4. Update `changelog-modal.tsx` tabs list to include `'v1.8-v1.9'` with label `'v1.8 - v1.9'`.

- [ ] **Step 4: Run test to verify success**

Run: `pnpm --filter @secure-cbt/dashboard test src/components/changelog/__tests__/changelog-modal.spec.tsx`
Expected: PASS.

- [ ] **Step 5: Commit Task 3**

```bash
git add apps/dashboard/
git commit -m "feat(dashboard): update changelog with v1.7.5, v1.8.0, and v1.9.0 releases"
```

---

### Task 4: SOP Documentation Updates & Release Protocol

**Files:**
- Modify: `docs/VERSIONING_AND_RELEASE_GUIDELINES.md`
- Modify: `PROGRESS.md`

**Interfaces:**
- Produces: Standard Operating Procedure for single-command version updates and post-release checklist.

- [ ] **Step 1: Update `docs/VERSIONING_AND_RELEASE_GUIDELINES.md`**

Replace manual 5-file checklist with the new Single-Command workflow:
- `pnpm version:bump <version>` (e.g. `pnpm version:bump 1.9.1` or `pnpm version:bump patch`)
- Mandatory Post-Update Checklist:
  1. Bump version via `pnpm version:bump <new_version>`
  2. Add release changelog in `apps/dashboard/src/lib/constants/changelog.ts`
  3. Update `PROGRESS.md` summary
  4. Run tests: `node scripts/sync-version.mjs --check && pnpm test && flutter test`
  5. Commit & Tag

- [ ] **Step 2: Update `PROGRESS.md`**

Update note on versioning policy and tools available in Phase 37+.

- [ ] **Step 3: Commit Task 4**

```bash
git add docs/ PROGRESS.md
git commit -m "docs: update SOP versioning guidelines to use single-command SSOT workflow"
```

---

### Task 5: Monorepo End-to-End Verification

**Files:**
- All touched files.

- [ ] **Step 1: Test `pnpm version:check`**

Run: `node scripts/sync-version.mjs --check`
Expected: Exit code 0 (All 7 targets synchronized).

- [ ] **Step 2: Run all shared, backend, and dashboard unit tests**

Run: `pnpm test`
Expected: All tests pass across shared, backend, dashboard.

- [ ] **Step 3: Run dashboard production build**

Run: `pnpm --filter @secure-cbt/dashboard build`
Expected: 0 errors across 20 routes.

- [ ] **Step 4: Run mobile tests and analysis**

Run: `flutter test` (in `apps/mobile`)
Run: `flutter analyze lib/ test/` (in `apps/mobile`)
Expected: All tests pass, 0 issues.

- [ ] **Step 5: Verify git status and finalize**
