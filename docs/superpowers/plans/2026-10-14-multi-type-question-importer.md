# Implementation Plan: Multi-Type Question Importer & Master Templates

**Feature:** Multi-Type Question Importer & Master Templates (Word .docx & Excel .xlsx)  
**Spec Document:** `docs/superpowers/specs/2026-10-14-multi-type-question-importer-design.md`  
**Target:** `@secure-cbt/shared`, `backend`, `dashboard`  
**Status:** In Progress  

---

## Proposed Plan Structure

- **Task 1:** Dynamic Schema & Validation in `@secure-cbt/shared` (Support 0–5 options depending on `QuestionType`)
- **Task 2:** Multi-Type Parsing & Auto-Detection in `WordParserService` (`.docx`)
- **Task 3:** Multi-Type Parsing & `Tipe Soal` Column Support in `ExcelParserService` (`.xlsx`)
- **Task 4:** Master Template Generator (`template-generator.ts`) & Asset Re-generation
- **Task 5:** Dashboard Preview Screen Polish for All 6 Question Formats (`import-questions-modal.tsx`)
- **Task 6:** Monorepo Integration Testing & Verification

---

### Task 1: Dynamic Validation Schema in `@secure-cbt/shared`

**Goal:** Allow questions of type `ESSAY` (0 options), `SHORT_ANSWER` (>= 1 option), and `MULTIPLE_CHOICE`, `MULTI_SELECT`, `TRUE_FALSE`, `MATCHING` (>= 2 options) to pass schema validation in both preview and confirm DTOs.

**Files:**
- Modify: `packages/shared/src/schemas/question-import.schema.ts`
- Create: `packages/shared/src/schemas/__tests__/question-import.schema.spec.ts`

**Step 1: Write Unit Test First (TDD)**
Create `packages/shared/src/schemas/__tests__/question-import.schema.spec.ts` covering:
- Valid `MULTIPLE_CHOICE` with 4 options and 1 correct option.
- Valid `MULTI_SELECT` with 4 options and multiple correct options.
- Valid `TRUE_FALSE` with 2 options (Benar / Salah) and 1 correct.
- Valid `SHORT_ANSWER` with 1 accepted answer option (`is_correct: true`).
- Valid `ESSAY` with 0 options.
- Valid `MATCHING` with >= 2 options having `{"left":"...","right":"..."}` content.
- Invalid cases: `MULTIPLE_CHOICE` with < 2 options; `MULTIPLE_CHOICE` with 0 correct; `SHORT_ANSWER` with 0 options.

**Step 2: Update Schema Implementation**
In `packages/shared/src/schemas/question-import.schema.ts`:
- Change `importQuestionItemSchema` to use `.superRefine((data, ctx) => { ... })`:
  ```ts
  if (data.type === QuestionType.ESSAY) {
    // 0 options allowed
  } else if (data.type === QuestionType.SHORT_ANSWER) {
    if (!data.options || data.options.length < 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Soal isian singkat memerlukan minimal 1 kunci jawaban valid',
        path: ['options'],
      });
    }
  } else {
    // MULTIPLE_CHOICE, MULTI_SELECT, TRUE_FALSE, MATCHING
    if (!data.options || data.options.length < 2) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Minimal 2 opsi pilihan jawaban',
        path: ['options'],
      });
    }
  }
  ```
- Similarly adjust `confirmImportQuestionsSchema` options array validation using identical per-type requirements.

**Verification Command:**
```bash
cmd.exe /c pnpm --filter shared test
```

**Git Commit:**
```bash
git add packages/shared/
git commit -m "feat(shared): support dynamic option counts per question type in import schemas"
```

---

### Task 2: Multi-Type Parsing & Auto-Detection in `WordParserService`

**Goal:** Enable `WordParserService` to extract question types via `TIPE:` tags and intelligent fallback, generate proper options for `TRUE_FALSE`, `MATCHING`, `MULTI_SELECT`, `SHORT_ANSWER`, and `ESSAY`, and support multi-type questions in both paragraph and table formats.

**Files:**
- Modify: `apps/backend/src/modules/question-bank/parsers/word-parser.service.ts`
- Modify: `apps/backend/src/modules/question-bank/__tests__/word-parser.service.spec.ts`

**Step 1: Write Unit Tests First (TDD)**
Add test cases in `apps/backend/src/modules/question-bank/__tests__/word-parser.service.spec.ts`:
- Parsing `MULTI_SELECT` with tag `TIPE: PG_KOMPLEKS` and comma-separated `KUNCI: A, B, D`.
- Parsing `TRUE_FALSE` with tag `TIPE: BENAR_SALAH` and `KUNCI: BENAR` (auto-generating 2 options `Benar` and `Salah`).
- Parsing `SHORT_ANSWER` with tag `TIPE: ISIAN_SINGKAT` and text `KUNCI: Portugis`.
- Parsing `MATCHING` with tag `TIPE: MENJODOHKAN` and `A. Kartini -> Jepara` (storing JSON `{ left: 'Kartini', right: 'Jepara' }`).
- Parsing `ESSAY` with tag `TIPE: ESAI` and no options/key.
- Parsing legacy single-choice format without `TIPE:` tag for 100% backward compatibility.
- Auto-detecting `MULTI_SELECT` when key has multiple letters (`KUNCI: A, C`) without explicit `TIPE:`.
- Auto-detecting `TRUE_FALSE` when key is `BENAR` or `SALAH`.
- Auto-detecting `MATCHING` when options contain `->`.

**Step 2: Update `WordParserService` Implementation**
1. Add helper `detectQuestionType(typeTag?: string, keyText?: string, options?: Array<{ content: string }>): QuestionType`:
   - Map type string variants (`PILIHAN_GANDA`, `PG_KOMPLEKS`, `BENAR_SALAH`, `ISIAN_SINGKAT`, `MENJODOHKAN`, `ESAI`).
   - If tag is omitted, infer:
     - Check `options.some(o => o.content.includes('->') || o.content.includes('='))` $\rightarrow$ `MATCHING`
     - Check `keyText` matches `/^(?:BENAR|SALAH|TRUE|FALSE)$/i` $\rightarrow$ `TRUE_FALSE`
     - Check `keyText` has commas or multiple letters `/^[A-E](?:[\s,]+[A-E])+$/i` $\rightarrow$ `MULTI_SELECT`
     - Fallback: `MULTIPLE_CHOICE`.
2. Support `TIPE:` line matching in paragraphs:
   `/^(?:TIPE(?:\s*SOAL)?|TYPE)[\s\:\=\-]+(.*)/i`
3. In `buildQuestionFromBlock`:
   - For `TRUE_FALSE`: If no options provided, synthesize 2 options: `Benar` (`is_correct: keyIsBenar`) and `Salah` (`is_correct: keyIsSalah`).
   - For `MULTI_SELECT`: Split comma/space separated keys (e.g. `['A', 'B', 'D']`), set `is_correct: true` for any matching letter.
   - For `MATCHING`: Parse `left -> right` syntax into `JSON.stringify({ left, right })`. Set all pairs `is_correct: true`.
   - For `SHORT_ANSWER`: Convert comma-separated key answers into options with `is_correct: true`.
   - For `ESSAY`: Keep `options: []`, valid if `content` is not empty.
4. Support table-based parsing for multi-type questions as well (detect `TIPE` row).

**Verification Command:**
```bash
cmd.exe /c pnpm --filter backend test -- word-parser.service.spec.ts
```

**Git Commit:**
```bash
git add apps/backend/src/modules/question-bank/parsers/word-parser.service.ts apps/backend/src/modules/question-bank/__tests__/word-parser.service.spec.ts
git commit -m "feat(backend): support all 6 question types and auto-detection in word parser"
```

---

### Task 3: Multi-Type Parsing & `Tipe Soal` Support in `ExcelParserService`

**Goal:** Enable `ExcelParserService` to recognize the optional `Tipe Soal` column, parse all 6 question formats accurately, allow empty option columns for non-MCQ rows, and preserve legacy single-choice parsing.

**Files:**
- Modify: `apps/backend/src/modules/question-bank/parsers/excel-parser.service.ts`
- Modify: `apps/backend/src/modules/question-bank/__tests__/excel-parser.service.spec.ts`

**Step 1: Write Unit Tests First (TDD)**
Add test cases in `apps/backend/src/modules/question-bank/__tests__/excel-parser.service.spec.ts`:
- Parsing Excel sheet with `Tipe Soal` column containing:
  - Row 1: `PILIHAN GANDA`
  - Row 2: `PG KOMPLEKS` (keys `A, B, D`)
  - Row 3: `BENAR SALAH` (no option columns, key `BENAR`)
  - Row 4: `ISIAN SINGKAT` (no option columns, key `Portugis`)
  - Row 5: `MENJODOHKAN` (options A, B, C containing `Premis -> Target`)
  - Row 6: `ESAI` (no option columns, no key)
- Parsing Excel sheet without `Tipe Soal` column (legacy) with auto-detection of `MULTI_SELECT` and `TRUE_FALSE`.

**Step 2: Update `ExcelParserService` Implementation**
1. In `parseRows`: Scan headers for optional `Tipe Soal` / `Tipe` / `Type` column index (`colType`).
2. Adjust header detection: `colQuestion` is mandatory; `colA` and `colKey` are optional if `colType` exists (or required for legacy sheets).
3. In row iteration:
   - Read `rawType` from `colType`. If absent, auto-detect type based on `keyRaw` and option content.
   - For `TRUE_FALSE`: create `Benar` and `Salah` options based on `keyRaw`.
   - For `MULTI_SELECT`: parse multiple keys (`A, C`) and flag matching options `is_correct: true`.
   - For `MATCHING`: parse `left -> right` syntax into `JSON.stringify({ left, right })`.
   - For `SHORT_ANSWER`: parse key into accepted answer options.
   - For `ESSAY`: options array remains empty, valid if `questionContent` is not empty.
   - For `MULTIPLE_CHOICE`: validate single correct option as before.

**Verification Command:**
```bash
cmd.exe /c pnpm --filter backend test -- excel-parser.service.spec.ts
```

**Git Commit:**
```bash
git add apps/backend/src/modules/question-bank/parsers/excel-parser.service.ts apps/backend/src/modules/question-bank/__tests__/excel-parser.service.spec.ts
git commit -m "feat(backend): support multi-type questions and Tipe Soal column in excel parser"
```

---

### Task 4: Master Template Generator & Asset Re-generation

**Goal:** Update `template-generator.ts` to output instructions and realistic sample items for all 6 question formats in Word and Excel, and re-generate `default-template-soal.docx` and `default-template-soal.xlsx`.

**Files:**
- Modify: `apps/backend/src/modules/question-bank/templates/template-generator.ts`
- Modify: `apps/backend/src/modules/question-bank/__tests__/template-generator.spec.ts`
- Output: `apps/backend/src/modules/question-bank/templates/default-template-soal.docx`
- Output: `apps/backend/src/modules/question-bank/templates/default-template-soal.xlsx`

**Step 1: Update `generateWordTemplate()`**
- Add clear callout section detailing syntax for all 6 types:
  - `PILIHAN GANDA`
  - `PG_KOMPLEKS`
  - `BENAR_SALAH`
  - `ISIAN_SINGKAT`
  - `MENJODOHKAN`
  - `ESAI`
- Add concrete example questions for each of the 6 types.

**Step 2: Update `generateExcelTemplate()`**
- Update Guide sheet (`📋 Panduan`) to describe the `Tipe Soal` column and how to fill each type.
- Update `✍️ Input Soal` sheet:
  - Insert column `Tipe Soal` at Column B (between `No` and `Soal`).
  - Add data validation dropdown: `PILIHAN GANDA,PG KOMPLEKS,BENAR SALAH,ISIAN SINGKAT,MENJODOHKAN,ESAI`.
  - Populate rows with representative examples of all 6 question formats.

**Step 3: Run Generation Script & Verify Templates**
- Execute `cmd.exe /c pnpm --filter backend templates:generate`.
- Verify in `template-generator.spec.ts` that both generated templates can be parsed by `WordParserService` and `ExcelParserService` without errors, yielding questions with their respective types.

**Verification Command:**
```bash
cmd.exe /c pnpm --filter backend test -- template-generator.spec.ts
```

**Git Commit:**
```bash
git add apps/backend/src/modules/question-bank/templates/ apps/backend/src/modules/question-bank/__tests__/template-generator.spec.ts
git commit -m "feat(backend): update master word and excel templates with all 6 question types"
```

---

### Task 5: Dashboard Import Preview Screen Polish

**Goal:** Enhance the preview modal in the dashboard to clearly distinguish question types with color-coded badges, render matching pairs in dual-column format, show accepted answer keywords for short answers, and render essay indicators.

**Files:**
- Modify: `apps/dashboard/src/components/questions/import-questions-modal.tsx`
- Create/Modify: `apps/dashboard/src/components/questions/__tests__/import-questions-modal.spec.tsx`

**Step 1: Write/Update Component Tests**
- Verify type badges appear for `MULTIPLE_CHOICE`, `MULTI_SELECT`, `TRUE_FALSE`, `SHORT_ANSWER`, `MATCHING`, and `ESSAY`.
- Verify `MATCHING` items render pairs with arrow indicator (`⇄` or `->`).
- Verify `SHORT_ANSWER` renders accepted answer keywords.
- Verify `ESSAY` renders descriptive notice.
- Verify `confirmMutation` passes questions with valid types and options.

**Step 2: Update `import-questions-modal.tsx`**
1. Add Question Type Badge Helper:
   - `MULTIPLE_CHOICE`: Badge Blue ("Pilihan Ganda")
   - `MULTI_SELECT`: Badge Purple ("PG Kompleks")
   - `TRUE_FALSE`: Badge Amber ("Benar / Salah")
   - `SHORT_ANSWER`: Badge Cyan ("Isian Singkat")
   - `MATCHING`: Badge Indigo ("Menjodohkan")
   - `ESSAY`: Badge Rose ("Esai / Uraian")
2. Condition option rendering based on `q.type`:
   - `MATCHING`: Parse JSON `{ left, right }` (with fallback for unparsed text) and render paired pills with connection icon.
   - `SHORT_ANSWER`: Render pill badges showing accepted answers.
   - `ESSAY`: Render clean notice card indicating manual grading.
   - `MULTI_SELECT` & `MULTIPLE_CHOICE`: Render standard option buttons with highlight and `KUNCI` tag.

**Verification Command:**
```bash
cmd.exe /c pnpm --filter dashboard test
```

**Git Commit:**
```bash
git add apps/dashboard/src/components/questions/
git commit -m "feat(dashboard): polish import preview UI with badges and custom layouts for all 6 question types"
```

---

### Task 6: Monorepo Full Verification

**Goal:** Ensure all unit tests, typechecks, and cross-package references pass without errors.

**Commands:**
1. Backend unit tests:
   ```bash
   cmd.exe /c pnpm --filter backend test
   ```
2. Shared package tests/typecheck:
   ```bash
   cmd.exe /c pnpm --filter shared typecheck
   ```
3. Dashboard tests & typecheck:
   ```bash
   cmd.exe /c pnpm --filter dashboard test
   cmd.exe /c pnpm --filter dashboard typecheck
   ```
4. Full repo typecheck:
   ```bash
   cmd.exe /c pnpm -r run typecheck
   ```

**Git Commit:**
```bash
git add .
git commit -m "chore: complete verification for multi-type question importer across all packages"
```
