# 03. Navigation Shell & Ergonomics

## 1. Ergonomic Paradigm Overview
The navigation shell forms the backbone of the Assessia administrative experience. The redesign replaces rigid, fixed-width sidebars with a dynamic dual-state system:
1. **Auto-Docking Rail (Desktop >= 1024px)**: Expandable from 68px icon-only rail to 256px categorized rail.
2. **Top Header & Unified Command Bar (`Ctrl+K`)**: Rapid contextual search, live telemetry badge, notifications, and instant theme switching.
3. **Floating Frosted Thumb Bar (Mobile < 1024px)**: Floating bottom bar positioned for one-thumb reachability with elevated radar pulse proctor button.

## 2. Auto-Docking Sidebar Rail Specifications
- **States**:
  - `expanded` (width: `16rem` / `256px`): Displays cluster headers (*Utama*, *Manajemen Akademik*, *Pusat Pengawasan*), full route titles, active indicators, and version footer.
  - `collapsed` (width: `4.25rem` / `68px`): Centers route icons, hides text labels, and reveals floating tooltips on hover with instantaneous keyboard navigation (`Tab` + `Enter`).
- **Persistence**: Remembers user collapse preference across sessions via `localStorage` key `assessia:sidebar-collapsed`.
- **Keyboard Shortcut**: `Ctrl+B` (or `Cmd+B`) toggles rail collapse state immediately.
- **Active State Indicator**: Left border highlight `border-l-2 border-indigo-500` coupled with translucent glowing background `bg-indigo-500/10` and bold text color.

## 3. Unified Top Command Bar (`Ctrl+K`)
- **Quick Jump Action**: Accessible via header search input or `Ctrl+K`/`⌘K`.
- **Search Scope**: Navigates directly to routes, recent questions, active exams, student directories, or triggers quick actions (e.g., Export Roster, Toggle Dark Mode, Print Cards).
- **Institution Badge**: Displays active school and semester context (`SMA Negeri 1 • Genap 2026/2027`).
- **Telemetry Sync Heartbeat**: Realtime pulse dot indicating active WebSocket connection to NestJS monitoring gateway.

## 4. Mobile & Tablet Floating Frosted Thumb Bar
- **Positioning**: Fixed at bottom (`bottom-3 left-3 right-3`), elevated above content with z-index `40`.
- **Styling**: `backdrop-blur-xl bg-background/85 border border-border/70 rounded-2xl shadow-2xl`.
- **Center Telemetry Pulse Button**: Prominent circular action button with cyan radial pulse for instantaneous jumping to `/dashboard/monitoring`.
- **Drawer Integration**: Clicking "Menu" smoothly triggers an accessible sheet drawer rather than abrupt page reloads.
