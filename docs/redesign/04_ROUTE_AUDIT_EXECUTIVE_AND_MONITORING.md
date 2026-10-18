# 04. Route Audit: Executive Overview & Realtime Monitoring Station

## 1. Executive Overview (`/dashboard`)
### Current State & Bottlenecks
- Static summary metrics (Total Siswa, Total Guru, Ujian Aktif, dsb.) displayed in plain boxed cards.
- Lack of immediate visual distinction between upcoming, active, and completed exams.
- Limited quick-action triggers for high-frequency administrator tasks.

### Redesign Blueprint
- **Futuristic Metric KPI Cards**: Elevated card surface with subtle gradient hairline borders (`futuristic-border`), glowing progress bars, and monospace tabular numerals.
- **Active Exam Pulse Board**: Live indicators showing ongoing exams with active participant count versus registered pool.
- **Quick Action Dock**: Direct launch shortcuts for creating an exam, authoring a question, importing students, or opening live seating radar.
- **Recent Telemetry Stream**: Mini audit list showing recent student submissions, locked devices, and abnormal exit events.

---

## 2. Realtime Monitoring Station (`/dashboard/monitoring`)
### Current State & Bottlenecks
- Table list of exams leading to proctor grid.
- Seating matrix can become unwieldy with 30-40 students on small screens.
- Heartbeat and WebSocket status indicator lacks high-contrast visual immediacy.

### Redesign Blueprint
- **Interactive Seating Grid Matrix**:
  - Color-coded student nodes:
    - `Emerald` (#10B981): Actively answering, device locked, normal heartbeat.
    - `Neon Cyan` (#06B6D4 with pulse): Student interacting with audio stimulus or newly joined.
    - `Amber` (#F59E0B): Heartbeat delayed (>15s) or countdown critical (<5m).
    - `Rose/Red` (#EF4444): Exit violation detected / app minimized / connection severed.
- **Token Broadcast Floating Pill**: Quick copy and regenerative broadcast modal for exam tokens.
- **Student Focus Modal**: Click any seat node to inspect current question index, answer progress (e.g. `34/40`), violation history, and remote action buttons (Force Submit, Unlock Device, Reset Token).
- **Proctor HUD Controls**: Fullscreen mode toggle, lab selector dropdown, and live sound toggle for emergency alerts.
