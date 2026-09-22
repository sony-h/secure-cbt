# Mobile UI/UX Revamp Specification — Modern Minimalist Academic (Light Mode Only)

**Date:** 2026-09-22  
**Platform:** Flutter Mobile (Android/iOS)  
**Target Audience:** Indonesian High School Students (SMA/SMK)  
**Status:** Approved for Implementation

---

## 1. Overview & Vision
This specification outlines the comprehensive overhaul of the Secure CBT mobile application. The target is a **Modern Minimalist Academic** aesthetic: serene porcelain backgrounds, deep electric indigo accents, clean typography with tabular numbers, and tactile micro-interactions (bouncing scale-on-press `0.96`, spring transitions, animated progress indicators).

The app is **strictly Light Mode only** to eliminate visual clutter, improve readability of complex exam question texts, and guarantee consistent rendering across diverse student device displays.

---

## 2. Design System & Tokens

### 2.1 Color Palette (`AppColors`)
* **Canvas / Scaffolding**: `Color(0xFFF8FAFC)` (Slate 50)
* **Surfaces & Cards**: `Color(0xFFFFFFFF)` (Pure White) with layered ambient shadows `rgba(15, 23, 42, 0.04)` to `rgba(15, 23, 42, 0.08)` and `1px` subtle border `Color(0xFFE2E8F0)`
* **Surface Subtle**: `Color(0xFFF1F5F9)` (Slate 100)
* **Primary Accent**: `Color(0xFF4F46E5)` (Electric Indigo)
* **Primary Dark**: `Color(0xFF4338CA)` (Deep Indigo)
* **Primary Container / Tint**: `Color(0xFFEEF2FF)` (Soft Indigo wash for selected options)
* **On-Primary Container**: `Color(0xFF3730A3)`
* **Status Colors**:
  * **Success**: `Color(0xFF10B981)` (Emerald), Container: `Color(0xFFECFDF5)`
  * **Warning / Flagged**: `Color(0xFFF59E0B)` (Amber), Container: `Color(0xFFFFFBEB)`
  * **Danger / Error**: `Color(0xFFEF4444)` (Coral Red), Container: `Color(0xFFFEF2F2)`
* **Text Hierarchy**:
  * **Primary**: `Color(0xFF0F172A)` (Slate 900)
  * **Secondary**: `Color(0xFF475569)` (Slate 600)
  * **Muted**: `Color(0xFF94A3B8)` (Slate 400)
  * **Border**: `Color(0xFFE2E8F0)` (Slate 200)
  * **Border Focused**: `Color(0xFF818CF8)` (Indigo 400)

### 2.2 Typography
* Font family: **Google Fonts Inter**
* Line-height on exam question bodies: `1.65` for comfortable reading of long-form questions.
* **Tabular numbers** (`FontFeature.tabularFigures()`) enabled on:
  * Exam countdown timer (`MM:SS`)
  * Score percentage and score dials
  * Question index markers and NIS
  * Student stat counters

### 2.3 Tactile Micro-Interactions (Design Engineering)
* **Bouncing Scale on Press (`0.96`)**: Buttons, cards, and option choices scale down to `0.96` on touch with `Curves.easeOutBack` and bounce back up.
* **Concentric Border Radius**: `outerRadius = innerRadius + padding` applied to all cards and child pills.
* **Layered Shadows Over Solid Borders**: Soft dual-layer box shadows for natural depth.

---

## 3. Component Architecture & Screen Breakdown

### 3.1 Global Navigation (`ScaffoldWithNavBar`)
* Floating island pill navigation bar positioned `16px` above screen bottom.
* Pure white surface with dual-layer soft elevation.
* Sliding active pill indicator behind selected tab with scale-up micro-animation (`1.12`).

### 3.2 Authentication & Onboarding
* **`LoginScreen`**: Porcelain background with subtle geometric radial accent, staggered form entrance, focused border glow, and morphing submit button.
* **`TokenScreen`**: Large monospaced segmented 8-character token entry, pulsing active border, horizontal shake on error, and clean exam rules checklist.

### 3.3 Student Dashboard & Exams
* **`HomeScreen`**: Radiant student identity banner with avatar outline, 3 readiness stat cards with tabular numerals, and upcoming exam cards with tactile hover.
* **`ExamsScreen`**: Horizontal sliding subject filter pill carousel, card status badges (Ongoing, Upcoming, Finished).
* **`ExamDetailScreen`**: Hero card with duration, question count pills, schedule, and primary action button.

### 3.4 In-Exam Experience (Core Test Taking)
* **`ExamAppBar`**:
  * Thin `3px` gradient progress indicator (Indigo to Teal).
  * Tabular countdown timer in rounded pill with pulsing amber/red alert under 5 minutes.
  * Shield badge warning counter (`0/3`).
* **`ExamQuestionCard`**:
  * Spacious typography with `1.65` line height.
  * Interactive option tiles (`A`, `B`, `C`, `D`) with animated scale `1.02`, indigo tint wash, and checkmark on selection.
  * Smooth essay input with auto-save indicator.
* **`QuestionPalette` (Bottom Sheet)**:
  * Staggered scale-in grid of numbered buttons.
  * Visual status: Answered (Indigo solid), Flagged (Amber with flag), Active (Outlined glow), Unanswered (Soft neutral).
* **`ExamBottomBar`**:
  * Previous / Next buttons with tactile press.
  * Prominent Submit button with refined confirmation dialog.

### 3.5 Results & Post-Exam
* **`ResultScreen`**:
  * Radial circular score progress gauge with animated count-up text (`0` → final score).
  * Celebratory status pill (Pass / Remedial).
  * Metric cards for Correct, Incorrect, and Total Questions.
* **`HistoryScreen`**:
  * Clean timeline list cards with score pills and WIB timestamps.
* **`ProfileScreen`**:
  * Deduplicated `AppCard` component usage, clean account and device info cards, and logout confirmation dialog.

---

## 4. Implementation Steps
1. Refactor `AppColors` and lock `ThemeMode.light` in `theme.dart` and `app.dart`.
2. Build `BouncingButton`, `CountUpText`, `StatusPill`, and unify `AppCard`.
3. Overhaul `ScaffoldWithNavBar` to floating island bar.
4. Revamp `LoginScreen` and `TokenScreen`.
5. Redesign `HomeScreen`, `ExamsScreen`, and `ExamDetailScreen`.
6. Refine In-Exam screens and widgets.
7. Overhaul `ResultScreen`, `HistoryScreen`, and `ProfileScreen`.
8. Validate via `flutter analyze`.
