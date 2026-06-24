# 02_MASTER_PRD.md

# Secure CBT Platform

Version: 1.0

Status: Draft

---

# 1. Product Overview

Secure CBT Platform is a cloud-based examination platform designed for Indonesian schools with a mobile-first approach.

The platform enables teachers to manage examinations, students to participate using smartphones, and administrators to monitor academic activities while providing practical anti-cheating mechanisms and reliable answer recovery.

---

# 2. User Roles

## Administrator

Responsible for system configuration.

---

## Operator

Responsible for academic data management.

---

## Teacher

Responsible for question creation, examinations, grading, and reports.

---

## Student

Responsible for participating in examinations.

---

# 3. Functional Modules

---

# MODULE 1 - Authentication

## Description

Provides secure access to the platform.

---

## Features

* Login
* Logout
* Refresh Token
* Role-based access control
* Password change

---

## User Stories

### As a student

I want to login securely so that I can access examinations.

### As a teacher

I want to access my dashboard according to my permissions.

---

## Acceptance Criteria

* Invalid credentials are rejected.
* JWT access token is generated.
* Refresh token mechanism works correctly.
* Users only access authorized pages.

---

# MODULE 2 - Academic Management

## Description

Stores academic master data.

---

## Features

### Academic Year

* Create
* Edit
* Activate

---

### Major

Examples:

* TKJ
* RPL
* AKL

---

### Class

Examples:

* XII TKJ A
* XI RPL B

---

### Subject

Examples:

* Mathematics
* Programming
* Computer Networks

---

### Student

* Create
* Import
* Edit

---

### Teacher

* Create
* Import
* Edit

---

## Acceptance Criteria

* Academic data can be managed without duplication.
* Import process succeeds.

---

# MODULE 3 - Question Bank

## Description

Stores reusable questions.

---

## Supported Question Types

### Multiple Choice

Single answer.

---

### True / False

Two options.

---

### Multiple Select

Multiple correct answers.

---

### Essay

Manual grading.

---

## Features

### Create Question

### Edit Question

### Delete Question

### Categorization

By:

* Subject
* Difficulty
* Tags

---

### Randomization Support

Questions can be shuffled.

---

## Acceptance Criteria

* Questions can be reused.
* Questions are organized properly.

---

# MODULE 4 - Exam Management

## Description

Manages examinations.

---

## Features

### Create Exam

Contains:

* Title
* Subject
* Duration
* Schedule

---

### Token System

Students must enter a token before starting.

---

### Randomization

Question order.

Answer order.

---

### Scheduling

Start date.

End date.

---

### Packages

Package A

Package B

Package C

Package D

---

## Acceptance Criteria

* Exam schedule is enforced.
* Randomization works correctly.

---

# MODULE 5 - Exam Session

## Description

Represents runtime examination activities.

---

## Features

### Start Exam

---

### Resume Exam

After disconnect.

---

### Auto Submit

When time expires.

---

### Session Recovery

After internet interruption.

---

### Timer Synchronization

Remaining time stays accurate.

---

## Acceptance Criteria

* Student can continue after reconnecting.
* Timer remains synchronized.

---

# MODULE 6 - Answer Management

## Description

Stores answers safely.

---

## Features

### Autosave

Answers are periodically synchronized.

---

### Resume

Previous answers are restored.

---

### Synchronization

Pending answers are sent automatically.

---

## Acceptance Criteria

* Answers are never lost.
* Autosave works reliably.

---

# MODULE 7 - Monitoring

## Description

Allows teachers to supervise students.

---

## Features

### Online Status

* Online
* Offline
* Disconnected

---

### Progress Monitoring

Example:

25 / 50 answered.

---

### Remaining Time

Countdown.

---

### Warning Counter

Violation count.

---

## Acceptance Criteria

* Teacher sees student activity in real time.

---

# MODULE 8 - Grading

## Description

Calculates scores.

---

## Features

### Automatic Grading

For:

* Multiple Choice
* True / False
* Multiple Select

---

### Manual Grading

For Essay.

---

### Score Calculation

Final score generation.

---

## Acceptance Criteria

* Scores are calculated accurately.

---

# MODULE 9 - Reports

## Description

Provides examination results.

---

## Features

### Student Scores

### Class Scores

### Export

* PDF
* Excel

---

## Acceptance Criteria

Reports can be downloaded successfully.

---

# MODULE 10 - Settings

## Description

Stores school configurations.

---

## Features

### Warning Limit

Default:

3

---

### Auto Submit

Enabled / Disabled

---

### Fullscreen Requirement

Enabled / Disabled

---

### Session Timeout

Configurable

---

## Acceptance Criteria

Configuration changes affect examinations correctly.

---

# 4. Version Roadmap

---

# VERSION 1 (MVP)

Primary Goal:

PTS and PAS ready.

---

## Included

Authentication

Academic Management

Question Bank

Exam Management

Exam Session

Answer Management

Monitoring

Grading

Reports

Settings

---

## Supported Question Types

* Multiple Choice
* True / False
* Multiple Select
* Essay

---

## Security Features

* App background detection
* Split screen detection
* Warning system
* Auto submit

---

## Success Criteria

Support:

500 concurrent students

Answer loss close to zero

Stable during PTS and PAS

---

# VERSION 2

Primary Goal:

Improve usability and analysis.

---

## Additional Features

### Image Questions

Questions with images.

---

### Analytics

* Average score
* Highest score
* Lowest score

---

### Question Statistics

Difficulty analysis.

---

### Notifications

Email notifications.

---

### Enhanced Reports

Class performance reports.

---

# VERSION 3

Primary Goal:

Intelligent examination platform.

---

## Additional Features

### Coding Questions

For RPL.

---

### AI Question Generator

Generate questions automatically.

---

### AI Essay Assistance

Teacher grading assistance.

---

### Advanced Anti-Cheat

* Root detection
* Emulator detection

---

### AI Proctoring

Future research.

---

# VERSION 4

Primary Goal:

Multi-school SaaS platform.

---

## Additional Features

### Multi Tenant

Multiple schools.

---

### Subscription System

Plans and billing.

---

### School Isolation

Independent databases.

---

### Super Admin

Platform-wide management.

---

### Analytics Dashboard

Cross-school insights.

---

# 5. Non Functional Requirements

---

## Reliability

High availability.

---

## Scalability

500 to 1000 concurrent students.

---

## Maintainability

Modular architecture.

---

## Performance

Average response time below 500 ms.

---

## Security

Practical anti-cheating mechanisms.

---

## Mobile First

Optimized for Android devices.

---

## Offline Resilience

Temporary internet issues should not interrupt examinations.

---

# 6. Product Philosophy

The platform focuses on:

### Reliability First

Answers should never be lost.

---

### Mobile First

Students primarily use smartphones.

---

### Practical Security

Prevent, detect, and monitor cheating rather than attempting impossible perfect prevention.

---

### Progressive Enhancement

Start simple and evolve gradually.

---

End of Document.
