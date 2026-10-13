# Rich Text & Code Block Editor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement a comprehensive Rich Text & Code Block Editor across Assessia's Question Studio, Option Editors, Phone Preview, and Flutter Mobile CBT app—supporting coding subjects (KKA, Python, SQL, JS) with indentation, line breaks, syntax formatting, typography (bold, italic, underline, strike, sub/super, lists), and math.

**Architecture:**
- **Data format:** Extended Markdown (GFM + safe HTML typography + LaTeX math).
- **Web Renderer (`apps/dashboard`):** `RichMarkdownRenderer` parses fenced code blocks with language tags, line numbers, and copy button; inline code; bold/italic/underline/strikethrough/sub/super; and KaTeX math.
- **Web Editors (`apps/dashboard`):** `RichQuestionEditor` (split/tab view, coding language picker, smart Tab 4-space indent) and `RichOptionEditor` (auto-growing textarea with mini-toolbar for multi-line code options).
- **Mobile CBT (`apps/mobile`):** Upgraded `RichExamText` in Flutter to parse code blocks, inline code, typography tags, and math formulas into styled native widgets with horizontal scrolling.

**Tech Stack:** Next.js 14, React 18, KaTeX, Tailwind CSS, Lucide icons, Vitest, Flutter (Dart), `flutter_math_fork`.

---

## Global Constraints
- Database column `content` in `Question` and `QuestionOption` stores raw text/Markdown without schema change.
- Tab key in code editor must insert 4 spaces (or indent selected lines) instead of shifting HTML focus.
- Code blocks must support horizontal scrolling on mobile/preview screens without awkward line breaking or container overflow.
- 100% backward compatibility for existing plain text and math formulas (`$...$` and `$$...$$`).

## Review Focus
1. **Python Indentation Preservation:** Pasting or typing indented Python code (e.g. `def foo():\n    if bar:\n        return True`) must preserve exact indentation and line breaks in both preview and mobile view.
2. **Multi-line Option Keys:** Options containing multi-line code snippets (e.g. ````python\nfor i in range(5):\n    print(i)\n````) must save, render, and select properly without truncating to 1 line.
3. **Smart Tab Key Handling:** Pressing `Tab` while cursor is inside `RichQuestionEditor` or `RichOptionEditor` must indent text by 4 spaces and not jump to the next form element.
4. **XSS & HTML Safety:** Unsanitized `<script>` or event handler tags in question markdown must be stripped or escaped; only safe styling tags (`<u>`, `<sup>`, `<sub>`, `<br>`) are permitted.
5. **Mobile Horizontal Code Overflow:** Long lines of code (e.g. SQL queries with multiple JOINs) must scroll horizontally inside a code container in Flutter mobile and Phone Preview, never clipping or overflowing the card boundary.

---

### Task 1: Rich Text & Code Block Web Renderer (`RichMarkdownRenderer`)

**Files:**
- Create: `apps/dashboard/src/components/ui/rich-markdown-renderer.tsx`
- Modify: `apps/dashboard/src/components/ui/math-renderer.tsx`
- Test: `apps/dashboard/src/components/ui/__tests__/rich-markdown-renderer.spec.tsx`

**Interfaces:**
- Consumes: KaTeX (`katex.renderToString`)
- Produces: `RichMarkdownRenderer({ content, className, showLineNumbers }: RichMarkdownRendererProps): JSX.Element`

- [ ] **Step 1: Write failing unit test for `RichMarkdownRenderer`**

```tsx
// apps/dashboard/src/components/ui/__tests__/rich-markdown-renderer.spec.tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { RichMarkdownRenderer } from '../rich-markdown-renderer';

describe('RichMarkdownRenderer', () => {
  it('renders fenced code blocks with language badge and monospace styling', () => {
    const content = 'Berikut kode:\n```python\ndef halo():\n    return "dunia"\n```';
    const { container } = render(<RichMarkdownRenderer content={content} />);
    expect(container.querySelector('pre')).toBeTruthy();
    expect(container.querySelector('code')).toBeTruthy();
    expect(container.textContent).toContain('PYTHON');
    expect(container.textContent).toContain('def halo():');
  });

  it('renders inline formatting: bold, italic, underline, strike, sub, super', () => {
    const content = '**tebal** *miring* <u>garis bawah</u> ~~coret~~ H<sub>2</sub>O x<sup>2</sup>';
    const { container } = render(<RichMarkdownRenderer content={content} />);
    expect(container.querySelector('strong')?.textContent).toBe('tebal');
    expect(container.querySelector('em')?.textContent).toBe('miring');
    expect(container.querySelector('u')?.textContent).toBe('garis bawah');
    expect(container.querySelector('del')?.textContent).toBe('coret');
    expect(container.querySelector('sub')?.textContent).toBe('2');
    expect(container.querySelector('sup')?.textContent).toBe('2');
  });

  it('renders KaTeX formulas alongside markdown', () => {
    const content = 'Nilai $x = 5$ dan persamaan $$f(x) = x^2$$';
    const { container } = render(<RichMarkdownRenderer content={content} />);
    expect(container.querySelector('.katex')).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter dashboard test rich-markdown-renderer.spec.tsx`
Expected: FAIL with missing module `rich-markdown-renderer`.

- [ ] **Step 3: Implement `RichMarkdownRenderer`**

Create `apps/dashboard/src/components/ui/rich-markdown-renderer.tsx` parsing:
- Fenced code blocks (```````[lang]\n...\n```````) into styled dark containers with header, language badge, copy button, and line numbers.
- Block math (`$$...$$`) and inline math (`$...$`) via KaTeX.
- Typography: `**bold**`, `*italic*`, `<u>underline</u>`, `~~strikethrough~~`, `<sup>super</sup>`, `<sub>sub</sub>`, `` `inline code` ``, lists (`- `, `1. `), and line breaks.
- Re-export `RichMarkdownRenderer` from `math-renderer.tsx` for drop-in backward compatibility.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter dashboard test rich-markdown-renderer.spec.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/dashboard/src/components/ui/rich-markdown-renderer.tsx apps/dashboard/src/components/ui/math-renderer.tsx apps/dashboard/src/components/ui/__tests__/
git commit -m "feat(dashboard): add RichMarkdownRenderer for code blocks, typography, and math"
```

---

### Task 2: Interactive Rich Question Editor (`RichQuestionEditor`)

**Files:**
- Create: `apps/dashboard/src/components/questions/rich-question-editor.tsx`
- Test: `apps/dashboard/src/components/questions/__tests__/rich-question-editor.spec.tsx`

**Interfaces:**
- Consumes: `RichMarkdownRenderer`, `Button`, `DropdownMenu`, `Tabs`
- Produces: `RichQuestionEditor({ value, onChange, placeholder, minHeight, onOpenFormulaBuilder }: RichQuestionEditorProps): JSX.Element`

- [ ] **Step 1: Write failing test for `RichQuestionEditor`**

```tsx
// apps/dashboard/src/components/questions/__tests__/rich-question-editor.spec.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { RichQuestionEditor } from '../rich-question-editor';

describe('RichQuestionEditor', () => {
  it('inserts 4 spaces when Tab is pressed instead of losing focus', () => {
    const handleChange = vi.fn();
    render(<RichQuestionEditor value="def func():\n" onChange={handleChange} />);
    const textarea = screen.getByRole('textbox');
    
    fireEvent.keyDown(textarea, { key: 'Tab' });
    expect(handleChange).toHaveBeenCalledWith('def func():\n    ');
  });

  it('inserts bold markdown syntax when bold button is clicked', () => {
    const handleChange = vi.fn();
    render(<RichQuestionEditor value="halo" onChange={handleChange} />);
    const boldBtn = screen.getByTitle(/Tebal/i);
    
    fireEvent.click(boldBtn);
    expect(handleChange).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter dashboard test rich-question-editor.spec.tsx`
Expected: FAIL.

- [ ] **Step 3: Implement `RichQuestionEditor`**

Build `apps/dashboard/src/components/questions/rich-question-editor.tsx`:
- Toolbar buttons:
  - Formatting: Bold, Italic, Underline, Strikethrough, Superscript, Subscript.
  - Lists: Bullet list (`- `), Numbered list (`1. `).
  - Code: Inline code (`` `kode` ``), Code Block dropdown with languages: Python, SQL, JavaScript, HTML/CSS, C/C++, Java, PHP, Pseudocode.
  - Math: Formula Builder trigger.
  - Indent: Quick Tab button (+4 spaces).
- View Toggle:
  - Split View: Side-by-side Editor & Live `RichMarkdownRenderer` (default on desktop).
  - Tab View: "Tulis" tab and "Pratinjau" tab (responsive on mobile/tablet).
- Keydown handler:
  - `Tab`: inserts 4 spaces or indents selected multi-line text (`e.preventDefault()`).
  - `Shift+Tab`: dedents 4 spaces (`e.preventDefault()`).

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter dashboard test rich-question-editor.spec.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/dashboard/src/components/questions/rich-question-editor.tsx apps/dashboard/src/components/questions/__tests__/
git commit -m "feat(dashboard): add RichQuestionEditor with split preview, code snippets, and smart tab indentation"
```

---

### Task 3: Multi-line Rich Option Editor (`RichOptionEditor`)

**Files:**
- Create: `apps/dashboard/src/components/questions/rich-option-editor.tsx`
- Test: `apps/dashboard/src/components/questions/__tests__/rich-option-editor.spec.tsx`

**Interfaces:**
- Consumes: Lucide icons, `Button`
- Produces: `RichOptionEditor({ value, onChange, placeholder, label, onOpenFormulaBuilder }: RichOptionEditorProps): JSX.Element`

- [ ] **Step 1: Write failing test for `RichOptionEditor`**

```tsx
// apps/dashboard/src/components/questions/__tests__/rich-option-editor.spec.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { RichOptionEditor } from '../rich-option-editor';

describe('RichOptionEditor', () => {
  it('supports multi-line code option input and renders auto-resizing textarea', () => {
    const handleChange = vi.fn();
    render(<RichOptionEditor value="line 1\nline 2" onChange={handleChange} label="A" />);
    const textarea = screen.getByRole('textbox');
    expect(textarea).toHaveValue('line 1\nline 2');
  });

  it('inserts inline code backticks from mini-toolbar', () => {
    const handleChange = vi.fn();
    render(<RichOptionEditor value="return x" onChange={handleChange} label="A" />);
    const codeBtn = screen.getByTitle(/Format Kode/i);
    fireEvent.click(codeBtn);
    expect(handleChange).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter dashboard test rich-option-editor.spec.tsx`
Expected: FAIL.

- [ ] **Step 3: Implement `RichOptionEditor`**

Build `apps/dashboard/src/components/questions/rich-option-editor.tsx`:
- Auto-expanding textarea adapting to 1 to 8 lines of code/text.
- Monospace font style toggle when code option is detected or desired.
- Compact toolbar: `[B]`, `[I]`, `[`Kode`]`, `[{;} Blok Kode]`, `[x²]`, `[x₂]`, `[Σ Rumus]`.
- Keydown handler for `Tab` (inserts 4 spaces without losing focus).

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter dashboard test rich-option-editor.spec.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/dashboard/src/components/questions/rich-option-editor.tsx apps/dashboard/src/components/questions/__tests__/
git commit -m "feat(dashboard): add RichOptionEditor supporting multi-line code and mini formatting toolbar"
```

---

### Task 4: Integration in `QuestionStudio` & `QuestionPhonePreview`

**Files:**
- Modify: `apps/dashboard/src/components/questions/question-studio.tsx`
- Modify: `apps/dashboard/src/components/questions/question-phone-preview.tsx`

**Interfaces:**
- Consumes: `RichQuestionEditor`, `RichOptionEditor`, `RichMarkdownRenderer`
- Produces: Integrated Question Studio with live smartphone simulator previewing code blocks & rich text.

- [ ] **Step 1: Replace plain textareas in `question-studio.tsx`**
  - Replace Card 2 Question Stimulus textarea with `<RichQuestionEditor value={form.content} onChange={...} />`.
  - Replace Explanation textarea in Card 4 with `<RichQuestionEditor value={form.explanation} onChange={...} minHeight="100px" />`.
  - Replace single-line `<Input>` for Options (A-E, True/False, Short Answer) with `<RichOptionEditor value={opt.content} onChange={...} label={label} />`.

- [ ] **Step 2: Upgrade `QuestionPhonePreview` in `question-phone-preview.tsx`**
  - Use `RichMarkdownRenderer` for question content, options, and explanation.
  - Add dark-mode styling and horizontal scrolling container for code blocks inside the phone simulator screen.

- [ ] **Step 3: Build & verify dashboard**

Run: `pnpm --filter dashboard build`
Expected: 0 TypeScript errors, successful Next.js build.

- [ ] **Step 4: Commit**

```bash
git add apps/dashboard/src/components/questions/question-studio.tsx apps/dashboard/src/components/questions/question-phone-preview.tsx
git commit -m "feat(dashboard): integrate RichQuestionEditor and RichOptionEditor into QuestionStudio and PhonePreview"
```

---

### Task 5: Mobile CBT Rich Text & Code Block Rendering (`RichExamText` in Flutter)

**Files:**
- Modify: `apps/mobile/lib/core/widgets/rich_exam_text.dart`
- Test: `apps/mobile/test/core/widgets/rich_exam_text_test.dart`

**Interfaces:**
- Consumes: Flutter standard widgets, `flutter_math_fork`
- Produces: Enhanced `RichExamText` rendering code blocks, inline code, bold, italic, underline, strikethrough, sub/superscript, and math.

- [ ] **Step 1: Write failing widget test in `rich_exam_text_test.dart`**

```dart
testWidgets('RichExamText renders fenced code block with horizontal scrollable container', (tester) async {
  const codeQuestion = '''
Perhatikan kode berikut:
```python
def hitung(a, b):
    return a + b
```
Berapa hasilnya?
''';

  await tester.pumpWidget(
    const MaterialApp(
      home: Scaffold(
        body: RichExamText(text: codeQuestion),
      ),
    ),
  );

  expect(find.textContaining('def hitung(a, b):'), findsOneWidget);
  expect(find.byType(SingleChildScrollView), findsWidgets);
});

testWidgets('RichExamText renders bold, italic, and underline spans', (tester) async {
  const formattedText = 'Kata **tebal**, kata *miring*, dan <u>garis bawah</u>.';
  await tester.pumpWidget(
    const MaterialApp(
      home: Scaffold(
        body: RichExamText(text: formattedText),
      ),
    ),
  );

  expect(find.byType(RichExamText), findsOneWidget);
});
```

- [ ] **Step 2: Run Flutter test to verify it fails**

Run: `cd apps/mobile && flutter test test/core/widgets/rich_exam_text_test.dart`
Expected: FAIL or missing code block formatting.

- [ ] **Step 3: Implement code block and rich markdown parser in `rich_exam_text.dart`**
  - Parse fenced code blocks (```````[lang]\n...\n```````) into custom container:
    - Rounded corners, background `#1E1E2E` (or dark slate).
    - Header banner with uppercase language badge (e.g. `PYTHON`, `SQL`).
    - Horizontal `SingleChildScrollView` preserving exact line breaks and spaces with monospace font (`FontFamily: 'monospace'`).
  - Parse inline tokens:
    - Bold (`**...**`), Italic (`*...*`), Strikethrough (`~~...~~`), Underline (`<u>...</u>`), Inline code (`` `...` ``).
    - Subscript (`<sub>...</sub>`) and Superscript (`<sup>...</sup>`).
    - Seamlessly preserve existing `$..$` and `$$..$$` KaTeX formula rendering.

- [ ] **Step 4: Run Flutter test to verify it passes**

Run: `cd apps/mobile && flutter test test/core/widgets/rich_exam_text_test.dart`
Expected: ALL PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/lib/core/widgets/rich_exam_text.dart apps/mobile/test/core/widgets/rich_exam_text_test.dart
git commit -m "feat(mobile): support code blocks and rich typography in RichExamText widget"
```

---

## Execution Handoff
Plan complete and saved to `docs/superpowers/plans/2026-10-13-rich-text-code-editor.md`.
