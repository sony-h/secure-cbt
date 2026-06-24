# 07_SECURITY_AND_MOBILE_ARCHITECTURE.md

# Secure CBT Platform

Version: 1.0

Status: Draft

---

# 1. Overview

This document defines:

* Authentication security
* Session security
* Mobile architecture
* Offline synchronization
* Anti-cheating mechanisms
* Native Android integration

The goal is not to completely eliminate cheating.

Instead, the system focuses on:

* Prevention
* Detection
* Monitoring
* Evidence

---

# 2. Security Philosophy

The system follows:

### Reliability First

Answers should never be lost.

---

### Practical Security

Perfect anti-cheating is impossible.

The objective is to discourage, detect, and monitor suspicious behavior.

---

### Progressive Enhancement

Security features are introduced gradually.

---

# 3. Authentication Architecture

---

## Access Token

Type:

JWT

Lifetime:

15 minutes

---

## Refresh Token

Type:

JWT

Lifetime:

7 days

---

## Password Hashing

Algorithm:

Argon2

---

## Session Strategy

Access Token

↓

Refresh Token

↓

Silent refresh

---

# 4. Authorization

Role-Based Access Control (RBAC)

Roles:

```text id="pmyrj7"
ADMIN

OPERATOR

TEACHER

STUDENT
```

---

Guards are implemented in NestJS.

---

# 5. Session Security

Only one active session per device.

---

Student:

```text id="0et9wk"
1 account
=
1 device
```

---

If another device logs in:

Previous session becomes invalid.

---

# 6. Device Binding

During login:

Store:

* Device ID
* Device model
* Android version

---

Purpose:

Prevent multiple simultaneous devices.

---

# 7. Warning System

Default limit:

3 warnings

---

Examples:

Warning #1

Warning #2

Warning #3

↓

Auto submit

---

Configurable through Settings.

---

# 8. Mobile Architecture

Framework:

Flutter

---

State Management:

Riverpod

---

HTTP Client:

Dio

---

Serialization:

Freezed

---

Local Database:

Drift

---

Secure Storage:

flutter_secure_storage

---

# Layer Architecture

```text id="efx8gr"
Presentation

↓

State

↓

Use Cases

↓

Repository

↓

Datasource

↓

API
```

---

# Folder Structure

```text id="1rzn54"
features/

auth

home

exam

question

result

settings

core

services

repositories

providers
```

---

# 9. Offline First Strategy

Internet should not interrupt exams.

---

Answer flow:

```text id="g1mzhm"
Student answers

↓

Local database

↓

Sync queue

↓

Server
```

---

Server remains source of truth.

---

# Connectivity States

ONLINE

OFFLINE

SYNCING

ERROR

---

# Reconnection Strategy

Connection restored

↓

Pending answers uploaded

↓

Continue exam

---

# 10. Autosave

Default interval:

5 seconds

---

Triggers:

* Next question
* Previous question
* App background
* Periodic timer

---

# 11. Session Recovery

Supports:

* Internet interruption
* App crash
* Device restart

---

Recovery flow:

```text id="l99a4w"
Student logs in

↓

Session found

↓

Restore answers

↓

Continue exam
```

---

# 12. Native Android Integration

Language:

Kotlin

---

Communication:

Platform Channels

---

Flutter handles:

UI

Navigation

State

---

Kotlin handles:

Android-specific capabilities

---

# 13. Screen Security

Uses:

FLAG_SECURE

---

Prevents:

* Screenshots
* Screen recording

---

Applied during examination only.

---

Removed after exam completion.

---

# 14. Fullscreen Mode

Enabled during exam.

---

Hide:

Navigation bar

Status bar

---

Goal:

Reduce distractions.

---

# 15. Lock Task Mode

Activated when exam starts.

---

Released when exam ends.

---

Flow:

```text id="t3w8r9"
Start Exam

↓

Lock Task Mode

↓

Exam

↓

Submit

↓

Normal Device
```

---

Purpose:

Reduce accidental app switching.

---

# 16. App Background Detection

Detect:

Home button

Recent apps

Minimize

---

Event:

APP_BACKGROUND

---

Behavior:

Generate warning.

---

# 17. Split Screen Detection

Detect:

Multi-window mode

Split screen

---

Event:

SPLIT_SCREEN

---

Behavior:

Generate warning.

---

# 18. Emulator Detection

Examples:

Bluestacks

LDPlayer

---

Behavior:

Block exam

---

Future:

Version 3

---

# 19. Root Detection

Detect rooted devices.

---

Behavior:

Block exam

---

Future:

Version 3

---

# 20. Device Integrity

Store:

Model

Manufacturer

Android version

Device identifier

---

Purpose:

Monitoring only.

---

# 21. Violation Events

Supported:

```text id="utb4nl"
APP_BACKGROUND

SPLIT_SCREEN

RECONNECTED

DISCONNECTED

AUTO_SUBMIT

SESSION_EXPIRED
```

---

Stored in:

session_logs

---

# 22. Auto Submit

Triggers:

Time expired

Warning limit exceeded

Teacher force submit

---

Flow:

```text id="6dmdr3"
Condition triggered

↓

Submit answers

↓

Generate score

↓

Close session
```

---

# 23. Teacher Monitoring

Teacher sees:

Student status

Progress

Remaining time

Warning count

Connectivity status

---

Example:

```text id="pfr38g"
🟢 Active

⚠ Warning #2

25/50 answered

18 minutes left
```

---

# 24. Realtime Events

Socket.io events:

```text id="22k5j9"
student.connected

student.disconnected

warning.triggered

answer.saved

session.finished
```

---

# 25. Future AI Proctoring

Not included in V1.

---

Possible features:

Face detection

Multiple faces

Eye movement

Audio analysis

Suspicion score

---

Target:

Version 3

---

# 26. Future Camera Snapshots

Periodic snapshots.

---

Target:

Version 3

---

# 27. Future Geolocation

Store exam location.

---

Target:

Version 3

---

# 28. Future Anti-Cheat Module

Root detection

Emulator detection

Developer mode detection

Overlay detection

Accessibility abuse detection

---

Target:

Version 3

---

# 29. Security Settings

Configurable:

Warning limit

Auto submit

Fullscreen required

Lock task mode

Autosave interval

Session timeout

---

# 30. Failure Recovery

Network failure

↓

Continue exam

↓

Reconnect

↓

Synchronize answers

---

Server failure

↓

Retry queue

↓

Recover session

---

App crash

↓

Restore state

↓

Resume session

---

# 31. Security Boundaries

The system cannot prevent:

Second phone usage

External books

Verbal communication

Human supervision remains necessary.

---

# Philosophy

The system aims to:

Prevent

Detect

Monitor

Record

rather than attempting impossible perfect security.

---

End of Document.
