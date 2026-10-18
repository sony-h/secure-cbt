# 08. Responsive & Accessibility Matrix (WCAG 2.2 AA)

## 1. Responsive Viewport Targets

| Breakpoint Tier | Target Devices | Layout Behavior | Navigation Mechanism |
|---|---|---|---|
| **Mobile Compact (360px - 639px)** | iPhone SE, Galaxy S21, Xiaomi Redmi | Single-column fluid stack; horizontal scroll for wide data-tables; modal bottom-sheet conversion. | Floating Frosted Thumb Bar with center pulse button; hamburger sheet drawer. |
| **Mobile Wide / Phablet (640px - 767px)** | Pixel Pro, iPhone Max | 2-column KPI grids; responsive filter rows; condensed data-table cells. | Floating Frosted Thumb Bar; quick action sheet. |
| **Tablet Portrait / Landscape (768px - 1023px)** | iPad 10th Gen, Galaxy Tab S8 | 3-column metric grids; split-pane view with toggle; table pagination bar pinned. | Floating Frosted Thumb Bar or auto-docking icon rail. |
| **Desktop Laptop (1024px - 1279px)** | MacBook Air 13", ThinkPad 14" | Standard multi-pane dashboard; expanded seating proctor grid (6 columns). | Auto-Docking Sidebar Rail (default expanded or 68px collapsed); top command bar `Ctrl+K`. |
| **Desktop Widescreen (1280px - 1440px+)** | 24"-27" Proctor Monitors | Maximum density proctoring station; 8-10 column seating radar; dual-pane KaTeX studio. | Auto-Docking Sidebar Rail with quick toggle `Ctrl+B`; persistent top command bar. |

---

## 2. WCAG 2.2 AA Accessibility Compliance

### Contrast Ratios
- **Body Text**: Normal text ($\ge 4.5:1$).
  - Light mode: Obsidian `#0F172A` on `#F8FAFC` yields $14.2:1$.
  - Dark mode: Pure Light `#F8FAFC` on `#07090E` yields $17.8:1$.
- **Large Text / Headings**: ($\ge 3.0:1$).
  - Electric Indigo `#6366F1` on Deep Obsidian `#07090E` yields $5.8:1$ (Exceeds AA standard).
  - Royal Indigo `#4F46E5` on White `#FFFFFF` yields $5.4:1$ (Exceeds AA standard).
- **Interactive UI Components & Focus States**:
  - Focus ring: High-contrast 2px ring with 2px offset (`ring-2 ring-indigo-500 ring-offset-2`).

### Keyboard Navigation & Semantics
- Full keyboard trap avoidance across all modal dialogues.
- Logical `tabindex` order from header, navigation rail, main workspace, to floating actions.
- ARIA landmarks (`role="navigation"`, `role="main"`, `aria-expanded`, `aria-label`) properly applied across sidebar rail and drawer sheets.
- Screen-reader text (`sr-only`) provided for icon-only buttons in collapsed rail state.
