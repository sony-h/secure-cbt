# Phase 28: Multi-Type Question Importer & Master Templates Design Spec

**Feature Name:** Multi-Type Question Importer & Master Templates (Word .docx & Excel .xlsx)  
**Target:** Full-Stack (`@secure-cbt/shared`, `backend`, `dashboard`)  
**Status:** Approved  
**Date:** 2026-10-14  

---

## 1. Executive Summary & Purpose

Teachers and academic staff require an effortless, natural way to draft exams containing all 6 supported question types in Microsoft Word (.docx) or Microsoft Excel (.xlsx), without needing technical JSON formatting or manual entry in web forms.

The system supports the following 6 core question types:
1. `MULTIPLE_CHOICE` (Pilihan Ganda Biasa)
2. `MULTI_SELECT` (Pilihan Ganda Kompleks)
3. `TRUE_FALSE` (Benar / Salah)
4. `SHORT_ANSWER` (Isian Singkat)
5. `MATCHING` (Menjodohkan / Pasangan Premis & Target)
6. `ESSAY` (Uraian / Esai)

Both the Word parser and Excel parser must support explicit type tags (e.g. `TIPE: PG_KOMPLEKS`) as well as intelligent structural auto-detection (e.g. detecting comma-separated keys as `MULTI_SELECT`, arrow pairs `->` as `MATCHING`, etc.), while maintaining 100% backward compatibility for legacy templates.

---

## 2. Specification by Question Type

### 2.1 Pilihan Ganda (`MULTIPLE_CHOICE`)
- **Word (.docx):**
  ```text
  [SOAL 1]
  Ibu kota negara Indonesia saat ini adalah...
  A. Jakarta
  B. Nusantara
  C. Surabaya
  D. Bandung
  KUNCI: B
  KESULITAN: MUDAH
  ```
- **Excel (.xlsx):**
  - `Tipe Soal`: `PILIHAN GANDA`
  - `Opsi A` s.d. `Opsi E`: Teks pilihan
  - `Kunci Jawaban`: `A`, `B`, `C`, `D`, atau `E`
- **Database Mapping:**
  - `Question.type`: `MULTIPLE_CHOICE`
  - `QuestionOption`: 2–5 pilihan, opsi dengan huruf kunci ditandai `is_correct: true`.

### 2.2 Pilihan Ganda Kompleks (`MULTI_SELECT`)
- **Word (.docx):**
  ```text
  [SOAL 2]
  TIPE: PG_KOMPLEKS
  Manakah bahasa pemrograman yang termasuk kategori interpreted?
  A. Python
  B. JavaScript
  C. C++
  D. Ruby
  KUNCI: A, B, D
  PEMBAHASAN: Python, JS, dan Ruby diinterpretasi saat runtime.
  KESULITAN: SEDANG
  ```
- **Excel (.xlsx):**
  - `Tipe Soal`: `PG KOMPLEKS`
  - `Opsi A` s.d. `Opsi E`: Teks pilihan
  - `Kunci Jawaban`: Huruf dipisahkan koma atau spasi (e.g., `A, B, D` atau `A,B,D`)
- **Database Mapping:**
  - `Question.type`: `MULTI_SELECT`
  - `QuestionOption`: Semua opsi yang tercantum dalam kunci ditandai `is_correct: true`.

### 2.3 Benar / Salah (`TRUE_FALSE`)
- **Word (.docx):**
  ```text
  [SOAL 3]
  TIPE: BENAR_SALAH
  Fotosintesis pada tumbuhan hijau menghasilkan oksigen dan glukosa.
  KUNCI: BENAR
  KESULITAN: MUDAH
  ```
- **Excel (.xlsx):**
  - `Tipe Soal`: `BENAR SALAH`
  - `Opsi A` s.d. `Opsi E`: Dikosongkan
  - `Kunci Jawaban`: `BENAR` atau `SALAH` (toleransi: `TRUE`, `FALSE`, `B`, `S`)
- **Database Mapping:**
  - `Question.type`: `TRUE_FALSE`
  - `QuestionOption`: Parser mengenerate 2 opsi otomatis:
    1. `order: 1`, `content: "Benar"`, `is_correct: kunci === BENAR`
    2. `order: 2`, `content: "Salah"`, `is_correct: kunci === SALAH`

### 2.4 Isian Singkat (`SHORT_ANSWER`)
- **Word (.docx):**
  ```text
  [SOAL 4]
  TIPE: ISIAN_SINGKAT
  Bahasa resmi yang digunakan di negara Brazil adalah...
  KUNCI: Portugis, portugis, Portuguese
  KESULITAN: SEDANG
  ```
- **Excel (.xlsx):**
  - `Tipe Soal`: `ISIAN SINGKAT`
  - `Opsi A` s.d. `Opsi E`: Dikosongkan
  - `Kunci Jawaban`: Kata kunci atau sinonim jawaban yang diterima (dipisahkan koma)
- **Database Mapping:**
  - `Question.type`: `SHORT_ANSWER`
  - `QuestionOption`: Tiap kata kunci yang valid disimpan sebagai opsi (`is_correct: true`) untuk dicocokkan saat ujian siswa.

### 2.5 Menjodohkan (`MATCHING`)
- **Word (.docx):**
  ```text
  [SOAL 5]
  TIPE: MENJODOHKAN
  Jodohkanlah nama pahlawan nasional dengan kota kelahirannya:
  A. R.A. Kartini -> Jepara
  B. Pangeran Diponegoro -> Yogyakarta
  C. Cut Nyak Dien -> Aceh
  KESULITAN: SULIT
  ```
  *(Juga mendukung tabel Word 2-kolom: kolom 1 = premis, kolom 2 = target).*
- **Excel (.xlsx):**
  - `Tipe Soal`: `MENJODOHKAN`
  - `Opsi A`: `R.A. Kartini -> Jepara`
  - `Opsi B`: `Pangeran Diponegoro -> Yogyakarta`
  - `Opsi C`: `Cut Nyak Dien -> Aceh`
  - `Kunci Jawaban`: Dikosongkan atau `OTOMATIS`
- **Database Mapping:**
  - `Question.type`: `MATCHING`
  - `QuestionOption`: Diparse dari `Premis -> Target` menjadi JSON string yang sesuai dengan renderer mobile & grading:
    `content: JSON.stringify({ left: "R.A. Kartini", right: "Jepara" })`, `is_correct: true`.

### 2.6 Esai / Uraian (`ESSAY`)
- **Word (.docx):**
  ```text
  [SOAL 6]
  TIPE: ESAI
  Jelaskan perbedaan mendasar antara siklus lisogenik dan litik pada replikasi virus!
  PEMBAHASAN: Siklus litik melisiskan sel inang, sedangkan lisogenik menyisipkan materi genetik.
  KESULITAN: SULIT
  ```
- **Excel (.xlsx):**
  - `Tipe Soal`: `ESAI`
  - `Opsi A` s.d. `Opsi E`: Dikosongkan
  - `Kunci Jawaban`: Dikosongkan
  - `Pembahasan`: Rubrik penilaian
- **Database Mapping:**
  - `Question.type`: `ESSAY`
  - `QuestionOption`: Array kosong `[]`.

---

## 3. Schema & Validation Contracts (`@secure-cbt/shared`)

Currently, `importQuestionItemSchema` and `confirmImportQuestionsSchema` have a static `.min(2)` constraint on `options`. This must be updated to a dynamic `.superRefine()` check:
- `MULTIPLE_CHOICE`, `MULTI_SELECT`, `TRUE_FALSE`, `MATCHING`: `options.length >= 2`.
- `SHORT_ANSWER`: `options.length >= 1`.
- `ESSAY`: `options.length >= 0`.
- For `MULTIPLE_CHOICE` & `TRUE_FALSE`: at least 1 option must have `is_correct: true`.
- For `MULTI_SELECT`: at least 1 option must have `is_correct: true`.
- For `MATCHING`: all pairs must have `is_correct: true` with valid `{ left, right }` JSON.

---

## 4. Master Template Generator

1. **Word Template (`template-generator.ts`):**
   - Provide clean instructions explaining the syntax of all 6 question types.
   - Include sample items for each type: `MULTIPLE_CHOICE`, `MULTI_SELECT`, `TRUE_FALSE`, `SHORT_ANSWER`, `MATCHING`, `ESSAY`.
2. **Excel Template (`template-generator.ts`):**
   - Insert new column B: `Tipe Soal` with Excel dropdown validation:
     `PILIHAN GANDA,PG KOMPLEKS,BENAR SALAH,ISIAN SINGKAT,MENJODOHKAN,ESAI`
   - Pre-seed rows with sample items for all 6 formats.
   - Re-run generation script to bundle `.docx` and `.xlsx` default assets in `apps/backend/src/modules/question-bank/templates/`.

---

## 5. Dashboard Preview UI (`import-questions-modal.tsx`)

1. Question Card Header: Badge displaying question type in distinct colors (`Pilihan Ganda`, `PG Kompleks`, `Benar / Salah`, `Isian Singkat`, `Menjodohkan`, `Esai`).
2. Custom rendering per type:
   - `MATCHING`: Render pairs side-by-side (`Premis ⇄ Target`).
   - `SHORT_ANSWER`: Render accepted answer key box.
   - `ESSAY`: Render essay notification box.
   - `MULTI_SELECT`: Checkmark on all correct options.
