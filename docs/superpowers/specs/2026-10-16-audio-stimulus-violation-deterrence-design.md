# Audio Stimulus & Violation Deterrence Technical Design

**Date:** 2026-10-16  
**Status:** Approved  
**Author:** AI Agent & Sony Hartono  
**Target:** Full-Stack (Database, NestJS Backend, Next.js Dashboard, Flutter Mobile App)

---

## 1. Intent & Context
Modern Indonesian high school examinations (SMA/SMK) frequently require audio capabilities for:
1. **Language & Religious Assessments:** English listening comprehension sections (*Listening Section*), Arabic listening, regional language assessments, and Islamic Education (PAI) reciting hadith or Quranic verses (*murottal*).
2. **Cheating Deterrence & Room Integrity:** Physical deterrence during cheating attempts (minimizing the app, pulling down notifications, or opening split screens) through intense vibration and a calibrated alarm burst that startles the offender without causing perpetual disruption in the classroom.

---

## 2. Goals, Non-Goals, and Anti-Goals

### Goals:
- **Audio Stimulus for Questions:**
  - Allow teachers to upload audio files (`.mp3`, `.m4a`, `.wav`) and configure an optional **Play Limit (Maksimal Pemutaran)** per question (e.g., `1x`, `2x`, `3x`, or `unlimited`, defaulting to `2x` matching ANBK/TOEFL standards).
  - Pre-cache all exam audio files on the student's mobile device during token verification to guarantee zero buffering during the exam.
  - Provide an intuitive question audio player widget with progress scrubbing, play/pause controls, and a persistent remaining play counter that survives app restarts.
- **Punitive Violation Deterrence:**
  - Trigger intense haptic vibration and an alarm sound on the student's phone the moment a security violation occurs (`APP_MINIMIZED`, `STATUS_BAR_EXPANDED`, `SPLIT_SCREEN`).
  - Play a fixed-duration burst (e.g., 3 to 5 seconds) so the student feels immediate consequence and psychological deterrence before the sound ceases.
  - Allow teachers to toggle vibration, toggle alarm, select duration (3s / 5s), and choose the alarm tone (`sharp_beep`, `siren`, `digital_pulse`, `warning_radar`) in Exam Settings.

### Non-Goals:
- Live streaming of student microphone audio (this is an offline-first CBT client, not an online proctor surveillance stream).
- Background ambient music playback during normal exam progression.

### Anti-Goals:
- Never allow an alarm to ring indefinitely in an unmonitored room if a student locks their device and leaves (must obey the 3–5 second burst cutoff).
- Never stream audio on-the-fly during the exam if the network connection drops (all media must be pre-cached prior to starting questions).

---

## 3. Architecture & Data Model

### A. Database Changes (`schema.prisma`)
1. **`model Question`:**
   - `audio_url`: `String? @db.Text` (URL to uploaded audio file)
   - `audio_play_limit`: `Int? @default(2)` (Maximum number of plays allowed; `null` = unlimited)
2. **`model Exam`:**
   - `violation_vibration_enabled`: `Boolean @default(true)`
   - `violation_alarm_enabled`: `Boolean @default(true)`
   - `violation_alarm_duration_seconds`: `Int @default(3)` (3 or 5 seconds)
   - `violation_alarm_sound`: `String @default("sharp_beep")` (`sharp_beep`, `siren`, `digital_pulse`, `warning_radar`)

### B. Shared Contracts (`@secure-cbt/shared`)
- Add audio metadata to `QuestionDto` and validation to `createQuestionSchema` / `updateQuestionSchema`:
  - `audio_url: z.string().url().optional().nullable()`
  - `audio_play_limit: z.number().int().min(1).max(10).optional().nullable()`
- Add alarm settings to `createExamSchema` / `updateExamSchema`:
  - `violation_vibration_enabled: z.boolean().default(true)`
  - `violation_alarm_enabled: z.boolean().default(true)`
  - `violation_alarm_duration_seconds: z.union([z.literal(3), z.literal(5)]).default(3)`
  - `violation_alarm_sound: z.enum(['sharp_beep', 'siren', 'digital_pulse', 'warning_radar']).default('sharp_beep')`

### C. Backend API (`apps/backend`)
- **Uploads Module (`uploads.controller.ts`):**
  - Add `POST /uploads/audio` endpoint supporting `audio/mpeg`, `audio/mp3`, `audio/wav`, `audio/x-m4a`, `audio/aac`, `audio/ogg` (max 25MB).
  - Stores via `IStorageService` and returns public URL.
- **Session Module (`session.service.ts`):**
  - Include `audio_url` and `audio_play_limit` when assembling questions for exam session payload.
  - Include exam violation sound & vibration settings in exam session metadata.

### D. Web Dashboard (`apps/dashboard`)
1. **Question Editor (`/dashboard/questions/new` & `[id]/edit`):**
   - Media upload panel supporting both Image and Audio.
   - For audio: file uploader with audio preview player and "Maksimal Pemutaran" dropdown (`1x`, `2x`, `3x`, `Tanpa Batas`).
2. **Exam Settings (`/dashboard/exams`):**
   - Security panel controls:
     - Toggle: *Getar Saat Pelanggaran (Haptic Feedback)*
     - Toggle: *Alarm Suara Pelanggaran*
     - Selector: *Durasi Alarm (3 Detik / 5 Detik)*
     - Dropdown: *Pilihan Suara Alarm (Bip Keras, Sirine Polisi, Alarm Digital, Denyut Radar)*

### E. Student Mobile App (`apps/mobile`)
1. **Audio Pre-caching Service:**
   - When launching an exam after token validation, download all `audio_url` files to local device cache directory (`getTemporaryDirectory()` or `getApplicationDocumentsDirectory()`).
   - Store local cached paths so the exam screen loads files directly from local storage.
2. **Listening Question Player Widget (`ListeningAudioPlayer`):**
   - Displayed directly inside the question card above the prompt.
   - Shows:
     - Badge: *"Sisa Pemutaran: {remaining} / {limit}"*
     - Waveform / slider progress bar with elapsed and total duration.
     - Play / Pause button.
   - When playback finishes, decrement the remaining play count.
   - Persist played counts in local Drift SQLite (`question_audio_plays` table: `sessionId`, `questionId`, `playsUsed`) so app restarts or orientation changes do not reset counter.
   - Disables play button when remaining plays reach 0.
3. **Punitive Violation Deterrence Engine:**
   - Integrated into `ScreenSecurity` and `ViolationHandler`.
   - On violation:
     - If `violation_vibration_enabled`: Trigger native Android vibration burst (custom vibration pattern, e.g. 500ms on, 200ms off for duration).
     - If `violation_alarm_enabled`: Play selected offline sound asset (`assets/sounds/{sound}.mp3`) using `audioplayers` or native Android soundpool.
     - Automatically stops after 3s / 5s via a `Timer`.

---

## 4. Constraints & Offline Guarantees
- No streaming audio during exams: an offline cache failure gracefully informs the student before the timer starts.
- Audio playback must never prevent question submission or timer countdown.
- Bundled violation sound assets must be lightweight (<50KB each) and packaged directly in the Flutter APK.
