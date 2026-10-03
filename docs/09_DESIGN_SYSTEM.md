# 09_DESIGN_SYSTEM.md

# Secure CBT Platform

Version: 1.0

Status: Draft

---

# 1. Design Philosophy

Secure CBT Platform should feel like a modern SaaS application rather than a traditional school information system.

The design language should emphasize:

* Professional
* Clean
* Modern
* Trustworthy
* Calm
* Minimal
* Accessible

The UI should prioritize usability during examinations while remaining visually appealing for daily administrative tasks.

---

# 2. Design Inspiration

The visual language is inspired by:

* Google Classroom
* Material Design 3
* Linear
* Notion
* Stripe Dashboard
* Microsoft Fluent Design

Avoid:

* Skeuomorphic design
* Heavy gradients
* Neon colors
* Gaming interfaces
* Overly decorative elements

---

# 3. Brand Personality

The product should communicate:

🎓 Education

🛡 Security

⚡ Productivity

📊 Professionalism

🤝 Trust

---

# 4. Color System

## Primary Color

Indigo

```text
#4F46E5
```

Usage

* Primary Buttons
* Active Navigation
* Active Tabs
* Links
* Focus Ring
* Progress Indicator

---

## Primary Hover

```text
#4338CA
```

---

## Secondary

Blue

```text
#2563EB
```

Usage

Charts

Information

Secondary Actions

---

## Success

Green

```text
#22C55E
```

Usage

Answered

Completed

Success

Online

---

## Warning

Amber

```text
#F59E0B
```

Usage

Review

Attention

Warning Dialog

---

## Danger

Red

```text
#EF4444
```

Usage

Delete

Auto Submit

Exam Violation

Offline Critical

---

## Neutral

Slate

```text
Background

#F8FAFC

Surface

#FFFFFF

Border

#E2E8F0

Divider

#CBD5E1

Text Primary

#0F172A

Text Secondary

#64748B
```

---

# 5. Dark Mode

Background

```text
#020617
```

Surface

```text
#0F172A
```

Primary

```text
#6366F1
```

Text

```text
#F8FAFC
```

Border

```text
#334155
```

---

# 6. Typography

Font Family

Inter

Fallback

System UI

Roboto

---

Heading

32

Bold

---

Title

24

SemiBold

---

Section

20

SemiBold

---

Body

16

Regular

---

Caption

14

Regular

---

Small

12

Regular

---

Maximum font families

1

---

# 7. Spacing System

Use an 8px spacing system.

```text
4

8

16

24

32

40

48

64
```

Avoid arbitrary spacing values.

---

# 8. Border Radius

Small

8px

Medium

12px

Large

16px

Extra Large

24px

Cards should generally use:

16px

---

# 9. Shadows

Use subtle elevation.

Never heavy shadows.

Cards

Soft shadow

Dialogs

Medium shadow

Floating Buttons

Medium shadow

---

# 10. Icons

Use only one icon library.

Recommended:

Lucide Icons

Material Symbols (Flutter)

Avoid mixing icon packs.

---

# 11. Buttons

Primary

Filled Indigo

---

Secondary

Outlined

---

Danger

Filled Red

---

Text Button

Minimal

---

Loading Button

Spinner inside button

---

Disabled Button

Gray background

Gray text

---

Border Radius

12px

---

Height

48px minimum

---

# 12. Inputs

Rounded

12px

---

Label above input

Helper text below

Validation below

---

Focused

Primary Indigo Border

---

Invalid

Red Border

---

# 13. Cards

Cards should have:

White background

Rounded corners

Subtle shadow

Generous padding

16-24px

Avoid:

Colored cards unless necessary.

---

# 14. Tables (Dashboard)

Use:

Sticky Header

Pagination

Search

Filters

Bulk Actions

Row Hover

Row Selection

Status Badges

---

# 15. Status Colors

Success

Green

---

Pending

Amber

---

Draft

Gray

---

Published

Blue

---

Finished

Slate

---

Cancelled

Red

---

# 16. Charts

Preferred

Line Chart

Bar Chart

Donut Chart

Area Chart

Avoid

Pie chart overload

3D charts

Rainbow colors

---

# 17. Navigation

Dashboard

Left Sidebar

Top App Bar

Breadcrumb

---

Mobile

Bottom Navigation

Home

Exams

History

Profile

---

Exam Mode

Hide Bottom Navigation

Hide Drawer

Focus only on exam

---

# 18. Loading States

Prefer:

Skeleton Loader

Avoid:

Centered Spinner

except for full-screen loading.

---

# 19. Empty States

Each empty state should contain:

Illustration/Icon

Title

Description

Primary Action

Example

"No exams available"

"Your upcoming examinations will appear here."

---

# 20. Error States

Show:

Icon

Clear explanation

Retry button

Avoid technical error messages.

---

# 21. Animations

Animations should be subtle.

Duration

150–250 ms

Curve

Ease Out

Examples

Page transition

Fade

Scale

Slide

Avoid:

Bounce

Elastic

Overly playful effects

---

# 22. Dashboard Design

The dashboard should resemble a professional SaaS product.

Sections

Welcome Banner

Statistics Cards

Today's Exams

Analytics Charts

Recent Activity

Quick Actions

Notifications

---

# 23. Exam Design

During an examination:

Remove unnecessary UI.

Reduce cognitive load.

Large touch targets.

High readability.

No distractions.

---

# 24. Accessibility

Minimum touch target

48x48 px

Minimum contrast

WCAG AA

Support:

Dynamic font scaling

Screen readers

Keyboard navigation (Dashboard)

---

# 25. Responsive Breakpoints

Dashboard

Mobile

Tablet

Laptop

Desktop

Ultra-wide

Mobile App

Phone

Small Tablet

Large Tablet

---

# 26. Illustration Style

Simple

Flat

Minimal

Professional

Avoid cartoon illustrations.

---

# 27. Visual Consistency Rules

Every screen should follow:

Same spacing

Same typography

Same colors

Same button styles

Same iconography

Same border radius

Same interaction patterns

---

# 28. Design Principles

Consistency First

Every screen should feel part of the same product.

---

Clarity Over Decoration

Visual hierarchy is more important than effects.

---

Accessibility by Default

Every interaction should be usable by all users.

---

Performance Feels Fast

Skeleton loaders

Optimistic updates

Minimal waiting

---

Minimal Cognitive Load

Students should focus on answering questions, not understanding the interface.

---

# Final Design Vision

The platform should look like a modern productivity application designed for education.

If someone opens the application for the first time, their impression should be:

"This feels like a premium educational SaaS platform."

Not:

"This looks like an old school administration website."

---

End of Document.
