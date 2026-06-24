# 04_TECH_ARCHITECTURE.md

# Secure CBT Platform

Version: 1.0

Status: Draft

---

# 1. Architecture Overview

The system uses a modular monolith architecture.

Teacher and administrator interfaces are web-based, while students use a mobile application.

```text
Teacher Dashboard (Next.js)
Admin Dashboard (Next.js)
               │
               ▼
        NestJS Backend API
               │
 ┌─────────────┼─────────────┐
 ▼             ▼             ▼
PostgreSQL   Redis         MinIO
               │
               ▼
            BullMQ
               │
               ▼
           Socket.io
               │
               ▼
 Student Mobile App (Flutter)
               │
               ▼
      Native Kotlin Plugin
```

---

# 2. Architectural Principles

## Modular Monolith

Business domains are separated into modules.

Modules communicate internally.

No microservices are used.

---

## Event Driven

Modules communicate through events instead of tight coupling.

---

## Mobile First

Student experience is optimized for Android devices.

---

## Reliability First

Answers should never be lost.

---

## Progressive Enhancement

Complex features are introduced gradually.

---

# 3. Frontend Architecture

---

# Teacher & Admin Dashboard

Framework:

Next.js

Language:

TypeScript

Styling:

Tailwind CSS

Component Library:

Shadcn UI

State Management:

TanStack Query

Forms:

React Hook Form

Validation:

Zod

Tables:

TanStack Table

Charts:

Recharts

---

# Folder Structure

```text
src/

app/

components/

features/

auth/
students/
teachers/
subjects/
questions/
exams/
monitoring/
grading/
reports/

hooks/

services/

types/

utils/
```

---

# Architecture Pattern

Feature-based architecture.

---

# Rendering Strategy

Server Components by default.

Client Components only when necessary.

---

# 4. Backend Architecture

Framework:

NestJS

Language:

TypeScript

Architecture:

Modular Monolith

---

# Main Layers

```text
Controller
Service
Repository
Prisma
```

---

# Module Pattern

```text
Auth Module

Controller
Service
Repository
DTO
Entity
Events
```

---

# Folder Structure

```text
src/

modules/

auth/

users/

academic/

question-bank/

exam/

session/

answer/

monitoring/

grading/

report/

settings/

shared/

config/

common/

infrastructure/
```

---

# Internal Communication

Preferred:

Events

Avoid:

Direct dependencies whenever possible.

---

# 5. Database

Engine:

PostgreSQL

---

# ORM

Prisma

---

# Migration

Prisma Migrate

---

# Naming Convention

Tables:

snake_case

Columns:

snake_case

Enums:

UPPER_SNAKE_CASE

---

# Soft Delete

Use deleted_at timestamp.

---

# Audit Fields

Every entity should include:

created_at

updated_at

deleted_at

---

# 6. Cache Layer

Engine:

Redis

---

# Purposes

Session cache

Exam token cache

Presence tracking

WebSocket adapter

Temporary data

---

# Cache Strategy

Short-lived cache.

Database remains source of truth.

---

# 7. Queue System

Library:

BullMQ

---

# Queue Engine

Redis

---

# Jobs

Question import

Excel processing

PDF generation

Email sending

Report generation

Background cleanup

---

# Retry Strategy

Automatic retry enabled.

---

# 8. Storage

Engine:

MinIO

---

# Stores

Images

Attachments

Exports

Backups

---

# Benefits

S3-compatible.

Can migrate to AWS S3 later.

---

# 9. Realtime Communication

Library:

Socket.io

---

# Features

Student presence

Monitoring dashboard

Warnings

Timer synchronization

Submission events

---

# Event Examples

student.connected

student.disconnected

warning.triggered

answer.saved

exam.submitted

---

# Redis Adapter

Used for scalability.

---

# 10. Authentication

Access Token:

JWT

---

Refresh Token:

JWT

---

Password Hashing:

Argon2

---

Guards:

NestJS Guards

---

Role Based Access Control:

RBAC

---

Roles

ADMIN

OPERATOR

TEACHER

STUDENT

---

# 11. Validation

Library:

Zod

---

DTO Validation

Request Validation

Response Validation

---

# 12. Logging

Library:

Pino

---

Log Levels

info

warn

error

debug

---

Request Logging

Enabled

---

Error Logging

Enabled

---

# 13. Monitoring

Future integration:

Grafana

Prometheus

---

Health Endpoints

/api/health

---

Metrics

CPU

Memory

Response time

Queue status

---

# 14. Search

V1:

PostgreSQL Search

---

Future:

Meilisearch

---

# 15. File Upload

Library:

Multer

---

Supported Types

jpg

png

pdf

xlsx

---

Maximum Size

Configurable

---

# 16. Email

Library:

Nodemailer

---

Usage

Forgot password

Notifications

Reports

---

# 17. API Documentation

Swagger

---

Automatic generation

---

Available in:

/api/docs

---

# 18. Testing

Unit Test

Vitest

---

E2E Test

Playwright

---

Load Test

k6

---

# 19. Mobile Architecture

Framework:

Flutter

---

State Management:

Riverpod

---

Local Database:

Drift

---

HTTP Client:

Dio

---

Serialization:

Freezed

---

Connectivity:

connectivity_plus

---

Secure Storage:

flutter_secure_storage

---

# Layer Structure

```text
Presentation

State

Use Cases

Repository

Datasource

API
```

---

# Folder Structure

```text
lib/

features/

auth/

home/

exam/

question/

result/

settings/

core/

services/

models/

repositories/

providers/
```

---

# Offline Strategy

Answers stored locally.

Synchronization occurs automatically.

Server remains source of truth.

---

# 20. Native Android Integration

Language:

Kotlin

---

Communication:

Platform Channels

---

Features

FLAG_SECURE

Split-screen detection

Background detection

Lock task mode

Root detection

Emulator detection

---

Flutter handles UI.

Kotlin handles device-specific capabilities.

---

# 21. Deployment

Containerization:

Docker

---

Reverse Proxy:

Traefik

---

Environment:

Development

Staging

Production

---

# Local Development

```text
Next.js

NestJS

PostgreSQL

Redis

MinIO
```

via Docker Compose.

---

# Production

```text
Nginx / Traefik

Next.js

NestJS

PostgreSQL

Redis

MinIO
```

---

# 22. Scalability

Current Architecture Target

500–1000 concurrent students.

---

Future Growth

Vertical scaling first.

Horizontal scaling later.

---

Microservices are intentionally postponed.

---

# 23. Technology Stack Summary

## Frontend

Next.js

Tailwind CSS

Shadcn UI

TanStack Query

React Hook Form

Zod

---

## Backend

NestJS

Prisma

PostgreSQL

Redis

BullMQ

Socket.io

---

## Storage

MinIO

---

## Mobile

Flutter

Riverpod

Drift

Dio

Freezed

---

## Native Android

Kotlin

---

## Testing

Vitest

Playwright

k6

---

## Infrastructure

Docker

Traefik

---

# Architecture Philosophy

Simple.

Reliable.

Modular.

Mobile-first.

Scalable.

Maintainable.

Microservices are unnecessary until proven otherwise.

---

End of Document.
