# 06_DATABASE_AND_API_DESIGN.md

# Secure CBT Platform

Version: 1.0

Status: Draft

---

# 1. Design Principles

The database follows:

* PostgreSQL
* Prisma ORM
* snake_case naming convention
* UUID primary keys
* Soft delete support
* Audit timestamps

---

# Common Fields

Every entity should contain:

```text
id
created_at
updated_at
deleted_at
```

---

# Primary Key

UUID

Example:

```text
3f3dc1db-8f8f-4eb5-8af3-1ec5b6f8a65f
```

---

# Naming Convention

Tables:

snake_case

Example:

```text
users
students
exam_sessions
question_options
```

---

Columns:

snake_case

Example:

```text
first_name
warning_count
remaining_time
```

---

# 2. Enums

## UserRole

```text
ADMIN
OPERATOR
TEACHER
STUDENT
```

---

## QuestionType

```text
MULTIPLE_CHOICE
TRUE_FALSE
MULTI_SELECT
ESSAY
```

---

## ExamStatus

```text
DRAFT
PUBLISHED
ONGOING
FINISHED
CANCELLED
```

---

## SessionStatus

```text
ACTIVE
PAUSED
SUBMITTED
AUTO_SUBMITTED
EXPIRED
```

---

## StudentStatus

```text
ACTIVE
INACTIVE
GRADUATED
```

---

# 3. Core Tables

---

## users

Stores authentication data.

Fields:

```text
id
username
email
password_hash
role
is_active
created_at
updated_at
deleted_at
```

---

## students

Fields:

```text
id
user_id
nis
full_name
class_id
status
```

---

## teachers

Fields:

```text
id
user_id
nip
full_name
```

---

# 4. Academic Tables

---

## academic_years

```text
id
name
is_active
```

Example:

2025/2026

---

## majors

Examples:

TKJ

RPL

AKL

---

## classes

Examples:

XII TKJ A

XI RPL B

---

## subjects

Examples:

Mathematics

Programming

Computer Networks

---

# 5. Question Bank Tables

---

## question_banks

Container for questions.

Fields:

```text
id
title
subject_id
teacher_id
```

---

## questions

Fields:

```text
id
question_bank_id
type
content
difficulty
explanation
```

---

## question_options

Fields:

```text
id
question_id
content
is_correct
```

---

# Relationships

Question

↓

Question Options

1:N

---

# 6. Exam Tables

---

## exams

Fields:

```text
id
title
subject_id
duration_minutes
status
start_at
end_at
```

---

## exam_tokens

Fields:

```text
id
exam_id
token
expires_at
```

---

## exam_packages

Supports A/B/C/D packages.

Fields:

```text
id
exam_id
name
```

---

## exam_questions

Bridge table.

Fields:

```text
exam_id
question_id
position
```

---

# 7. Session Tables

---

## exam_sessions

Fields:

```text
id
exam_id
student_id
status
started_at
submitted_at
warning_count
```

---

## session_logs

Stores activities.

Fields:

```text
id
exam_session_id
event
description
timestamp
```

Examples:

```text
APP_BACKGROUND

SPLIT_SCREEN

RECONNECTED

AUTO_SUBMIT
```

---

# 8. Answer Tables

---

## answers

Fields:

```text
id
exam_session_id
question_id
answer_text
is_correct
score
```

---

Essay answers:

stored in same table.

---

# 9. Grading Tables

---

## scores

Fields:

```text
id
exam_session_id
total_score
correct_count
wrong_count
essay_score
```

---

# 10. Report Tables

Future cache table:

## reports

```text
id
type
generated_at
```

---

# 11. Settings Table

## settings

Fields:

```text
id
warning_limit
auto_submit_enabled
fullscreen_required
session_timeout
```

---

# 12. Indexing Strategy

Index:

```text
username
email
nis
nip
exam_id
student_id
question_id
session_id
```

---

Composite indexes:

```text
exam_id + student_id

class_id + status
```

---

# 13. Soft Delete Strategy

Use:

```text
deleted_at
```

instead of hard delete.

---

# API DESIGN

---

# API Versioning

Prefix:

```text
/api/v1
```

---

Example:

```text
/api/v1/auth/login
```

---

# Response Format

Success:

```json
{
  "success": true,
  "message": "Success",
  "data": {}
}
```

---

Error:

```json
{
  "success": false,
  "message": "Validation failed",
  "errors": []
}
```

---

# Pagination Format

```json
{
  "data": [],
  "meta": {
    "page": 1,
    "per_page": 20,
    "total": 100
  }
}
```

---

# AUTH APIs

---

POST

```text
/auth/login
```

POST

```text
/auth/logout
```

POST

```text
/auth/refresh
```

GET

```text
/auth/me
```

---

# STUDENT APIs

GET

```text
/students
```

GET

```text
/students/:id
```

POST

```text
/students
```

PATCH

```text
/students/:id
```

DELETE

```text
/students/:id
```

---

# TEACHER APIs

Similar CRUD.

---

# SUBJECT APIs

Similar CRUD.

---

# QUESTION APIs

GET

```text
/questions
```

GET

```text
/questions/:id
```

POST

```text
/questions
```

PATCH

```text
/questions/:id
```

DELETE

```text
/questions/:id
```

---

# EXAM APIs

GET

```text
/exams
```

POST

```text
/exams
```

PATCH

```text
/exams/:id
```

DELETE

```text
/exams/:id
```

---

Publish:

POST

```text
/exams/:id/publish
```

---

Generate Token:

POST

```text
/exams/:id/token
```

---

# SESSION APIs

Start:

POST

```text
/sessions/start
```

Resume:

POST

```text
/sessions/resume
```

Submit:

POST

```text
/sessions/submit
```

---

# ANSWER APIs

Autosave:

POST

```text
/answers/save
```

Batch sync:

POST

```text
/answers/sync
```

---

# MONITORING APIs

GET

```text
/monitoring/exams/:id
```

GET

```text
/monitoring/sessions/:id
```

---

# GRADING APIs

POST

```text
/grading/essay
```

GET

```text
/grading/result/:sessionId
```

---

# REPORT APIs

GET

```text
/reports/exam/:id
```

GET

```text
/reports/class/:id
```

---

# Validation Strategy

Request DTO

↓

Zod Schema

↓

Controller

↓

Service

↓

Repository

↓

Prisma

---

# Error Codes

400

Bad Request

---

401

Unauthorized

---

403

Forbidden

---

404

Not Found

---

409

Conflict

---

422

Validation Error

---

500

Internal Server Error

---

# Future Tables

Not included in V1:

```text
notifications

analytics

attachments

image_questions

code_questions

tenants

billing

subscriptions

ai_logs

audit_logs
```

---

# Database Philosophy

Normalize where practical.

Prefer simplicity over excessive optimization.

Avoid premature complexity.

Keep schema extensible for future versions.

---

End of Document.
