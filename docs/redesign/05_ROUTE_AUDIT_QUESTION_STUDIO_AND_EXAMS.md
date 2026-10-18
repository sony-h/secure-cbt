# 05. Route Audit: Question Studio & Examination Scheduling

## 1. Question Bank Catalog & Studio (`/dashboard/questions` & `/dashboard/questions/new`)
### Current State & Bottlenecks
- Table list with pagination and subject filtering.
- Formula editing requires switching tabs or leaves raw LaTeX strings unverified.
- Audio stimulus questions lack inline preview player during question creation.
- Item discrimination (RPBIS) and difficulty indices hidden in deep sub-pages.

### Redesign Blueprint
- **Live Split-Pane KaTeX Studio**:
  - Left pane: Markdown, text editor, option choices, audio stimulus upload, and scoring weight.
  - Right pane: Realtime live preview rendering KaTeX formulas, rendered imagery, and playable audio waveforms exactly as students see on mobile.
- **Item Quality Badges**:
  - Clear visual indicator for Item Difficulty ($P$) and Item Discrimination ($RPBIS$):
    - Very Good ($D \ge 0.40$): Neon Emerald badge.
    - Acceptable ($0.30 \le D < 0.40$): Indigo badge.
    - Revise / Marginal ($0.20 \le D < 0.30$): Amber badge.
    - Poor / Negative ($D < 0.20$): Rose warning badge.
- **Bulk Selection & Export Toolbar**: Floating selection bar when items are checked, enabling bulk tag assignment, subject reassignment, or Excel export.

---

## 2. Examination Builder & Scheduler (`/dashboard/exams`)
### Current State & Bottlenecks
- Multi-step wizard involves extensive vertical scrolling.
- Deterrence controls (lockdown, randomize questions, randomize options, audio play limits) scattered across different accordion tabs.
- Question selection table lacked rapid select-all across filtered sets.

### Redesign Blueprint
- **Step-Progress Header**: Sleek glowing indicator tracking step progress (*Informasi Umum* -> *Pencegahan Kecurangan* -> *Pilihan Paket Soal* -> *Peserta & Jadwal*).
- **Anti-Cheat Deterrence Control Deck**: Visual toggle grid highlighting security features:
  - Full Kiosk Lockdown Mode (`FLAG_SECURE`).
  - Maximum Warning Limit before Force Submit.
  - Show/Hide Score & Review on completion.
  - Audio Stimulus Maximum Play Count limits.
- **Dynamic Question Pool Allocator**: Visual slider and counters for fixed versus random pool distribution.
