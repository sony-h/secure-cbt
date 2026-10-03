# Dashboard UI/UX Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Transform the dashboard from functional-but-rough to a polished, consistent, premium-feeling SaaS experience by building missing Radix components, applying them to high-traffic pages, and adding micro-interactions.

**Architecture:** Layer 1 (component library) → Layer 2 (3 high-impact pages: Home, Students, Exams) → Layer 3 (remaining pages + polish pass). Each layer builds on the previous. Pages are refactored page-by-page with existing Radix primitives already installed in `package.json`.

**Tech Stack:** Next.js App Router, Tailwind CSS, Shadcn UI, Radix Primitives (installed but unwrapped), Lucide icons, react-hook-form + zod (installed but unused)

## Global Constraints

- All new components in `components/ui/` follow existing Shadcn patterns (CVA + `cn()` utility)
- Colors use CSS variables from `globals.css` — never hardcoded hex (except the design token reference in `09_DESIGN_SYSTEM.md`)
- All user-facing strings in Bahasa Indonesia (match existing pattern)
- Dark mode respects existing CSS variable infrastructure (`next-themes` installed, wire it)
- Concentric border radius: outer radius = inner radius + padding (per make-interfaces-feel-better skill)
- No new npm dependencies unless explicitly justified
- Scale on press: `scale(0.96)` via `active:scale-[0.96] transition-transform`
- Tabular numbers on all dynamic counters: `font-variant-numeric: tabular-nums`
- Font smoothing on root layout: `-webkit-font-smoothing: antialiased`
- Image outlines: `ring-1 ring-inset ring-black/10` (light) / `ring-white/10` (dark)
- Exit animations: subtle `translateY`, softer than enters
- No `transition: all` — specify exact properties
- `will-change` only on `transform`, `opacity`, `filter` — never `all`
- Minimum hit area 40×40px for interactive elements

---

## File Structure

### New component files
| File | Responsibility |
|------|---------------|
| `components/ui/select.tsx` | Radix Select wrapper — dropdown replaces native `<select>` |
| `components/ui/checkbox.tsx` | Radix Checkbox wrapper — replaces raw `<input type="checkbox">` |
| `components/ui/alert-dialog.tsx` | Radix AlertDialog wrapper — replaces browser `confirm()` |
| `components/ui/switch.tsx` | Radix Switch wrapper — replaces toggle button pattern in Settings |
| `components/ui/skeleton.tsx` | Loading skeleton placeholder — replaces center spinner for data-loading |
| `components/ui/avatar.tsx` | Radix Avatar with fallback initials — replaces manual initials div |
| `components/ui/dropdown-menu.tsx` | Radix DropdownMenu wrapper — replaces custom overlay in layout |
| `components/ui/progress.tsx` | Progress bar for exam progress, replaces inline styles |
| `components/ui/separator.tsx` | Visual separator for settings sections, replaces manual borders |

### Modified page files
| File | What changes |
|------|-------------|
| `app/layout.tsx` | Add font smoothing, tabular numbers to root |
| `app/globals.css` | Add dark mode data-attribute toggle, animation keyframes |
| `app/dashboard/layout.tsx` | Replace custom user dropdown with DropdownMenu, wire dark mode toggle |
| `app/login/page.tsx` | Add dark mode support, micro-interactions |
| `app/dashboard/page.tsx` | Skeleton loading states, dark mode gradient adapt, polish |
| `app/dashboard/students/page.tsx` | Replace native selects with Radix, confirm() with AlertDialog |
| `app/dashboard/teachers/page.tsx` | Same as students |
| `app/dashboard/exams/page.tsx` | Replace selects/checkboxes, add skeleton, wizard step transition animation |
| `app/dashboard/academic/page.tsx` | Replace selects/checkboxes, AlertDialog for deletes |
| `app/dashboard/questions/page.tsx` | Replace selects/checkboxes |
| `app/dashboard/settings/page.tsx` | Replace toggle buttons with Switch |
| `app/dashboard/monitoring/page.tsx` | Add progress bar component, polish stat cards |
| `app/dashboard/reports/page.tsx` | Add skeleton loading states |
| `app/dashboard/grading/page.tsx` | Replace native input with Shadcn input |

### New design tokens
| File | Responsibility |
|------|---------------|
| `components/ui/theme-toggle.tsx` | Dark mode toggle button (sun/moon icon) |

---

## Layer 1 — Component Library Foundation

### Task 1: Build Select component

**Files:**
- Create: `apps/dashboard/src/components/ui/select.tsx`

**Produces:** `Select`, `SelectTrigger`, `SelectContent`, `SelectItem` — Radix-based dropdown matching Shadcn pattern.

```typescript
'use client';

import * as SelectPrimitive from '@radix-ui/react-select';
import { cn } from '@/lib/utils';
import { ChevronDown } from 'lucide-react';

export function Select({ children, ...props }: SelectPrimitive.SelectProps) {
  return <SelectPrimitive.Root {...props}>{children}</SelectPrimitive.Root>;
}

export function SelectTrigger({ className, children, ...props }: SelectPrimitive.SelectTriggerProps) {
  return (
    <SelectPrimitive.Trigger
      className={cn(
        'flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1',
        className,
      )}
      {...props}
    >
      {children}
      <SelectPrimitive.Icon asChild>
        <ChevronDown className="h-4 w-4 opacity-50" />
      </SelectPrimitive.Icon>
    </SelectPrimitive.Trigger>
  );
}

export function SelectContent({ className, children, position = 'popper', ...props }: SelectPrimitive.SelectContentProps) {
  return (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Content
        className={cn(
          'relative z-50 max-h-96 min-w-[8rem] overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',
          position === 'popper' && 'data-[side=bottom]:translate-y-1 data-[side=left]:-translate-x-1 data-[side=right]:translate-x-1 data-[side=top]:-translate-y-1',
          className,
        )}
        position={position}
        {...props}
      >
        <SelectPrimitive.Viewport
          className={cn('p-1', position === 'popper' && 'h-[var(--radix-select-trigger-height)] w-full min-w-[var(--radix-select-trigger-width)]')}
        >
          {children}
        </SelectPrimitive.Viewport>
      </SelectPrimitive.Content>
    </SelectPrimitive.Portal>
  );
}

export function SelectItem({ className, children, ...props }: SelectPrimitive.SelectItemProps) {
  return (
    <SelectPrimitive.Item
      className={cn(
        'relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
        className,
      )}
      {...props}
    >
      <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
        <SelectPrimitive.ItemIndicator>
          <div className="h-2 w-2 rounded-full bg-primary" />
        </SelectPrimitive.ItemIndicator>
      </span>
      <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
    </SelectPrimitive.Item>
  );
}
export const SelectValue = SelectPrimitive.Value;
```

### Task 2: Build Checkbox component

**Files:**
- Create: `apps/dashboard/src/components/ui/checkbox.tsx`

```typescript
'use client';

import * as CheckboxPrimitive from '@radix-ui/react-checkbox';
import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';

export function Checkbox({ className, ...props }: CheckboxPrimitive.CheckboxProps) {
  return (
    <CheckboxPrimitive.Root
      className={cn(
        'peer h-4 w-4 shrink-0 rounded-sm border border-primary ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground',
        className,
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator className={cn('flex items-center justify-center text-current')}>
        <Check className="h-4 w-4" />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );
}
```

### Task 3: Build AlertDialog component

**Files:**
- Create: `apps/dashboard/src/components/ui/alert-dialog.tsx`

Build standard Radix AlertDialog wrapper with: `AlertDialog`, `AlertDialogTrigger`, `AlertDialogContent`, `AlertDialogHeader`, `AlertDialogTitle`, `AlertDialogDescription`, `AlertDialogFooter`, `AlertDialogAction`, `AlertDialogCancel`.

Follow the exact same pattern as the existing `dialog.tsx` but styled for destructive confirmation (red cancel button variant).

### Task 4: Build Switch component

**Files:**
- Create: `apps/dashboard/src/components/ui/switch.tsx`

```typescript
'use client';

import * as SwitchPrimitives from '@radix-ui/react-switch';
import { cn } from '@/lib/utils';

export function Switch({ className, ...props }: SwitchPrimitives.SwitchProps) {
  return (
    <SwitchPrimitives.Root
      className={cn(
        'peer inline-flex h-[24px] w-[44px] shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary data-[state=unchecked]:bg-input',
        className,
      )}
      {...props}
    >
      <SwitchPrimitives.Thumb
        className={cn(
          'pointer-events-none block h-5 w-5 rounded-full bg-background shadow-lg ring-0 transition-transform data-[state=checked]:translate-x-5 data-[state=unchecked]:translate-x-0',
        )}
      />
    </SwitchPrimitives.Root>
  );
}
```

### Task 5: Build Skeleton component

**Files:**
- Create: `apps/dashboard/src/components/ui/skeleton.tsx`

```typescript
import { cn } from '@/lib/utils';

export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('animate-pulse rounded-md bg-muted', className)} {...props} />;
}
```

### Task 6: Build Avatar and DropdownMenu components

**Files:**
- Create: `apps/dashboard/src/components/ui/avatar.tsx`
- Create: `apps/dashboard/src/components/ui/dropdown-menu.tsx`
- Create: `apps/dashboard/src/components/ui/progress.tsx`
- Create: `apps/dashboard/src/components/ui/separator.tsx`

### Task 7: Add dark mode theme toggle and wire infrastructure

**Files:**
- Modify: `apps/dashboard/src/app/layout.tsx`
- Modify: `apps/dashboard/src/app/globals.css`
- Create: `apps/dashboard/src/components/ui/theme-toggle.tsx`
- Modify: `apps/dashboard/src/app/dashboard/layout.tsx`

- [ ] **Add font smoothing + tabular numbers to root layout**

```typescript
// app/layout.tsx — add to className on html/body:
className={`${inter.variable} antialiased`}  // antialiased = font smoothing
// Add to globals.css:
html { -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale; font-variant-numeric: tabular-nums; }
```

- [ ] **Enable next-themes in layout.tsx**

```typescript
// app/layout.tsx — wrap providers:
<ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
  {children}
</ThemeProvider>
```

- [ ] **Wire dark mode CSS variables** (already defined in globals.css `.dark` selector, just ensure they're active via class-based dark mode)

- [ ] **Create ThemeToggle component**

```typescript
'use client';

import { useTheme } from 'next-themes';
import { Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useEffect, useState } from 'react';

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  if (!mounted) return <div className="h-9 w-9" />; // Avoid hydration mismatch
  return (
    <Button variant="ghost" size="icon" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
      {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
    </Button>
  );
}
```

- [ ] **Add ThemeToggle to dashboard layout header** (next to notification bell)

- [ ] **Replace custom user menu dropdown with DropdownMenu component**

- [ ] **Add `next-themes` provider** import to dashboard layout if not already there

---

## Layer 2 — High-Impact Pages

### Task 8: Refactor Dashboard Home page

**Files:**
- Modify: `apps/dashboard/src/app/dashboard/page.tsx`

- [ ] **Replace center Spinner with Skeleton placeholders** for stat cards, chart, and exam list

```typescript
// While loading:
<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
  {Array.from({ length: 4 }).map((_, i) => (
    <div key={i} className="rounded-xl border bg-card p-6">
      <Skeleton className="h-4 w-24 mb-2" />
      <Skeleton className="h-8 w-16" />
    </div>
  ))}
</div>
```

- [ ] **Add transition on hover** to stat cards

```typescript
// Add to gradient stat cards:
className="transition-all duration-200 hover:scale-[1.02] hover:shadow-lg"
```

- [ ] **Add empty state** for exam list when no exams exist

### Task 9: Refactor Students page (and Teachers)

**Files:**
- Modify: `apps/dashboard/src/app/dashboard/students/page.tsx`
- Modify: `apps/dashboard/src/app/dashboard/teachers/page.tsx`
- Modify: `apps/dashboard/src/app/dashboard/questions/page.tsx` (Question modal uses selects)

For each page:

- [ ] **Replace native `<select>` with `Select` component**

Before:
```tsx
<select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
  {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
</select>
```

After:
```tsx
<Select value={value} onValueChange={onChange}>
  <SelectTrigger><SelectValue placeholder="Pilih..." /></SelectTrigger>
  <SelectContent>
    {options.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
  </SelectContent>
</Select>
```

- [ ] **Replace raw `<input type="checkbox">` with Checkbox component**

- [ ] **Replace browser `confirm()` with AlertDialog**

Before:
```tsx
onClick={() => { if (confirm('Yakin ingin menghapus?')) handleDelete(id); }}
```

After:
```tsx
<AlertDialog>
  <AlertDialogTrigger asChild>
    <Button variant="ghost" size="icon"><Trash2 className="h-4 w-4" /></Button>
  </AlertDialogTrigger>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>Hapus Siswa</AlertDialogTitle>
      <AlertDialogDescription>Yakin ingin menghapus siswa ini?</AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel>Batal</AlertDialogCancel>
      <AlertDialogAction onClick={handleDelete}>Hapus</AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

### Task 10: Refactor Exams page

**Files:**
- Modify: `apps/dashboard/src/app/dashboard/exams/page.tsx`

- [ ] **Replace native selects/checkboxes** in the multi-step wizard with Select and Checkbox

- [ ] **Add step transition animation** to wizard steps (staggered fade-in on step change)

```typescript
// Wrap step content:
<div key={step} className="animate-in fade-in slide-in-from-right-4 duration-200">
  <StepContent />
</div>
```

- [ ] **Add skeleton loading** for data table fetch

- [ ] **Apply concentric border radius** to step indicator circles: outer circle = step indicator (inner), step number = inner, padding between

### Task 11: Refactor Settings page

**Files:**
- Modify: `apps/dashboard/src/app/dashboard/settings/page.tsx`

- [ ] **Replace `SettingToggle` button with Switch component**

```typescript
// Instead of:
<Button variant={value ? 'default' : 'outline'}>{value ? 'Aktif' : 'Nonaktif'}</Button>

// Use:
<div className="flex items-center gap-3">
  <Switch checked={value} onCheckedChange={setValue} />
  <span className="text-sm text-muted-foreground">{value ? 'Aktif' : 'Nonaktif'}</span>
</div>
```

- [ ] **Add Separator** between number settings and toggle settings sections

- [ ] **Add Skeleton** loading during settings fetch

---

## Layer 3 — Polish & Remaining Pages

### Task 12: Apply scale-on-press to all buttons

**Files:** `apps/dashboard/src/components/ui/button.tsx`

- [ ] **Add `active:scale-[0.96]` transition** to button variants

```typescript
// In the button CVA definition, add to each variant's className:
className: cn(
  'inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-all duration-200 active:scale-[0.96] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
  ...
)
```

### Task 13: Apply concentric border radius audit

**Files:** All component and page files

- [ ] **Audit nested rounded elements** and fix mismatched radii

| Location | Fix |
|----------|-----|
| Card (`rounded-xl`) + inner Button with padding (`p-2`) | Card `rounded-2xl` (`16px`), inner button `rounded-lg` (`8px`) |
| Modal content (`rounded-lg`) + inner input | Content `rounded-xl`, input `rounded-lg` |
| Cards with card-inside-card | Outer: `rounded-2xl`, inner card: `rounded-xl` |

### Task 14: Academic page refactor

**Files:**
- Modify: `apps/dashboard/src/app/dashboard/academic/page.tsx`

- [ ] **Replace native selects** with Select component (major/year dropdowns in ClassDialog)
- [ ] **Replace confirm() deletes** with AlertDialog
- [ ] **Replace raw checkboxes** with Checkbox component (is_active toggle in YearDialog)

### Task 15: Monitoring page polish

**Files:**
- Modify: `apps/dashboard/src/app/dashboard/monitoring/page.tsx`

- [ ] **Replace inline progress bar with Progress component**
- [ ] **Add skeleton loading** for stat cards
- [ ] **Fix student stat card duplication** — use the shared card pattern

### Task 16: Header search bar and notification fix

**Files:**
- Modify: `apps/dashboard/src/app/dashboard/layout.tsx`

- [ ] **Remove faux search bar** or make it functional with a simple client-side filter
- [ ] **Replace hardcoded notification badge** value with placeholder `0` and add a TODO comment
- [ ] **Add Avatar** component for user profile circle instead of manual initials div

### Task 17: Background transitions and enter animations

**Files:**
- Modify: `apps/dashboard/src/app/globals.css`

- [ ] **Add page transition keyframes**

```css
@keyframes fade-in {
  from { opacity: 0; transform: translateY(4px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes scale-in {
  from { opacity: 0; transform: scale(0.95); }
  to { opacity: 1; transform: scale(1); }
}

.animate-fade-in {
  animation: fade-in 0.2s ease-out;
}

.animate-scale-in {
  animation: scale-in 0.2s ease-out;
}
```

- [ ] **Add `animate-fade-in`** to main content area in dashboard layout

### Task 18: Image outlines for any images

**Files:** `apps/dashboard/src/app/globals.css`

```css
img {
  @apply ring-1 ring-inset ring-black/10 dark:ring-white/10;
}
```

### Task 19: Tabular numbers root config

**Files:** `apps/dashboard/src/app/globals.css`

- [ ] **Ensure already set** from Task 7. Verify tabular-nums is applied.

### Task 20: Empty/error state illustrations

**Files:**
- Modify: `apps/dashboard/src/app/dashboard/page.tsx`
- Modify: `apps/dashboard/src/app/dashboard/exams/page.tsx`
- Modify: `apps/dashboard/src/app/dashboard/monitoring/page.tsx`

- [ ] **Add consistent EmptyState component** for zero-data scenarios across pages

---

## Verification

```bash
cd apps/dashboard && npx tsc --noEmit
cd apps/dashboard && npx next lint
```

All typechecks and lint must pass with zero errors.
