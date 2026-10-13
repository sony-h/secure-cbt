# Human-Friendly Question Importer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign Word and Excel question import templates and modernize backend parsers to support human-readable natural exam paper formatting in Word and interactive 3-sheet Excel workbooks with dropdown data validation.

**Architecture:** Add `exceljs` and `docx` to programmatically generate professional, accessible default master templates. Upgrade `WordParserService` with an HTML DOM state machine that preserves inline images in natural paragraph mode while preserving table-mode compatibility. Upgrade `ExcelParserService` to intelligently locate the question worksheet in multi-sheet workbooks and sanitize validated dropdown values.

**Tech Stack:** NestJS, TypeScript, `docx` (^9.0.0), `exceljs` (^4.4.0), `mammoth`, `cheerio`, `xlsx`, Vitest.

**Spec:** `docs/superpowers/specs/2026-10-13-human-friendly-question-importer.md`

## Global Constraints

- Preserve complete backward compatibility for existing 2-column Word table templates.
- Embedded question images in Word must be uploaded via `IStorageService` or fallback to data URL.
- Excel parser must gracefully handle single-sheet legacy files as well as 3-sheet workbooks.
- Default question difficulty must be `SEDANG` (`MEDIUM`) if unspecified.
- All backend unit tests (`pnpm --filter backend test`) and E2E tests (`pnpm --filter backend test:e2e`) must pass with zero errors.

## Review Focus

1. Word documents with multiple paragraphs per question stimulus: ensure extra stimulus paragraphs before option 'A.' are appended to question content rather than dropped.
2. Word natural questions containing embedded diagrams: verify image tag inside question node is captured in `image_url`.
3. Excel workbook where user left empty rows between questions: verify parser skips empty rows cleanly without failing or producing blank question items.
4. Excel sheet selection when sheet name is custom: ensure header keyword matching scans alternative sheets if sheet name is neither 'Input Soal' nor 'Soal'.
5. Question option letters with varying punctuation: support `A.`, `A)`, `A :`, `a.`, and ensure correct key matches letter regardless of lowercase or extra spaces.

---

### Task 1: Add Template Generation Libraries and Build Generator Utility

**Files:**
- Modify: `apps/backend/package.json`
- Create: `apps/backend/src/modules/question-bank/templates/template-generator.ts`
- Test: `apps/backend/src/modules/question-bank/__tests__/template-generator.spec.ts`

**Interfaces:**
- Produces: `generateWordTemplate(): Promise<Buffer>`, `generateExcelTemplate(): Promise<Buffer>`

- [ ] **Step 1: Write failing test for template generation**

```typescript
// apps/backend/src/modules/question-bank/__tests__/template-generator.spec.ts
import { describe, it, expect } from 'vitest';
import { generateWordTemplate, generateExcelTemplate } from '../templates/template-generator';

describe('TemplateGenerator', () => {
  it('should generate a valid Word .docx buffer', async () => {
    const buffer = await generateWordTemplate();
    expect(buffer).toBeInstanceOf(Buffer);
    expect(buffer.length).toBeGreaterThan(1000);
  });

  it('should generate a valid Excel .xlsx buffer with 3 sheets', async () => {
    const buffer = await generateExcelTemplate();
    expect(buffer).toBeInstanceOf(Buffer);
    expect(buffer.length).toBeGreaterThan(1000);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter backend test template-generator.spec.ts`
Expected: FAIL (modules or functions not found)

- [ ] **Step 3: Install `docx` and `exceljs` in backend**

Run: `pnpm --filter backend add docx exceljs`

- [ ] **Step 4: Implement `template-generator.ts`**

Implement `generateWordTemplate()` using `docx`:
- Header banner for Assessia by Orivastra.
- Petunjuk format natural: `[SOAL 1]`, Opsi `A.` - `E.`, `KUNCI:`, `PEMBAHASAN:`, `KESULITAN:`.
- 3 sample questions (Pilihan Ganda Umum, Matematika, dan Biologi).

Implement `generateExcelTemplate()` using `exceljs`:
- Sheet 1: `Panduan` with formatted guidance cards and styling.
- Sheet 2: `Input Soal` with headers: `No`, `Soal`, `Opsi A`, `Opsi B`, `Opsi C`, `Opsi D`, `Opsi E`, `Kunci Jawaban`, `Pembahasan (Opsional)`, `Tingkat Kesulitan`.
  - Add Data Validation for column H: list `A, B, C, D, E`.
  - Add Data Validation for column J: list `MUDAH, SEDANG, SULIT`.
  - Freeze row 1 (`views: [{ state: 'frozen', ySplit: 1 }]`).
  - Set column widths and enable text wrap.
- Sheet 3: `Contoh Soal` with 3 complete sample questions.

- [ ] **Step 5: Run test to verify it passes**

Run: `pnpm --filter backend test template-generator.spec.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add apps/backend/package.json pnpm-lock.yaml apps/backend/src/modules/question-bank/templates/template-generator.ts apps/backend/src/modules/question-bank/__tests__/template-generator.spec.ts
git commit -m "feat(question-bank): add modern docx and excel template generators"
```

---

### Task 2: Enhance WordParserService for Natural Exam Paper Format with Image Retention

**Files:**
- Modify: `apps/backend/src/modules/question-bank/parsers/word-parser.service.ts`
- Test: `apps/backend/src/modules/question-bank/__tests__/word-parser.service.spec.ts`

**Interfaces:**
- Consumes: Mammoth HTML with image handlers and Cheerio DOM.
- Produces: `WordParserService.parse(buffer: Buffer): Promise<ImportQuestionItemInput[]>`

- [ ] **Step 1: Write failing tests for natural format and DOM parsing**

Add unit tests in `apps/backend/src/modules/question-bank/__tests__/word-parser.service.spec.ts`:
- Parsing natural paragraph questions formatted with `[SOAL 1]`, options `A.` through `E.`, and `KUNCI: B`.
- Parsing natural questions with multi-paragraph stimulus.
- Capturing image URLs from inline `<img>` tags inside questions.
- Preserving existing table-based parsing without regression.

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter backend test word-parser.service.spec.ts`
Expected: FAIL on natural format assertions.

- [ ] **Step 3: Update `WordParserService` in `word-parser.service.ts`**

- Improve table vs paragraph selector: check if `table` elements actually contain option cells (`A`, `B`, `KUNCI`). If not (or if no tables exist), use natural DOM parser.
- In `parseFromParagraphs($: cheerio.CheerioAPI)`:
  - Traverse all top-level blocks (`p`, `div`, `h1`-`h4`, `li`).
  - Detect question boundary using regex:
    `/^(?:\[(?:SOAL|NOMOR|NO)\s*(\d+)\]|(?:SOAL|NOMOR|NO)\.?\s*(\d+)|(\d+)[\.\)])\s*(.*)/i`.
  - Check for embedded `<img>` tags inside the block: retain `img.attr('src')` as `imageUrl`.
  - Detect option lines: `/^([A-E])[\.\)\:\s]\s*(.*)/i`.
  - Detect metadata lines:
    - `/^(?:KUNCI|JAWABAN|KEY|ANSWER)[\s\:\=]+([A-E])/i`.
    - `/^(?:PEMBAHASAN|EXPLANATION)[\s\:\=]+(.*)/i`.
    - `/^(?:KESULITAN|TINGKAT|DIFFICULTY)[\s\:\=]+(.*)/i`.
  - If a block is encountered between question header and options that doesn't match an option, append it to question content (supports multi-line stimulus and paragraphs).

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm --filter backend test word-parser.service.spec.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/backend/src/modules/question-bank/parsers/word-parser.service.ts apps/backend/src/modules/question-bank/__tests__/word-parser.service.spec.ts
git commit -m "feat(question-bank): enhance word parser with natural exam format and image retention"
```

---

### Task 3: Enhance ExcelParserService for Multi-Sheet Workbooks and Data Validation

**Files:**
- Modify: `apps/backend/src/modules/question-bank/parsers/excel-parser.service.ts`
- Test: `apps/backend/src/modules/question-bank/__tests__/excel-parser.service.spec.ts`

**Interfaces:**
- Produces: `ExcelParserService.parse(buffer: Buffer): ImportQuestionItemInput[]`

- [ ] **Step 1: Write failing tests for multi-sheet workbook and sanitized dropdown values**

Add tests in `apps/backend/src/modules/question-bank/__tests__/excel-parser.service.spec.ts`:
- Workbook with Sheet 1 (`Panduan`) and Sheet 2 (`Input Soal`), verifying parser correctly selects `Input Soal`.
- Dropdown keys with whitespace (e.g. `' A '` or `'b'`) correctly trimmed and matched.
- Handling empty rows interspersed between questions.

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter backend test excel-parser.service.spec.ts`
Expected: FAIL on multi-sheet workbook selection.

- [ ] **Step 3: Update `ExcelParserService` in `excel-parser.service.ts`**

- Search workbook sheets for target:
  1. Sheet matching `/^(?:input|soal|lembar|pertanyaan|questions)/i`.
  2. If none found by name, inspect each sheet's first 5 rows for header containing `soal` or `pertanyaan`.
  3. Fallback to `workbook.SheetNames[0]`.
- Sanitize cell values: trim whitespace, normalize uppercase for key and difficulty.
- Skip completely empty rows.

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm --filter backend test excel-parser.service.spec.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/backend/src/modules/question-bank/parsers/excel-parser.service.ts apps/backend/src/modules/question-bank/__tests__/excel-parser.service.spec.ts
git commit -m "feat(question-bank): add multi-sheet intelligent worksheet detection to excel parser"
```

---

### Task 4: Regenerate Default Master Templates and Verify Real-File Integration

**Files:**
- Overwrite: `apps/backend/src/modules/question-bank/templates/default-template-soal.docx`
- Overwrite: `apps/backend/src/modules/question-bank/templates/default-template-soal.xlsx`
- Modify: `apps/backend/src/modules/question-bank/__tests__/word-parser-real.spec.ts`
- Modify: `apps/backend/src/modules/question-bank/__tests__/excel-parser.service.spec.ts`

**Interfaces:**
- Consumes: `template-generator.ts`
- Produces: Physical `.docx` and `.xlsx` files packaged in `apps/backend/src/modules/question-bank/templates/`.

- [ ] **Step 1: Run generator to overwrite default template files**

Write a small script or execution step that invokes `generateWordTemplate()` and `generateExcelTemplate()` and saves the buffers to `apps/backend/src/modules/question-bank/templates/default-template-soal.docx` and `default-template-soal.xlsx`.

- [ ] **Step 2: Update real file test assertions**

In `word-parser-real.spec.ts` and `excel-parser.service.spec.ts`, verify that:
- `default-template-soal.docx` parses at least 3 questions in natural format, all valid with no errors.
- `default-template-soal.xlsx` parses the `Input Soal` / `Contoh Soal` sheets accurately.

- [ ] **Step 3: Run all backend tests and E2E tests**

Run: `pnpm --filter backend test`
Expected: All 46+ tests PASS.

Run: `pnpm --filter backend test:e2e`
Expected: All 4 E2E tests PASS.

- [ ] **Step 4: Run monorepo typecheck and build**

Run: `pnpm typecheck`
Run: `pnpm --filter dashboard build`
Expected: 0 errors.

- [ ] **Step 5: Commit**

```bash
git add apps/backend/src/modules/question-bank/templates/ apps/backend/src/modules/question-bank/__tests__/
git commit -m "chore(question-bank): bundle regenerated human-friendly word and excel templates"
```
