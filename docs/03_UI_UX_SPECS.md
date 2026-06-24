# 03_UI_UX_SPECS.md

# Secure CBT Platform

Version: 1.0

Status: Draft

---

# Design Principles

## Simple

Interfaces should be easy for teachers and students to understand.

---

## Mobile First

Student experience is optimized for smartphones.

---

## Responsive

Teacher dashboard supports:

* Desktop
* Laptop
* Tablet

---

## Minimal Distraction

Focus on examination activities.

---

## Accessible

Large buttons.

Clear typography.

Simple navigation.

---

# PART I - ADMIN & TEACHER DASHBOARD

Built with:

Next.js

Desktop-first.

---

# 1. Login Page

## Purpose

Authenticate users.

---

## Components

* School logo
* Email / Username field
* Password field
* Remember me
* Login button

---

## States

### Normal

### Loading

### Invalid credentials

### Network error

---

# 2. Dashboard Page

## Purpose

Provide overview information.

---

## Statistics Cards

### Total Students

### Total Teachers

### Active Exams

### Upcoming Exams

---

## Recent Activities

Displays:

* Exam created
* Student submitted exam
* New teacher added

---

## Quick Actions

Buttons:

* Create Exam
* Create Question
* Import Students

---

# 3. Student Management

## Table Columns

* Name
* NIS
* Class
* Status

---

## Actions

* Add student
* Edit student
* Delete student
* Import Excel

---

## Search

Search by:

* Name
* NIS

---

## Filters

* Class
* Major

---

# 4. Teacher Management

## Table Columns

* Name
* Subject
* Status

---

## Actions

* Add teacher
* Edit teacher
* Delete teacher

---

# 5. Academic Management

Sections:

### Academic Year

### Major

### Class

### Subject

---

Each page supports:

* Create
* Edit
* Delete

---

# 6. Question Bank

## Table Columns

* Question
* Subject
* Type
* Difficulty

---

## Filters

Subject

Question type

Difficulty

---

## Actions

* Create
* Edit
* Duplicate
* Delete

---

# Create Question Page

---

## General Information

Title

Subject

Difficulty

Tags

---

## Question Types

### Multiple Choice

Single answer.

---

### True / False

---

### Multiple Select

Multiple correct answers.

---

### Essay

Long answer.

---

## Preview Panel

Displays question preview.

---

# 7. Exam Management

## Exam Table

Columns:

* Title
* Subject
* Duration
* Start Time
* End Time
* Status

---

## Actions

* Create Exam
* Edit Exam
* Publish Exam
* Delete Exam

---

# Create Exam Page

---

## Basic Information

Title

Description

Subject

Duration

---

## Scheduling

Start time

End time

---

## Randomization

Question order

Answer order

---

## Security

Warning limit

Auto submit

Fullscreen required

---

## Token

Generate token.

---

# 8. Monitoring Dashboard

One of the most important screens.

---

## Statistics

Students online

Students disconnected

Students finished

Students warned

---

## Student Table

Columns:

* Name
* Class
* Progress
* Remaining Time
* Warning Count
* Status

---

## Status Indicators

🟢 Active

🟡 Idle

🔴 Disconnected

⚠ Warning

---

## Actions

View details.

Force submit.

---

# Student Detail Dialog

Displays:

Timeline of events.

Examples:

09:21 Backgrounded app

09:25 Reconnected

09:28 Warning #2

---

# 9. Essay Grading Page

## Table

Student

Score

Status

---

## Answer Viewer

Question

Student answer

Rubric

---

## Actions

Assign score.

Save.

Next student.

---

# 10. Reports Page

Displays:

* Student score
* Class score
* Average score

---

## Export

PDF

Excel

---

# 11. Settings Page

Sections:

General settings

Exam settings

Security settings

---

# PART II - STUDENT MOBILE APP

Built with:

Flutter

Android-first.

---

# 1. Login Screen

## Components

School logo

Username

Password

Login button

---

## States

Loading

Invalid credentials

Network error

---

# 2. Home Screen

Displays:

Upcoming exams

Finished exams

User profile

---

# Exam Card

Title

Subject

Date

Status

---

# 3. Exam Token Screen

Purpose:

Join exam.

---

## Components

Token input

Join button

---

## Errors

Invalid token

Exam unavailable

Expired token

---

# 4. Exam Instructions Screen

Displays:

Title

Duration

Question count

Exam rules

Warning limit

---

## Buttons

Start Exam

Cancel

---

# 5. Exam Screen

The most critical screen.

---

# Header

Remaining time

Progress

Connection status

---

# Body

Question

Options

Answer area

---

# Bottom Navigation

Previous

Next

Question list

Submit

---

# Question Types

## Multiple Choice

Radio buttons.

---

## True / False

Two options.

---

## Multiple Select

Checkboxes.

---

## Essay

Multiline input.

---

# Question Palette

Displays:

Answered

Unanswered

Current

---

# Status Colors

Green = Answered

Gray = Unanswered

Blue = Current

---

# Connection Indicator

Online

Offline

Synchronizing

---

# Auto Save Indicator

Saving...

Saved

Pending

---

# 6. Warning Dialog

Displayed when:

App backgrounded.

Split screen detected.

---

Message:

Warning 1 of 3.

Repeated violations may cause automatic submission.

---

# 7. Auto Submit Screen

Shown when:

Time expires.

Warning limit exceeded.

---

Displays:

Exam submitted successfully.

---

# 8. Submission Confirmation

Displays:

Are you sure you want to submit?

---

Buttons:

Cancel

Submit

---

# 9. Success Screen

Displays:

Exam completed.

---

Buttons:

Return to Home

---

# 10. Result Screen

Optional.

Displays:

Score

Correct answers

Incorrect answers

---

# Error States

Network error

Synchronization failed

Server unavailable

---

# Loading States

Loading spinner.

Skeleton placeholders.

---

# Empty States

No exams available.

No completed exams.

No notifications.

---

# Offline Behavior

Students may continue answering while disconnected.

Answers are stored locally.

Synchronization resumes automatically when connection returns.

---

# Theme

Clean.

Minimal.

Education-oriented.

Light mode default.

Dark mode optional.

---

End of Document.
