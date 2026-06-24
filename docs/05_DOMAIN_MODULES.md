# 05_DOMAIN_MODULES.md

# Secure CBT Platform

Version: 1.0

Status: Draft

---

# 1. Overview

The backend follows a Modular Monolith architecture.

Each module is responsible for a specific business domain.

Modules should:

* Be highly cohesive.
* Minimize dependencies.
* Communicate through events whenever possible.
* Own their data and business rules.

---

# Module Categories

```text
Core Modules
Academic Modules
Exam Modules
Supporting Modules
Infrastructure Modules
```

---

# CORE MODULES

---

# 2. Auth Module

## Purpose

Authentication and authorization.

---

## Responsibilities

* Login
* Logout
* Refresh token
* Password change
* Role validation

---

## Owns

* Access tokens
* Refresh tokens

---

## Depends On

User Module

---

## Events

### user.logged_in

### user.logged_out

---

# 3. User Module

## Purpose

Manage user accounts.

---

## User Types

ADMIN

OPERATOR

TEACHER

STUDENT

---

## Responsibilities

Create user

Update profile

Activate account

Deactivate account

---

## Owns

User information

---

## Events

user.created

user.updated

user.deleted

---

---

# ACADEMIC MODULES

---

# 4. Academic Module

## Purpose

Manage school master data.

---

## Responsibilities

Academic year

Major

Class

Subject

---

## Examples

TKJ

RPL

AKL

---

## Events

class.created

subject.created

academic_year.changed

---

# 5. Student Module

## Purpose

Manage student information.

---

## Responsibilities

Create student

Import students

Update student

Class assignment

---

## Depends On

Academic Module

User Module

---

## Events

student.created

student.imported

student.updated

---

# 6. Teacher Module

## Purpose

Manage teacher information.

---

## Responsibilities

Teacher profile

Subject assignment

Status management

---

## Depends On

Academic Module

User Module

---

## Events

teacher.created

teacher.updated

---

# EXAM MODULES

---

# 7. Question Bank Module

## Purpose

Store reusable questions.

---

## Supported Types

MULTIPLE_CHOICE

TRUE_FALSE

MULTI_SELECT

ESSAY

---

## Responsibilities

Create question

Edit question

Delete question

Categorize question

---

## Depends On

Academic Module

Teacher Module

---

## Events

question.created

question.updated

question.deleted

---

# 8. Exam Module

## Purpose

Manage examinations.

---

## Responsibilities

Create exam

Schedule exam

Generate token

Randomization

Package generation

---

## Depends On

Question Bank Module

Academic Module

Teacher Module

---

## Events

exam.created

exam.published

exam.started

exam.finished

---

# 9. Session Module

## Purpose

Manage runtime exam sessions.

---

## Responsibilities

Start session

Resume session

Expire session

Auto submit

Recover session

---

## Depends On

Exam Module

Student Module

---

## Events

session.started

session.recovered

session.expired

session.finished

---

# 10. Answer Module

## Purpose

Store answers.

---

## Responsibilities

Save answers

Autosave

Synchronize

Restore answers

---

## Depends On

Session Module

Question Bank Module

---

## Events

answer.saved

answer.updated

answer.synced

---

# 11. Monitoring Module

## Purpose

Provide real-time supervision.

---

## Responsibilities

Track progress

Track connectivity

Track warnings

Provide teacher dashboard

---

## Depends On

Session Module

Answer Module

---

## Events

student.connected

student.disconnected

warning.triggered

---

# 12. Grading Module

## Purpose

Calculate scores.

---

## Responsibilities

Auto grading

Essay grading

Final score calculation

---

## Depends On

Answer Module

Question Bank Module

---

## Events

score.generated

essay.graded

---

# SUPPORTING MODULES

---

# 13. Report Module

## Purpose

Generate reports.

---

## Responsibilities

Student reports

Class reports

Export PDF

Export Excel

---

## Depends On

Grading Module

Academic Module

---

## Events

report.generated

---

# 14. Settings Module

## Purpose

Store system configuration.

---

## Responsibilities

Exam settings

Security settings

General settings

---

## Examples

Warning limit

Auto submit

Fullscreen requirement

---

## Events

settings.updated

---

# INFRASTRUCTURE MODULES

Infrastructure modules do not contain business logic.

---

# 15. Cache Module

Redis abstraction.

---

# Responsibilities

Temporary data

Session cache

Presence cache

---

# 16. Queue Module

BullMQ abstraction.

---

# Responsibilities

Background jobs

Report generation

Import processing

---

# 17. Storage Module

MinIO abstraction.

---

# Responsibilities

Store files

Retrieve files

Delete files

---

# 18. Realtime Module

Socket.io abstraction.

---

# Responsibilities

Presence

Notifications

Synchronization

---

# MODULE DEPENDENCY RULES

---

# Allowed

```text
User
↑
Auth

Academic
↑
Student
↑
Session
↑
Answer
↑
Grading
↑
Report
```

---

# Preferred Communication

Events

---

# Avoid

Circular dependencies

---

# Avoid

Deep cross-module calls

---

# Example

Good:

```text
Exam Module
    ↓
event
    ↓
Session Module
```

Bad:

```text
Exam
↓
Session
↓
Answer
↓
Monitoring
↓
Report
↓
Settings
↓
Question
```

---

# MODULE PRIORITY

---

# V1 MVP

Auth

User

Academic

Student

Teacher

Question Bank

Exam

Session

Answer

Monitoring

Grading

Report

Settings

---

# V2

Analytics Module

Notification Module

Image Question Module

---

# V3

Anti Cheat Module

AI Module

Coding Question Module

---

# V4

Multi Tenant Module

Billing Module

Subscription Module

---

# FUTURE MODULES

Not included in V1.

---

Analytics

Notifications

Audit

Search

AI

Billing

Tenant

Code Execution

AI Proctoring

Parent Portal

LMS Integration

---

# Folder Structure

```text
src/

modules/

auth/

user/

academic/

student/

teacher/

question-bank/

exam/

session/

answer/

monitoring/

grading/

report/

settings/

infrastructure/

cache/

queue/

storage/

realtime/
```

---

# Architecture Philosophy

Business modules own business logic.

Infrastructure modules provide technical capabilities.

Modules should remain independent.

Events are preferred over direct coupling.

Microservices are unnecessary until proven otherwise.

---

End of Document.
