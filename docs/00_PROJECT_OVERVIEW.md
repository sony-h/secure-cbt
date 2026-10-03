# 00_PROJECT_OVERVIEW.md

# Secure Assessment Platform

Version: 2.0

Status: Active Development

---

# Project Overview

Secure Assessment Platform is a modern, cloud-native assessment platform built primarily for Indonesian schools (SMK/SMA).

The project starts as a secure Computer Based Test (CBT) platform and gradually evolves into a complete digital assessment ecosystem.

The primary objective of Version 1 is **not** to become the most feature-rich assessment system, but to become the most reliable smartphone-based examination platform.

Future versions will expand into analytics, competency tracking, AI-assisted assessment, and multi-school SaaS.

---

# Product Vision

Create a modern assessment platform that enables schools to conduct secure, reliable, and scalable examinations without depending on local network infrastructure.

The platform should feel like a professional SaaS product rather than a traditional school information system.

---

# Product Philosophy

The project follows several core principles.

## Reliability First

Student answers should never be lost.

Every architectural decision should prioritize reliability over convenience.

---

## Mobile First

Students primarily use Android smartphones.

The mobile application is considered the primary examination client.

---

## Simplicity Over Complexity

Choose the simplest architecture capable of solving today's problems.

Avoid unnecessary abstractions and premature optimization.

---

## Modular Growth

Build a strong foundation first.

Expand features gradually through clearly defined product versions.

---

## AI-Friendly Development

The project is designed to be developed collaboratively with AI coding assistants.

Documentation, folder structures, and coding conventions should provide enough context for AI agents to generate consistent, production-ready code.

---

# Current Development Stage

Current Version

```text
Version 1 (MVP)
```

Current Goal

```text
Ready for PTS / PAS examinations
```

Success Criteria

* Support 500 concurrent students
* Zero answer loss
* Stable offline synchronization
* Practical anti-cheating
* Smartphone-first experience

---

# Target Users

Primary Users

* Students
* Teachers
* School Operators
* School Administrators

Future Users

* Principals
* Parents
* Multi-school Administrators

---

# Technology Stack

## Frontend Dashboard

Next.js

TypeScript

Tailwind CSS

shadcn/ui

TanStack Query

---

## Backend

NestJS

TypeScript

Prisma ORM

PostgreSQL

Redis

BullMQ

Socket.io

---

## Mobile

Flutter

Riverpod

Drift

Dio

Material Design 3

Native Kotlin Plugin

---

## Infrastructure

Docker

Docker Compose

Traefik / Nginx

MinIO

---

# Repository Structure

```text
secure-assessment-platform/

apps/
    backend/
    dashboard/
    mobile/

packages/
    shared/

docs/

planning/

design/
```

---

# Monorepo Philosophy

The project uses a monorepo for development.

Advantages

* Shared TypeScript contracts
* Better AI context
* Easier dependency management
* Unified documentation
* Independent deployment

Each application is deployed independently.

Monorepo does not imply monolithic deployment.

---

# Documentation Structure

Every AI agent should understand the purpose of each document.

| Document                            | Purpose                 |
| ----------------------------------- | ----------------------- |
| 00_PROJECT_OVERVIEW                 | Project introduction    |
| 01_SYSTEM_DEFINITIONS               | Business vision & scope |
| 02_MASTER_PRD                       | Functional requirements |
| 03_UI_UX_SPECS                      | Screen definitions      |
| 04_TECH_ARCHITECTURE                | Technical architecture  |
| 05_DOMAIN_MODULES                   | Business modules        |
| 06_DATABASE_AND_API_DESIGN          | Database & REST API     |
| 07_SECURITY_AND_MOBILE_ARCHITECTURE | Security & mobile       |
| 08_ROADMAP                          | Product roadmap         |
| 09_DESIGN_SYSTEM                    | Visual language         |
| 10_UI_PATTERNS                      | Reusable UI patterns    |

---

# Version Strategy

The project evolves through four major phases.

## Version 1

Core Secure CBT

Focus

Reliable examinations.

---

## Version 2

Productivity

Focus

Analytics

Notifications

Calendar

Device Management

Teacher productivity.

---

## Version 3

Assessment Platform

Focus

Competencies

AI

Learning analytics

Advanced anti-cheating.

---

## Version 4

Multi-school SaaS

Focus

Tenants

Subscriptions

Marketplace

Platform ecosystem.

---

# Feature Priority

Every new feature should be classified into one of four categories.

P0

Critical

Required before production.

---

P1

Important

Improves usability.

---

P2

Enhancement

Adds business value.

---

P3

Experimental

Future research.

---

# Coding Philosophy

The codebase should be:

Readable.

Predictable.

Maintainable.

Consistent.

Production-ready.

Avoid clever code.

Prefer explicit code over magic.

---

# Architecture Philosophy

Business logic belongs inside domain modules.

Infrastructure should remain replaceable.

Prefer events over tight coupling.

Keep modules independent whenever possible.

Microservices are intentionally postponed.

---

# Shared Package Philosophy

The `packages/shared` directory is the contract layer between applications.

Allowed

* Enums
* Constants
* Shared Types
* Zod Schemas
* API Contracts

Avoid

* Business Logic
* Database Access
* React Components
* NestJS Services

---

# Design Philosophy

The platform should resemble a modern SaaS product.

Inspired by

* Google Classroom
* Material Design 3
* Linear
* Notion
* Stripe Dashboard

Primary Color

Indigo

Secondary Color

Blue

Focus on

* Clarity
* Accessibility
* Consistency

---

# AI Development Workflow

When implementing any feature:

Step 1

Read this document.

↓

Step 2

Read the relevant project documentation.

↓

Step 3

Understand existing architecture.

↓

Step 4

Implement according to coding conventions.

↓

Step 5

Do not introduce architectural inconsistencies.

---

# AI Context Mapping

Backend Development

Read

* 00
* 04
* 05
* 06
* 08

---

Dashboard Development

Read

* 00
* 03
* 09
* 10

---

Mobile Development

Read

* 00
* 03
* 07
* 09
* 10

---

Shared Package Development

Read

* 00
* 04
* 05
* 06

---

# Development Workflow

Recommended implementation order.

Phase 1

Backend

↓

Phase 2

Dashboard

↓

Phase 3

Mobile

↓

Phase 4

Native Android Features

↓

Phase 5

Optimization

↓

Phase 6

Future Versions

---

# Definition of Done

A feature is considered complete when:

* Business requirements are fulfilled.
* API documentation is updated.
* UI follows the Design System.
* UI follows UI Patterns.
* Loading, empty, and error states are implemented.
* Validation is complete.
* Unit tests are added where appropriate.
* Documentation is updated.

---

# Long-Term Vision

The project should evolve from a secure smartphone-based CBT application into a comprehensive digital assessment platform capable of serving multiple educational institutions while maintaining a clean architecture, consistent user experience, and excellent developer experience.

---

# Final Principle

Build less.

Build better.

Every feature should solve a real problem.

Every screen should feel intentional.

Every line of code should make the next feature easier to build.

---

End of Document.
