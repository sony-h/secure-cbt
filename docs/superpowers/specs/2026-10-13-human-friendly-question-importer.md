# Human-Friendly Word & Excel Question Importer Specification

## 1. Intent and Context
Assessia by Orivastra enables teachers and administrators to import question banks via Microsoft Word (`.docx`) and Excel (`.xlsx`).
The initial implementation required strict 2-column Word tables (one table per question) and a single-sheet Excel spreadsheet with no visual guides or validation. This caused friction for educators who already possess standard exam question papers written in natural paragraph format or who struggle with manual table entry and typos in Excel.

This specification defines a human-friendly question importer that supports:
1. **Natural Exam Paper Format in Word (`.docx`)**: Teachers can simply format questions as natural numbered paragraphs (`[SOAL 1]`, `1.`, `No. 1`), list options (`A.`, `B.`, `C.`, `D.`, `E.`), and specify metadata (`KUNCI:`, `PEMBAHASAN:`, `KESULITAN:`), with embedded images automatically extracted and converted to WebP. Backward compatibility with table-based format is preserved.
2. **Interactive 3-Sheet Excel Workbook (`.xlsx`)**:
   - `📋 Panduan`: Illustrated instructions and copy-paste guidelines.
   - `✍️ Lembar Input Soal`: Main form with Freeze Panes, column widths, wrap text, and Dropdown Data Validation for Answer Key (`A`–`E`) and Difficulty (`MUDAH`, `SEDANG`, `SULIT`).
   - `💡 Contoh Soal`: Fully filled sample questions across subjects.
3. **Forgiving Parser Engines**:
   - `WordParserService`: Smartly detects whether the document is natural paragraph text or table-based, extracts embedded images without losing them in paragraph mode, and normalizes loose punctuation.
   - `ExcelParserService`: Auto-detects the question sheet across multi-sheet workbooks, trims whitespace from dropdown selections, and parses columns accurately.

## 2. Requirements & Behavior

### 2.1 Word Template & Parser
- **Question Delimiters**:
  - `[SOAL 1]`, `[SOAL 2]`, ...
  - `1.`, `2.`, ...
  - `No. 1`, `No. 2`, `NOMOR 1`, ...
- **Option Delimiters**:
  - `A.`, `B.`, `C.`, `D.`, `E.`
  - `A)`, `B)`, ...
  - `a.`, `b.`, ...
- **Metadata Delimiters**:
  - `KUNCI:` / `JAWABAN:` / `KEY:` / `ANSWER:` followed by single option letter (case-insensitive).
  - `PEMBAHASAN:` / `EXPLANATION:` followed by explanation text (optional).
  - `KESULITAN:` / `TINGKAT:` / `DIFFICULTY:` followed by `MUDAH` / `SEDANG` / `SULIT` (defaults to `SEDANG`).
- **Images**:
  - Embedded images inside question body or options are extracted via Mammoth, stored in storage service, and linked as WebP/PNG image URLs.
- **Backward Compatibility**:
  - If a document contains tables where row 0 or left-hand column defines options `A`–`E` or `KUNCI`, the table parser continues to handle it seamlessly.

### 2.2 Excel Template & Parser
- **Multi-Sheet Structure**:
  - Sheet 1: `Panduan`
  - Sheet 2: `Input Soal`
  - Sheet 3: `Contoh Soal`
- **Data Validation & Ergonomics**:
  - Column H (*Kunci Jawaban*): dropdown list formula `"A,B,C,D,E"`.
  - Column J (*Tingkat Kesulitan*): dropdown list formula `"MUDAH,SEDANG,SULIT"`.
  - Row 1 frozen; columns formatted with auto-wrap text and legible widths.
- **Sheet Selection**:
  - Auto-select sheet named `Input Soal`, `Soal`, `Questions`, or the first sheet containing a valid question header row.

## 3. Tech Stack & Dependencies
- `exceljs` (`^4.4.0`): Generation of Excel templates with data validation, freeze panes, styling, and multi-sheet workbooks.
- `docx` (`^9.0.0`): Generation of aesthetically styled Word master template documents.
- `mammoth`: HTML extraction with embedded image handlers for `.docx`.
- `cheerio`: HTML DOM traversal and tag parsing.
- `xlsx`: Fast in-memory workbook reading.
- NestJS & Vitest for backend services and test verification.
