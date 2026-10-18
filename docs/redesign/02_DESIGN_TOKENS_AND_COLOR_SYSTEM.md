# 02. Design Tokens & Color System: Linear Academic 2.0

## 1. Design Philosophy: Linear Academic
The Linear Academic palette is crafted to bridge high-focus scholarly work with modern developer-grade SaaS ergonomics. It eliminates visual fatigue during multi-hour question authoring and proctoring sessions while providing instant, high-contrast visual hierarchy for critical telemetry events.

## 2. Dual-Mode Color Palette

### A. Dark Mode (Mission Control)
- **Base Background (`--background`)**: Deep Obsidian (`#07090E` / `hsl(225, 33%, 4%)`)
- **Surface Card (`--card`)**: Midnight Ink (`#0D121F` / `hsl(223, 41%, 9%)`)
- **Elevated Surface (`--card-elevated`)**: Space Slate (`#131B2E` / `hsl(223, 41%, 13%)`)
- **Surface Hover (`--card-hover`)**: Stellar Ink (`#1C263F` / `hsl(223, 38%, 18%)`)
- **Subtle Borders (`--border`)**: Hairline Translucent (`rgba(255, 255, 255, 0.08)`)
- **Accent Primary**: Electric Indigo (`#6366F1` / `hsl(239, 84%, 67%)`)
  - Glow Shadow: `rgba(99, 102, 241, 0.25)`
- **Accent Telemetry**: Neon Cyan (`#06B6D4` / `hsl(189, 94%, 43%)`)
  - Glow Shadow: `rgba(6, 182, 212, 0.2)`
- **Text Headings (`--foreground`)**: Pure Light (`#F8FAFC` / `hsl(210, 40%, 98%)`)
- **Text Muted (`--muted-foreground`)**: Cool Slate (`#94A3B8` / `hsl(215, 20%, 65%)`)

### B. Light Mode (Pristine Titanium)
- **Base Background (`--background`)**: Cool Titanium Slate (`#F8FAFC` / `hsl(210, 40%, 98%)`)
- **Surface Card (`--card`)**: Ice Pure White (`#FFFFFF` / `hsl(0, 0%, 100%)`)
- **Elevated Surface (`--card-elevated`)**: Soft Porcelain (`#F1F5F9` / `hsl(214, 32%, 96%)`)
- **Surface Hover (`--card-hover`)**: Whisper Slate (`#E2E8F0` / `hsl(214, 32%, 91%)`)
- **Subtle Borders (`--border`)**: Slate Gray Hairline (`#E2E8F0` / `hsl(214, 32%, 91%)`)
- **Accent Primary**: Royal Indigo (`#4F46E5` / `hsl(243, 75%, 59%)`)
  - Glow Shadow: `rgba(79, 70, 229, 0.15)`
- **Accent Telemetry**: Deep Cyan (`#0891B2` / `hsl(192, 91%, 36%)`)
  - Glow Shadow: `rgba(8, 145, 178, 0.15)`
- **Text Headings (`--foreground`)**: High-Contrast Obsidian (`#0F172A` / `hsl(222, 84%, 5%)`)
- **Text Muted (`--muted-foreground`)**: Charcoal Slate (`#475569` / `hsl(215, 16%, 47%)`)

## 3. Status & Diagnostic Semantics
- **Success / Clean Device**: Emerald (`#10B981`)
- **Warning / Heartbeat Interruption**: Amber (`#F59E0B`)
- **Destructive / Exit Violation**: Crimson Rose (`#EF4444`)
- **Live WebSocket Synchronized**: Neon Cyan (`#06B6D4`) with pulse animation

## 4. Typography Scale & Density
- **Headings**: Inter / Segoe UI with tracking `-0.02em` for bold, legible titles.
- **Numbers & Metrics**: Monospace tabular numerals (`font-variant-numeric: tabular-nums`) for scores, timer countdowns, and student counts.
- **Formulas**: KaTeX typesetting with inline font-smoothing.
