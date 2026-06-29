# Mobile UI/UX Polish Implementation Plan

> **For agentic workers:** Use subagent-driven-development. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Fix all 47 mobile UI/UX issues — translations, dark mode, architecture cleanup, UX hardening.

**Architecture:** 5 phases ordered by blast radius. Phase 0 = quick wins (translations, autosave), Phase 1 = architecture (providers, error handling), Phase 2 = visual (dark mode colors), Phase 3 = UX edge cases, Phase 4 = polish.

**Tech Stack:** Flutter 3.22+, Riverpod, Drift, Dio, GoRouter, Material 3

## Global Constraints

- All user-facing strings in Bahasa Indonesia
- Every `Color(0xFF...)` replacement uses `theme.colorScheme.*`
- Every screen with API calls gets a dedicated Riverpod provider
- Every `catch (_) {}` gets at minimum `AppLogger.error()`
- `dart analyze lib/` must pass with zero errors after each task
- Replace emoji characters with `Icon` widgets or wrap in `Semantics`

---

## File Structure

### Files to create
| File | Responsibility |
|------|---------------|
| `features/home/providers/home_provider.dart` | Fetch home data, stats, upcoming exams |
| `features/exams/providers/exams_provider.dart` | Fetch exam list with filtering |
| `features/exam/providers/result_provider.dart` | Fetch exam result |
| `features/history/providers/history_provider.dart` | Fetch exam history |

### Files to modify (19 total)
| File | Changes |
|------|---------|
| Phase 0: `submit_dialog.dart`, `question_palette.dart`, `exam_bottom_bar.dart`, `exam_screen.dart`, `login_screen.dart`, `home_screen.dart`, `result_screen.dart`, `exam_provider.dart`, `exam_question_card.dart` | Translations, semantics, autosave, debounce |
| Phase 1: 4 new provider files + 4 screen files | Extract API calls, fix error swallowing |
| Phase 2: 14 files (all screens/widgets) | Replace 130+ hardcoded colors |
| Phase 3: `exam_provider.dart`, `router.dart`, `auth_provider.dart`, `exam_screen.dart`, `exam_question_card.dart`, `history_screen.dart` | Timer drift, unsafe casts, refresh token, multi-select |
| Phase 4: `profile_screen.dart`, `exam_detail_screen.dart`, `empty_state.dart`, `scaffold_with_nav_bar.dart`, `exam_app_bar.dart` | Deduplication, branding, polish |

---

## Phase 0 — Quick Wins (5 tasks, high impact, small changes)

### Task 0.1: Translate submit dialogs to Indonesian

**Files:**
- Modify: `features/exam/presentation/widgets/submit_dialog.dart`
- Modify: `features/exam/presentation/widgets/question_palette.dart:160-177`
- Modify: `features/exam/presentation/widgets/exam_bottom_bar.dart:170`
- Modify: `features/exam/presentation/screens/exam_screen.dart:206`

| Location | English → Indonesian |
|----------|---------------------|
| `submit_dialog.dart` title | `'Submit Exam?'` → `'Kumpulkan Ujian?'` |
| `submit_dialog.dart` body (partial) | `'You have answered...'` → `'Kamu baru menjawab ...'` |
| `submit_dialog.dart` body (complete) | `'All questions answered...'` → `'Semua soal sudah terjawab...'` |
| `submit_dialog.dart` cancel | `'CANCEL'` → `'BATAL'` |
| `submit_dialog.dart` submit | `'SUBMIT'` → `'KUMPULKAN'` |
| `submit_dialog.dart` warning body | `'Your answers...'` → `'Jawaban akan dikumpulkan...'` |
| `exam_bottom_bar.dart:170` | `'Submit'` → `'Kumpulkan'` |
| `question_palette.dart` | Same as submit_dialog translations |
| `exam_screen.dart:206` | `'Exam auto-submitted...'` → `'Ujian otomatis dikumpulkan...'` |

### Task 0.2: Translate login screen to Indonesian

**File:** `features/auth/presentation/screens/login_screen.dart`

| Line | English → Indonesian |
|------|---------------------|
| 84 | `'Welcome Back 👋'` → `'Selamat Datang'` |
| 93 | `'Sign in to continue...'` → `'Masuk untuk melanjutkan ujian'` |
| 111 | `'Student ID / Username'` → `'NIS / Username'` |
| 122 | `'Enter your student ID'` → `'Masukkan NIS atau username'` |
| 142 | `'Enter your password'` → `'Masukkan kata sandi'` |
| 176 | `'Login'` → `'Masuk'` |
| 185 | `'Secure & Protected'` → `'Aman & Terlindungi'` |

Remove the 👋 emoji from the title. Add "Secure CBT" branding text below the icon.

### Task 0.3: Add Semantics to emoji

**Files:**
- Modify: `features/home/presentation/screens/home_screen.dart:176`

```dart
// Before:
Text('🔔 Ujian Mendatang')
// After:
Row(children: [
  Icon(Icons.notifications_outlined, size: 20, color: Colors.orange),
  const SizedBox(width: 8),
  Text('Ujian Mendatang'),
])
```

For `result_screen.dart:125` — remove `🎉` from the Text or wrap in `ExcludeSemantics`.

### Task 0.4: Fix autosave to actually save

**File:** `features/exam/providers/exam_provider.dart:255-259`

```dart
void _startAutosave() {
  _autosaveTimer?.cancel();
  _autosaveTimer = Timer.periodic(const Duration(seconds: 15), (_) async {
    if (state.sessionId == null || state.answers.isEmpty) return;
    AppLogger.debug('Autosave: ${state.answers.length} answers');
  });
}
```

### Task 0.5: Fix essay debounce

**File:** `features/exam/presentation/widgets/exam_question_card.dart:209`

Add a `Timer? _debounce` field. In `onChanged`, cancel existing timer and start a new 500ms debounce before calling `onSaveAnswer`.

---

## Phase 1 — Architecture (3 tasks)

### Task 1.1: Extract screen API calls into Riverpod providers

**Create:** `features/home/providers/home_provider.dart`
```dart
import 'package:riverpod/riverpod.dart';
import '../../../core/network/dio_client.dart';

final homeDataProvider = FutureProvider((ref) async {
  final dio = ref.read(dioProvider);
  final historyRes = await dio.get('/sessions/history');
  final examsRes = await dio.get('/exams/student');
  return {
    'history': historyRes.data['data'],
    'upcomingExams': examsRes.data['data'],
  };
});
```

Same pattern for `exams_provider.dart`, `result_provider.dart`, `history_provider.dart`.

**Modify** each screen file to replace `initState` / `useEffect` `dio.get()` calls with `ref.watch(providerName)`.

### Task 1.2: Fix all silent error swallowing

**Files:** All screens/providers with `catch (_) {}` (7 locations)

Replace every `catch (_) {}` with `catch (e) { AppLogger.error('[context]', e); }`. For user-facing failures, show a `SnackBar`.

### Task 1.3: Consolidate duplicate submit dialogs

**File:** `features/exam/presentation/widgets/submit_dialog.dart`

Refactor `showSubmitDialog` and `showWarningSubmitDialog` into one function:
```dart
Future<bool?> showSubmitDialog(BuildContext context, {
  required int answered,
  required int total,
  bool isWarning = false,
});
```

**File:** `features/exam/presentation/widgets/question_palette.dart`

Remove inline dialog at lines 160-177. Import and reuse `showSubmitDialog`.

---

## Phase 2 — Dark Mode Colors (2 tasks)

### Task 2.1: Replace hardcoded colors with theme tokens

**14 files, ~130 replacements.** Replacement mapping:

| Hardcoded | Theme Token | Used For |
|-----------|------------|----------|
| `Color(0xFF0F172A)` | `theme.colorScheme.onSurface` | Primary text |
| `Color(0xFFF8FAFC)` | `theme.colorScheme.surface` | Card/container bg |
| `Color(0xFFF1F5F9)` | `theme.colorScheme.surfaceContainerHighest` | Muted bg |
| `Color(0xFFE2E8F0)` | `theme.colorScheme.outlineVariant` | Borders, dividers |
| `Color(0xFFCBD5E1)` | `theme.colorScheme.outline` | Strong borders |
| `Color(0xFF94A3B8)` | `theme.colorScheme.outline` | Subtle borders |
| `Color(0xFF64748B)` | `theme.colorScheme.onSurfaceVariant` | Secondary text |
| `Color(0xFF475569)` | `theme.colorScheme.onSurfaceVariant` | Muted text |
| `Color(0xFF334155)` | `theme.colorScheme.onSurfaceVariant` | Darker muted text |
| `Colors.white` | `theme.colorScheme.surface` | White surfaces |
| `Colors.red.shade*` | `theme.colorScheme.error` | Error states |
| `Color(0x1A000000)` | `theme.colorScheme.shadow.withValues(alpha: 0.1)` | Shadows |

Keep semantic colors: `Colors.green.shade600` (correct/connected), `Colors.orange` (upcoming), `Colors.red.shade600` (wrong/disconnected) — these carry meaning.

### Task 2.2: Enable dark mode

**File:** `app/app.dart`

Change `themeMode: ThemeMode.light` to `themeMode: ThemeMode.system`.

---

## Phase 3 — UX Hardening (7 tasks)

### Task 3.1: Fix timer drift

**File:** `features/exam/providers/exam_provider.dart`

Replace `Timer.periodic` with wall-clock time tracking. Store `_sessionStartTime`, compute remaining from elapsed.

### Task 3.2: Fix PopScope message

**File:** `features/exam/presentation/widgets/submit_dialog.dart`

Change the warning dialog text to: `'Meninggalkan layar ini akan mengumpulkan ujian. Yakin?'`

### Task 3.3: Fix unsafe route extras

**File:** `app/router.dart`

Validate `sessionId` from extras. If null/empty, show error screen instead of passing empty string.

### Task 3.4: Fix tryAutoLogin refresh token flow

**File:** `features/auth/providers/auth_provider.dart`

If `/auth/me` returns 401, attempt token refresh using stored `refresh_token` before deleting all tokens.

### Task 3.5: Fix violation tracking window

**File:** `features/exam/presentation/screens/exam_screen.dart`

Track lifecycle transitions with timestamps. Filter out transitions within 1.5s of session start.

### Task 3.6: Fix multi-select answer parsing

**File:** `features/exam/presentation/widgets/exam_question_card.dart`

Store multi-select answers as `List<String>` instead of comma-separated `String`.

### Task 3.7: Fix hardcoded pass/fail threshold

**File:** `features/history/presentation/screens/history_screen.dart:74`

Read `passing_grade` from API response instead of hardcoding `60`.

---

## Phase 4 — Polish (6 tasks)

### Task 4.1: Remove duplicate AppCard from profile_screen

**File:** `features/profile/presentation/screens/profile_screen.dart`

Rename local `AppCard` to `ProfileCard`.

### Task 4.2: Add branding to login screen

**File:** `features/auth/presentation/screens/login_screen.dart`

Add "Secure CBT" text below the icon.

### Task 4.3: Fix ExamDetail "Lanjutkan" button

**File:** `features/exams/presentation/screens/exam_detail_screen.dart`

Disable button and show status text for FINISHED/CANCELLED exams.

### Task 4.4: Add EmptyState action button

**File:** `core/widgets/empty_state.dart`

Add optional `actionLabel` / `onAction` parameters that render an `ElevatedButton`.

### Task 4.5: Fix scaffold shadow color

**File:** `app/widgets/scaffold_with_nav_bar.dart:23`

Use `theme.colorScheme.shadow.withValues(alpha: 0.1)`.

### Task 4.6: Fix ExamAppBar dead parameter

**File:** `features/exam/presentation/widgets/exam_app_bar.dart`

Remove unused `remainingSeconds` parameter.

---

## Verification

```bash
cd apps/mobile && dart analyze lib/
```

Must pass with zero errors after each task. Run `flutter test` for any tests that exist.
