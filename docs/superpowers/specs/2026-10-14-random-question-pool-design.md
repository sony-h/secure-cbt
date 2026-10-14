# Design Document: Random Question Pool Sub-sampling & Point Weighting (Phase 27)

**Product:** Assessia by Orivastra  
**Date:** 2026-10-14  
**Author:** Assessia Core Engineering  
**Status:** Approved  

---

## 1. Intent & The Why

In typical high school CBT exam sessions, 30–40 students sit side-by-side in computer laboratories or classrooms. Even with question and answer option shuffling, students can often look at a neighbor's screen and spot identical question text or diagrams.

**Random Question Pool Sub-sampling** solves this by allowing teachers to build a question bank with a generous pool of questions (e.g., 60 questions) while configuring the exam to draw a randomized subset (e.g., 30 questions) per student session. 

Additionally, questions of varying difficulty often require different point valuations (e.g., Easy = 1 pt, Medium = 2 pt, Hard = 3 pt). To avoid the cognitive load of editing point weights question-by-question, Assessia provides **difficulty-level point weighting** combined with a **dual-score display** (normalized 0–100 scale for school gradebooks plus raw points earned).

---

## 2. Goals, Non-Goals, and Anti-Goals

### Goals
- Allow exams to draw a dynamic subset of questions ($N$ drawn out of $M$ total in the bank).
- Support two draw modes:
  - **`BALANCED` (Default):** Stratified sampling proportional to the bank's difficulty distribution (`EASY`, `MEDIUM`, `HARD`), guaranteeing that every student receives the exact same number of questions and maximum possible points per difficulty tier.
  - **`PURE_RANDOM`:** Uniform random draw of $N$ questions from the candidate pool.
- Support configurable point weights per difficulty tier (`points_easy`, `points_medium`, `points_hard`) with sensible defaults (`1`, `2`, `3`).
- Calculate a normalized final grade:
  $$\text{Nilai Akhir} = \left(\frac{\text{Skor Poin Mentah yang Diperoleh}}{\text{Total Poin Maksimal Paket}}\right) \times 100$$
- Persist `raw_points_earned` and `raw_points_possible` to the `Score` entity.
- Display both normalized score (0–100) and raw points in Dashboard and Mobile CBT apps.
- Guarantee 100% deterministic session locking via `ExamSession.question_order` so reloads and network drops never alter a student's assigned questions.
- Preserve 100% backward compatibility for existing fixed-question exams.

### Non-Goals
- Per-question manual point editing (deferred as too tedious for Indonesian teachers).
- Dynamic multi-stage computer adaptive testing (CAT/IRT).

### Anti-Goals
- Any scenario where two students in the same `BALANCED` exam receive different total possible points (which would violate grading fairness).
- Calculating scores strictly out of 100 if the point sum is arbitrary, causing scores to exceed 100 or fail to align with standard rapor scales.

---

## 3. Data Model & Schema Changes

### A. Prisma Schema (`apps/backend/prisma/schema.prisma`)

```prisma
enum PoolMode {
  BALANCED
  PURE_RANDOM
}

model Exam {
  // ... existing fields ...

  // Pool Configuration
  is_random_pool       Boolean    @default(false)
  pool_question_count  Int?
  pool_mode            PoolMode   @default(BALANCED)

  // Custom Points per Difficulty
  points_easy          Int        @default(1)
  points_medium        Int        @default(2)
  points_hard          Int        @default(3)

  // ... relations ...
}

model Score {
  // ... existing fields ...
  total_score            Float     @default(0) // Normalized 0-100 scale
  raw_points_earned      Float     @default(0) // Raw points achieved
  raw_points_possible    Float     @default(0) // Max possible points for the assigned subset
  // ...
}
```

### B. Shared Contracts (`packages/shared`)

Update `createExamSchema` and `updateExamSchema` in `exam.schema.ts`:
- `is_random_pool`: boolean (optional, default `false`)
- `pool_question_count`: integer $\ge 1$ (optional)
- `pool_mode`: `z.enum(['BALANCED', 'PURE_RANDOM'])` (optional, default `'BALANCED'`)
- `points_easy`: integer $\ge 1$ (optional, default `1`)
- `points_medium`: integer $\ge 1$ (optional, default `2`)
- `points_hard`: integer $\ge 1$ (optional, default `3`)

---

## 4. Stratified Sampling Algorithm (`SessionService`)

When a student starts a session (`startSession`) for an exam with `is_random_pool: true`:

1. Let candidate questions $Q = \text{session.exam.exam\_questions}$.
2. If `pool_mode === 'PURE_RANDOM'`:
   - Shuffle $Q$ using Fisher-Yates.
   - Selected subset $S = Q.\text{slice}(0, \text{pool\_question\_count})$.
3. If `pool_mode === 'BALANCED'`:
   - Partition $Q$ into buckets: $Q_{\text{easy}}$, $Q_{\text{medium}}$, $Q_{\text{hard}}$.
   - Let $N = \text{pool\_question\_count}$, and $T = |Q|$.
   - For each difficulty tier $d \in \{\text{easy}, \text{medium}, \text{hard}\}$:
     - Exact quota $q_d = \frac{|Q_d|}{T} \times N$.
     - Base quota $b_d = \lfloor q_d \rfloor$.
     - Remainder $r_d = q_d - b_d$.
   - Distribute leftover slots $L = N - \sum b_d$ to tiers with highest remainders $r_d$.
   - For each tier $d$, randomly select $b_d$ items from $Q_d$.
   - Combine selected items into $S$.
4. Assign $S$ to `ExamSession.question_order` as a JSON array of question IDs.

---

## 5. Grading Pipeline (`GradingService`)

For any exam (pooled or manual):
1. For each question $q$ in the session's question list:
   - Determine weight $W(q)$:
     - If $q.\text{difficulty} == \text{EASY} \implies \text{exam.points\_easy}$
     - If $q.\text{difficulty} == \text{MEDIUM} \implies \text{exam.points\_medium}$
     - If $q.\text{difficulty} == \text{HARD} \implies \text{exam.points\_hard}$
   - Add $W(q)$ to $\text{rawPointsPossible}$.
   - If student answer is correct (or essay graded $\ge 50$):
     - For objective questions: $\text{earned} = W(q) \times \frac{\text{answer.score}}{100}$.
     - Add $\text{earned}$ to $\text{rawPointsEarned}$.
2. Calculate normalized final score:
   $$\text{FinalScore} = \text{rawPointsPossible} > 0 ? \left(\frac{\text{rawPointsEarned}}{\text{rawPointsPossible}}\right) \times 100 : 0$$
3. Persist to `Score`:
   - `total_score = FinalScore`
   - `raw_points_earned = rawPointsEarned`
   - `raw_points_possible = rawPointsPossible`

---

## 6. UI & App Experiences

1. **Dashboard Exam Builder (`/dashboard/exams/create` and `[id]/edit`):**
   - Toggle switch: *"Tarik Sebagian Soal dari Bank (Sub-sampling Pool)"*.
   - Slider / input: *"Jumlah Soal per Siswa"*.
   - Mode segmented control: *"Seimbang (Proporsional)"* vs *"Acak Murni"*.
   - Difficulty weight cards: 3 input pills for Mudah, Sedang, Sukar.
2. **Mobile CBT (`ResultScreen` & `ExamReviewScreen`):**
   - Bento metric tile: *"Total Poin: 46 / 54 Poin"*.
   - Bento metric tile: *"Akurasi: 26 / 30 Soal Benar"*.
   - Hero radial score: `85.00` (*Lulus KKM*).
