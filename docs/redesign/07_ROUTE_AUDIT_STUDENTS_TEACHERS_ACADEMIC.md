# 07. Route Audit: Participant, Teacher SBAC & Academic Administration

## 1. Student Participant Directory (`/dashboard/students`)
### Current State & Bottlenecks
- Large cohorts (up to 2,000 students) required efficient pagination and responsive filtering.
- Bulk password generation and credential card printing needed streamlined access.

### Redesign Blueprint
- **High-Density Virtualized Roster**:
  - Clear typography with student NISN, username, class badge, and active password status.
- **Credential Action Deck**:
  - Class Password Generator Modal: One-click batch password rotation with preview.
  - Dual-Template Card Print Portal: Interactive preview modal for 8-per-page or 10-per-page formal student examination slips.
  - Excel Importer & Template Downloader: Drag-and-drop file upload with column mapping validation.

---

## 2. Teacher SBAC Management (`/dashboard/teachers`)
### Current State & Bottlenecks
- Subject-Based Access Control (SBAC) mappings can be complex (multi-class, multi-subject per teacher).
- Admins needed quick visual confirmation of which classes a teacher is authorized to proctor or grade.

### Redesign Blueprint
- **Teacher Directory & SBAC Badges**:
  - Visual subject chips indicating teacher assignments (e.g. `Fisika: X-1, X-2`).
- **Assignment Matrix Modal**:
  - Intuitive checkbox grid pairing academic subjects with school classes.
  - Auto-scoping indicators showing that teachers are automatically guarded in question bank, exams, grading, and reports.

---

## 3. Academic Structure & Settings (`/dashboard/academic` & `/dashboard/settings`)
### Current State & Bottlenecks
- Academic years, terms, classes, and subjects presented in disjointed tabs.
- System settings lacked clear categorization between security thresholds, email configurations, and branding assets.

### Redesign Blueprint
- **Academic Hierarchy Hub**:
  - Structured tabs for Tahun Pelajaran, Kelas, Jurusan, and Mata Pelajaran with count chips.
- **System Configuration Panel**:
  - Grouped settings cards for Security & Lockdown, Email Delivery (Resend API status), and Storage Bucket health.
