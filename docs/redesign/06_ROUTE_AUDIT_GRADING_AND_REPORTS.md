# 06. Route Audit: Grading Studio & Academic Reporting

## 1. Essay Grading Studio (`/dashboard/grading`)
### Current State & Bottlenecks
- Grading essay questions requires opening individual modal dialogs or endless table page-turning.
- Teachers lack side-by-side comparison between student submission and official rubric answer key.
- Manual score input requires point-and-click mouse interaction, slowing grading during large exam batches.

### Redesign Blueprint
- **Split-Pane Assessment Workbench**:
  - Left Panel: Student response rendered with rich formatting, KaTeX equations, and word counter.
  - Right Panel: Model rubric, scoring criteria, max weight points, feedback text field, and quick score keypad.
- **Ergonomic Keyboard Navigation**:
  - Press `Enter` to commit score and advance to next student.
  - Press `[` and `]` to navigate between students without losing active context.
- **Progress Gauge**: Realtime completion percentage bar showing graded essays versus pending queue for the selected subject.

---

## 2. Academic Reports & Item Discrimination Analysis (`/dashboard/reports`)
### Current State & Bottlenecks
- Tabular lists of completed sessions without immediate statistical summaries.
- Psychometric reliability metrics (KR-20, Cronbach Alpha) difficult to interpret for non-statisticians.
- Export modal for official school KKA (Kriteria Ketuntasan Asesmen) PDF lacked preview thumbnail.

### Redesign Blueprint
- **Psychometric Health Overview**:
  - KR-20 Reliability Gauge: Clean visual dial classifying exam reliability into High ($\ge 0.80$), Moderate ($0.60 - 0.79$), or Low ($< 0.60$).
  - Score Distribution Histogram: High-contrast bar visualizer depicting student grade clusters.
- **Student Session Review & Audit Inspector**:
  - Timeline modal showing student answer timestamps, flagged violations, audio playback logs, and submission duration.
- **Export Command Center**: One-click generation of Excel grade spreadsheets and dual-layout PDF report cards.
