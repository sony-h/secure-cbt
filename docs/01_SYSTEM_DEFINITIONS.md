# 01_SYSTEM_DEFINITIONS.md

# Secure CBT Platform

Version: 1.0

Status: Draft

---

# 1. Overview

Secure CBT Platform is a cloud-based Computer Based Test (CBT) system designed primarily for Indonesian schools, especially SMA and SMK, with a mobile-first approach.

The system enables schools to conduct examinations using students' smartphones while providing reliability, answer recovery, real-time monitoring, and anti-cheating mechanisms.

The platform is intended to replace traditional LAN-based CBT systems that are difficult to maintain, limited to local networks, and vulnerable to cheating through mobile internet access.

---

# 2. Vision

To provide a reliable, secure, and scalable examination platform for Indonesian schools that combines ease of use with practical anti-cheating capabilities.

---

# 3. Mission

* Provide a stable examination platform for schools.
* Minimize answer loss caused by internet disruptions.
* Support smartphone-based examinations.
* Provide teachers with real-time monitoring capabilities.
* Make cheating more difficult and easier to detect.
* Build a system that can evolve into a multi-school platform in the future.

---

# 4. Problem Statement

Many existing school CBT systems have several limitations:

### Local Network Dependency

Examinations rely on local servers and LAN infrastructure.

### Weak Monitoring

Teachers cannot easily monitor student activity during exams.

### Smartphone Usage

Most schools require students to use smartphones instead of computers.

### Internet Bypass

Students can use:

* Personal mobile data.
* Hotspots.
* Messaging applications.
* AI tools.
* Search engines.

### Reliability Issues

Power outages and unstable internet connections may result in answer loss.

### Administrative Complexity

Managing question banks and exam schedules is often inefficient.

---

# 5. Product Goals

The system aims to:

### Reliability

Prevent answer loss during examinations.

### Security

Reduce opportunities for cheating.

### Accessibility

Support smartphone-based examinations.

### Usability

Provide simple workflows for teachers and administrators.

### Scalability

Support future expansion without major architectural changes.

### Maintainability

Use a modular architecture that is easy to extend and maintain.

---

# 6. Target Users

The system is designed for:

* Senior High Schools (SMA)
* Vocational High Schools (SMK)
* Private Schools
* Public Schools
* Educational Institutions

Primary focus:

* Indonesian SMK and SMA

---

# 7. User Roles

## Administrator

Responsible for overall system configuration.

Responsibilities:

* User management
* School settings
* Academic year management
* System configuration

---

## Operator

Responsible for academic administration.

Responsibilities:

* Import students
* Import teachers
* Manage classes
* Manage subjects

---

## Teacher

Responsible for examination activities.

Responsibilities:

* Create questions
* Manage question banks
* Create exams
* Monitor students
* Grade essays
* Export reports

---

## Student

Responsible for participating in examinations.

Responsibilities:

* Join exams
* Answer questions
* Submit exams
* View results (optional)

---

# 8. Product Scope

## In Scope

### Authentication

* Login
* Logout
* Refresh token
* Role-based access

### Academic Management

* Academic years
* Classes
* Subjects
* Teachers
* Students

### Question Bank

Supported question types:

* Multiple Choice
* True / False
* Multiple Select
* Essay

### Exam Management

* Scheduling
* Token system
* Randomization
* Time limits

### Exam Session

* Start exam
* Resume exam
* Auto submit
* Session recovery

### Answer Management

* Autosave
* Answer synchronization
* Resume after disconnection

### Monitoring

* Student status
* Progress tracking
* Warning counts

### Grading

* Automatic grading
* Manual essay grading

### Reports

* Score reports
* Export results

### Security

* Device binding
* Warning system
* Background detection
* Split-screen detection

---

# 9. Out of Scope

The following features are intentionally postponed:

## Image Questions

Planned for future versions.

---

## File Upload Answers

Planned for future versions.

---

## Matching Questions

Planned for future versions.

---

## Fill-in-the-Blank Questions

Planned for future versions.

---

## Coding Questions

Planned for future versions.

---

## AI Question Generation

Planned for future versions.

---

## AI Essay Grading

Planned for future versions.

---

## AI Proctoring

Planned for future versions.

---

## Multi-School SaaS

Planned for future versions.

---

## Billing and Subscription

Planned for future versions.

---

# 10. Examination Modes

The platform supports several examination types.

## Practice Mode

Low restriction.

Used for exercises and homework.

---

## Daily Quiz

Short quizzes with basic monitoring.

---

## Midterm Examination (PTS)

Moderate restrictions.

---

## Final Examination (PAS)

Strict monitoring.

---

## Try Out

Simulation exams.

---

# 11. Security Philosophy

The objective of the system is not to completely eliminate cheating.

Instead, the platform focuses on:

### Prevention

Make cheating more difficult.

### Detection

Detect suspicious activities.

### Evidence

Provide activity logs and warnings.

### Monitoring

Allow teachers to supervise students effectively.

---

# 12. Product Principles

## Mobile First

Student experience is optimized for smartphones.

---

## Reliability First

Answers should never be lost.

---

## Simplicity

Teachers should be able to operate the system without extensive training.

---

## Progressive Enhancement

Complex features are introduced gradually.

---

## Modular Architecture

The system should remain maintainable as it grows.

---

## Offline Resilience

Temporary network issues should not interrupt examinations.

---

## Practical Security

Security should balance effectiveness with ease of deployment.

---

# 13. Success Metrics

## Functional Targets

* Successful exam completion rate above 99%.

* Answer loss rate close to 0%.

* Automatic answer synchronization.

* Resume capability after disconnection.

---

## Performance Targets

* Support 500 concurrent students.

* Average response time below 500 ms.

* Autosave interval below 10 seconds.

---

## Reliability Targets

* No single point of failure in exam sessions.

* Session recovery after internet interruptions.

* Stable operation during PTS and PAS.

---

# 14. Future Vision

The platform is expected to evolve through multiple stages.

## Version 1

Core CBT platform.

---

## Version 2

Enhanced question types and analytics.

---

## Version 3

AI-assisted features and advanced anti-cheating.

---

## Version 4

Multi-tenant SaaS platform for multiple schools.

---

End of Document.
