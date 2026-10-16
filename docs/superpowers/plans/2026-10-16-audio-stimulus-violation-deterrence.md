# Audio Stimulus (Listening Comprehension) & Punitive Violation Deterrence Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement audio stimulus capabilities for listening questions (English/Arabic/PAI) with offline pre-caching and ANBK-style play limits, alongside punitive violation deterrence (intense vibration burst and 3s–5s alarm sound) when students attempt security breaches.

**Architecture:**
- Extend Prisma `Question` (`audio_url`, `audio_play_limit`) and `Exam` (`violation_vibration_enabled`, `violation_alarm_enabled`, `violation_alarm_duration_seconds`, `violation_alarm_sound`).
- Add audio upload endpoint (`POST /uploads/audio`) in backend and expose audio fields in session payloads.
- Add audio upload & play limit controls in dashboard question editor, plus violation sound/vibration toggles in exam settings.
- Implement Flutter offline audio pre-caching service, persistent Drift play-count tracking, in-exam `ListeningAudioPlayer` widget, and native Android violent vibration + alarm audio burst service.

**Tech Stack:** NestJS, Prisma, Next.js 14, Tailwind CSS, Flutter (Dart), Drift (SQLite), Android Kotlin `MethodChannel`, `audioplayers` / native soundpool.
**Spec:** `docs/superpowers/specs/2026-10-16-audio-stimulus-violation-deterrence-design.md`

## Global Constraints
- **Audio Pre-caching:** Audio files must be downloaded locally before questions begin so zero network buffering occurs during the exam.
- **Anti-Exploit Play Counter:** Remaining audio plays must be persisted in local SQLite/Drift so app re-renders, background pauses, or orientation changes never reset the play counter.
- **Alarm Burst Cutoff:** Violation alarm and vibration MUST automatically stop after the configured burst duration (3s or 5s); it must never ring indefinitely.
- **Offline Assets:** Violation alarm sounds must be bundled directly as offline assets inside the Flutter APK (<50KB each).

## Review Focus
1. **Play Limit Enforcement:** When `audio_play_limit` is 2, a student playing the audio twice cannot press play a 3rd time even after restarting the exam screen.
2. **Offline Audio Playback:** An exam with listening audio plays smoothly even with Wi-Fi disconnected once the exam has started.
3. **Violation Burst Cutoff:** Triggering a status bar or multi-window violation starts vibration and audio that terminates automatically at exactly 3s / 5s.
4. **Vibration Fallback:** If device sound is muted or on vibrate, the heavy vibration pattern still triggers reliably.
5. **Question Builder Validation:** Uploading an unsupported audio file type or >25MB returns a descriptive validation error in both backend and dashboard.

---

### Task 1: Shared Schemas & Prisma Database Migration

**Files:**
- Modify: `packages/shared/src/schemas/question.schema.ts`
- Modify: `packages/shared/src/schemas/exam.schema.ts`
- Modify: `packages/shared/src/types/index.ts`
- Modify: `apps/backend/prisma/schema.prisma`
- Test: `packages/shared/src/schemas/__tests__/audio-schema.spec.ts`

- [ ] **Step 1: Write unit tests for question audio schemas and exam violation alarm settings in shared package**
- [ ] **Step 2: Add `audio_url` and `audio_play_limit` to question schema; add violation alarm fields to exam schema**
- [ ] **Step 3: Update `schema.prisma` with `Question.audio_url`, `Question.audio_play_limit`, `Exam.violation_vibration_enabled`, `Exam.violation_alarm_enabled`, `Exam.violation_alarm_duration_seconds`, `Exam.violation_alarm_sound`**
- [ ] **Step 4: Run `pnpm --filter @secure-cbt/shared build` and `pnpm --filter @secure-cbt/backend db:generate`**
- [ ] **Step 5: Verify tests pass and commit**

---

### Task 2: Backend Audio Upload Endpoint & Session Data Delivery

**Files:**
- Modify: `apps/backend/src/modules/uploads/uploads.controller.ts`
- Modify: `apps/backend/src/modules/session/session.service.ts`
- Modify: `apps/backend/src/modules/question-bank/question-bank.service.ts`
- Test: `apps/backend/src/modules/uploads/__tests__/uploads.controller.spec.ts`
- Test: `apps/backend/src/modules/session/__tests__/session-audio.spec.ts`

- [ ] **Step 1: Write unit tests for `POST /uploads/audio` and session payload containing audio metadata & exam violation settings**
- [ ] **Step 2: Implement `uploadAudio` in `UploadsController` supporting MP3, M4A, WAV, OGG, AAC up to 25MB**
- [ ] **Step 3: Include `audio_url` and `audio_play_limit` in `session.service.ts` question assembly**
- [ ] **Step 4: Include violation alarm settings in exam session response payload**
- [ ] **Step 5: Run tests: `pnpm --filter @secure-cbt/backend test`**
- [ ] **Step 6: Commit changes**

---

### Task 3: Dashboard Question Audio Editor & Exam Alarm Settings

**Files:**
- Modify: `apps/dashboard/src/lib/api-service.ts`
- Create: `apps/dashboard/src/components/questions/audio-stimulus-field.tsx`
- Modify: `apps/dashboard/src/app/dashboard/questions/new/page.tsx`
- Modify: `apps/dashboard/src/app/dashboard/questions/[id]/edit/page.tsx`
- Modify: `apps/dashboard/src/app/dashboard/exams/page.tsx`

- [ ] **Step 1: Add `uploadAudio` method in `api-service.ts`**
- [ ] **Step 2: Build `AudioStimulusField` component with audio file uploader, preview player, and "Maksimal Pemutaran" dropdown (1x, 2x, 3x, Tanpa Batas)**
- [ ] **Step 3: Integrate `AudioStimulusField` into question creator and editor pages**
- [ ] **Step 4: Add "Pengaturan Alarm & Getar Pelanggaran" in Exam modal (Vibration toggle, Alarm toggle, 3s/5s duration, and sound tone selector)**
- [ ] **Step 5: Run dashboard typecheck: `pnpm --filter @secure-cbt/dashboard typecheck`**
- [ ] **Step 6: Commit changes**

---

### Task 4: Mobile Audio Pre-cacher & Drift Play Counter Persistence

**Files:**
- Modify: `apps/mobile/lib/core/database/app_database.dart`
- Create: `apps/mobile/lib/core/services/audio_cache_service.dart`
- Test: `apps/mobile/test/core/services/audio_cache_service_test.dart`

- [ ] **Step 1: Add `QuestionAudioPlays` Drift table (`sessionId`, `questionId`, `playsUsed`) in `app_database.dart`**
- [ ] **Step 2: Create `AudioCacheService` that downloads and caches exam audio files locally before question screen opens**
- [ ] **Step 3: Add unit tests verifying pre-caching and database play count persistence**
- [ ] **Step 4: Run Flutter tests: `flutter test test/core/services/audio_cache_service_test.dart`**
- [ ] **Step 5: Commit changes**

---

### Task 5: Mobile In-Exam Listening Audio Player Widget

**Files:**
- Create: `apps/mobile/lib/features/exam/presentation/widgets/listening_audio_player.dart`
- Modify: `apps/mobile/lib/features/exam/presentation/widgets/exam_question_card.dart`
- Test: `apps/mobile/test/features/exam/listening_audio_player_test.dart`

- [ ] **Step 1: Create `ListeningAudioPlayer` widget with waveform progress, play/pause button, elapsed/total time, and "Sisa Pemutaran: {remaining}" badge**
- [ ] **Step 2: Implement strict play limit tracking: increment plays in Drift upon audio completion; disable button when limit is reached**
- [ ] **Step 3: Embed `ListeningAudioPlayer` in `ExamQuestionCard` when `audio_url` is present**
- [ ] **Step 4: Write widget tests for play limit exhaustion and state persistence**
- [ ] **Step 5: Run Flutter tests: `flutter test test/features/exam/listening_audio_player_test.dart`**
- [ ] **Step 6: Commit changes**

---

### Task 6: Mobile Punitive Violation Deterrence (Native Vibration Burst & Sound Alarm)

**Files:**
- Create: `apps/mobile/assets/sounds/` (Add `sharp_beep.mp3`, `siren.mp3`, `digital_pulse.mp3`, `warning_radar.mp3`)
- Modify: `apps/mobile/pubspec.yaml` (Register sound assets & `audioplayers` dependency)
- Modify: `apps/mobile/android/app/src/main/kotlin/com/securecbt/secure_cbt_mobile/MainActivity.kt` (Add native vibration burst pattern)
- Create: `apps/mobile/lib/core/security/violation_alarm_service.dart`
- Modify: `apps/mobile/lib/features/exam/presentation/screens/exam_screen.dart`

- [ ] **Step 1: Add sound assets to `apps/mobile/assets/sounds/` and register in `pubspec.yaml`**
- [ ] **Step 2: Implement native violent vibration pattern in `MainActivity.kt` (`vibrateViolation` method channel)**
- [ ] **Step 3: Create `ViolationAlarmService` that coordinates 3s / 5s burst vibration and offline sound playback**
- [ ] **Step 4: Wire `ViolationAlarmService` into `_violationHandler` in `exam_screen.dart`**
- [ ] **Step 5: Run mobile unit tests and `dart analyze`**
- [ ] **Step 6: Commit changes**

---

### Task 7: Full Monorepo End-to-End Verification

- [ ] **Step 1: Run all backend tests: `pnpm --filter @secure-cbt/backend test`**
- [ ] **Step 2: Run all dashboard tests: `pnpm --filter @secure-cbt/dashboard test`**
- [ ] **Step 3: Run all mobile tests: `cd apps/mobile && flutter test`**
- [ ] **Step 4: Run monorepo production build: `pnpm -r build`**
- [ ] **Step 5: Commit and merge to `master`**
