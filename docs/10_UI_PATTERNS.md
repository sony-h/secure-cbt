# 10_UI_PATTERNS.md

# Secure CBT Platform

Version: 1.0

Status: Draft

---

# Overview

This document defines reusable UI/UX patterns used throughout the application.

Every page should be composed from these patterns instead of creating new layouts.

Goals

* Consistency
* Predictability
* Faster Development
* Better UX
* Better AI-generated UI

---

# Pattern 01

# Dashboard Layout

Used by

* Admin
* Operator
* Teacher

---

Layout

```text
┌────────────────────────────────────────────┐
│ App Bar                                    │
├───────────────┬────────────────────────────┤
│               │                            │
│ Sidebar       │ Welcome Banner             │
│               │                            │
│               ├────────────────────────────┤
│               │ Statistic Cards            │
│               ├────────────────────────────┤
│               │ Charts                     │
│               ├────────────────────────────┤
│               │ Recent Activities          │
│               ├────────────────────────────┤
│               │ Quick Actions              │
│               │                            │
└───────────────┴────────────────────────────┘
```

---

Sections

Welcome

↓

Statistics

↓

Charts

↓

Activity

↓

Quick Actions

---

# Pattern 02

# Statistics Cards

Always displayed in one row.

Desktop

```text
Students

842
```

Tablet

2 columns

Mobile

1 column

---

Card Content

Icon

Title

Value

Small Description

Trend (optional)

---

Example

```text
👨‍🎓

Students

842

+18 this week
```

---

# Pattern 03

# CRUD Management Page

Used for

Students

Teachers

Subjects

Classes

Question Bank

---

Layout

```text
Title

Description

--------------------------------

Search

Filters

Actions

--------------------------------

Table

--------------------------------

Pagination
```

---

Actions

Create

Import

Export

Bulk Delete

---

Never place buttons randomly.

---

# Pattern 04

# Multi-Step Form

Used for

Create Exam

Create Question Bank

Import Wizard

---

Layout

```text
Step Indicator

↓

Form Section

↓

Actions
```

---

Buttons

Back

Next

Save Draft

Publish

---

# Pattern 05

# Detail Page

Used for

Student Profile

Teacher Profile

Exam Detail

Question Detail

---

Layout

```text
Header

↓

Information Card

↓

Tabs

↓

Content
```

---

Tabs Example

General

History

Statistics

Logs

---

# Pattern 06

# Data Table

Always contains

Search

Filter

Sort

Pagination

Bulk Actions

---

Desktop

Table

---

Tablet

Scrollable Table

---

Mobile

Card List

---

# Pattern 07

# Analytics Page

Sections

Statistics

↓

Charts

↓

Comparison

↓

Insights

---

Charts

Line Chart

Bar Chart

Donut Chart

Avoid

Pie chart overload

---

# Pattern 08

# Search & Filter

Layout

```text
Search

Filter

Sort

View Toggle
```

---

Search Left

Actions Right

---

# Pattern 09

# Confirmation Dialog

Used before

Delete

Submit Exam

Publish Exam

Auto Submit

---

Layout

Icon

Title

Description

Primary Button

Secondary Button

---

Primary Button

Danger only when destructive.

---

# Pattern 10

# Empty State

Layout

Illustration

↓

Title

↓

Description

↓

Primary Action

---

Example

📄

No Exams Found

Create your first examination.

[ Create Exam ]

---

# Pattern 11

# Error State

Layout

Icon

↓

Title

↓

Description

↓

Retry

---

Avoid technical messages.

---

# Pattern 12

# Skeleton Loading

Instead of spinner.

Examples

Card Skeleton

Table Skeleton

List Skeleton

Chart Skeleton

---

Use shimmer animation.

---

# Pattern 13

# Mobile Home

Layout

```text
Greeting

↓

Upcoming Exam

↓

Today's Schedule

↓

Recent Results

↓

Notifications
```

---

Bottom Navigation

Home

Exams

History

Profile

---

# Pattern 14

# Exam Instructions

Layout

Exam Information

↓

Rules

↓

Question Summary

↓

Warning Limit

↓

Start Button

---

Information

Title

Subject

Teacher

Duration

Question Count

---

Rules

Bullet list

---

# Pattern 15

# Exam Screen

The most important screen.

---

Layout

```text
────────────────────────────

Timer

Progress

Connection

────────────────────────────

Question

────────────────────────────

Choices

────────────────────────────

Bottom Actions

────────────────────────────
```

---

Header

Question Number

Remaining Time

Progress

Connection

Autosave Status

---

Body

Question

Image (future)

Options

Essay Input

---

Bottom Bar

Previous

Question Palette

Next

Submit

---

Question Palette

Bottom Sheet

Not separate page.

---

Status

Answered

Not Answered

Marked

Current

---

# Pattern 16

# Question Palette

Bottom Sheet

Grid

Example

```text
1 2 3 4

5 6 7 8

9 10 11 12
```

Legend

Green

Answered

Gray

Not Answered

Amber

Review

Blue

Current

---

# Pattern 17

# Exam Result

Layout

Celebration Icon

↓

Score

↓

Statistics

↓

Performance

↓

Actions

---

Statistics

Correct

Wrong

Skipped

Duration

Ranking (optional)

---

Buttons

Review

Back Home

---

# Pattern 18

# Profile

Sections

Avatar

↓

Information

↓

Academic

↓

Security

↓

Preferences

↓

Logout

---

# Pattern 19

# Settings

Grouped

General

Notifications

Appearance

Security

About

---

Never place settings in one long list.

---

# Pattern 20

# Notifications

Grouped by date

Unread badge

Category icon

Quick action

---

# Pattern 21

# Timeline

Used for

Exam Logs

Student Activity

Audit Logs

---

Layout

```text
09:00

Started

────────────

09:10

Warning

────────────

09:20

Reconnect
```

---

# Pattern 22

# Monitoring Dashboard

Layout

Live Statistics

↓

Student Table

↓

Realtime Timeline

↓

Alerts

---

Student Card

Avatar

Name

Progress

Timer

Warnings

Connection

---

# Pattern 23

# Responsive Behavior

Dashboard

Desktop First

Sidebar collapses on tablet.

Drawer on mobile.

---

Mobile App

Phone First

Bottom Navigation

Large Touch Targets

---

# Pattern 24

# Animation Patterns

Use

Fade

Slide

Scale

Hero

Avoid

Bounce

Rotate

Elastic

---

Duration

150–250 ms

---

# Pattern 25

# Feedback Pattern

Every action should provide feedback.

Loading

↓

Success

↓

Error

↓

Retry

---

Examples

Saving...

Saved

Sync Failed

Retrying...

---

# Pattern 26

# Accessibility Pattern

Minimum touch target

48dp

Readable typography

High contrast

Keyboard navigation (Dashboard)

Screen reader support

---

# Pattern 27

# AI Prompt Template

Every UI generation prompt should follow this structure:

---

Create the **[Screen Name]** using the Secure CBT Design System.

Requirements:

* Follow **09_DESIGN_SYSTEM.md**
* Follow **10_UI_PATTERNS.md**
* Use Material Design 3 (Flutter) or shadcn/ui (Next.js)
* Use the official Indigo + Blue color palette
* Use the 8px spacing system
* Use rounded 16px cards
* Use skeleton loading
* Include loading, empty, success, and error states
* Ensure responsive layout
* Follow accessibility best practices
* Produce production-ready code

---

# Final Philosophy

Every screen should feel like it belongs to the same ecosystem.

The user should never feel that different pages were built by different developers or AI models.

Consistency is more important than creativity.

The design system should evolve, but visual identity should remain stable.

---

End of Document.
