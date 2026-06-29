# Mobile Visual Design Polish Plan

> **For agentic workers:** Use subagent-driven-development. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Elevate the mobile app's visual design from functional to polished — better surfaces, animations, shadows, loading states, and screen transitions. Zero structural changes.

**Architecture:** 7 per-screen polish tasks organized by surface area. Theme refinements first, then login → home → token → exam → result → bottom nav.

**Tech Stack:** Flutter 3.22+, Material 3, Riverpod, Google Fonts Inter

## Global Constraints

- All new `Color()` values use `theme.colorScheme.*` — never `Color(0xFF...)` except semantic colors (green=correct, red=wrong, orange=upcoming)
- All animations use `Duration(milliseconds: 200)` with `Curves.easeOut` unless specified
- Shimmer/skeleton uses `Theme.of(context).colorScheme.surfaceContainerHighest` as base color
- Page transitions use `CupertinoPageTransitionsTheme` for iOS-style slide (already available, just needs wiring)
- `flutter analyze lib/` must pass with zero errors after each task
- Concentric border radius: outer widget radius = inner radius + padding

---

## Task 1: Theme & App Shell Refinements

**Files:**
- Modify: `app/app.dart`
- Modify: `core/theme/theme.dart`

- [ ] **Fix dark mode activation** — change `ThemeMode.light` to `ThemeMode.system` in `app.dart:18`

- [ ] **Add adaptive elevation via SurfaceTint**

In `AppBarTheme`, replace hardcoded shadow with M3 surface tint:
```dart
appBarTheme: AppBarTheme(
  centerTitle: true,
  elevation: 0,  // Remove hard shadow
  scrolledUnderElevation: 1,  // Show elevation when content scrolls under
  surfaceTintColor: _primaryColor.withValues(alpha: 0.08),  // Subtle tint
  backgroundColor: _surfaceColor,
  foregroundColor: Color(0xFF0F172A),
  iconTheme: IconThemeData(color: Color(0xFF0F172A)),
),
```

Same for `darkTheme` AppBarTheme:
```dart
appBarTheme: AppBarTheme(
  centerTitle: true,
  elevation: 0,
  scrolledUnderElevation: 1,
  surfaceTintColor: _primaryColor.withValues(alpha: 0.15),
  backgroundColor: Color(0xFF0F172A),
  foregroundColor: Color(0xFFF8FAFC),
),
```

- [ ] **Add page transition theme**

Add to both light and dark ThemeData:
```dart
pageTransitionsTheme: const PageTransitionsTheme(
  builders: {
    TargetPlatform.android: CupertinoPageTransitionsBuilder(),
    TargetPlatform.iOS: CupertinoPageTransitionsBuilder(),
  },
),
```

- [ ] **Add shimmer skeleton widget**

Create `core/widgets/shimmer.dart`:
```dart
import 'package:flutter/material.dart';

class ShimmerBox extends StatefulWidget {
  final double width;
  final double height;
  final double borderRadius;
  const ShimmerBox({super.key, this.width = double.infinity, required this.height, this.borderRadius = 12});

  @override
  State<ShimmerBox> createState() => _ShimmerBoxState();
}

class _ShimmerBoxState extends State<ShimmerBox> with SingleTickerProviderStateMixin {
  late AnimationController _controller;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(vsync: this, duration: const Duration(milliseconds: 1500))..repeat();
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final base = Theme.of(context).colorScheme.surfaceContainerHighest;
    final highlight = Theme.of(context).colorScheme.surfaceContainerHigh;
    return AnimatedBuilder(
      animation: _controller,
      builder: (context, child) {
        return Container(
          width: widget.width,
          height: widget.height,
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(widget.borderRadius),
            gradient: LinearGradient(
              colors: [base, highlight, base],
              transform: GradientSlide(_controller.value),
            ),
          ),
        );
      },
    );
  }
}

class GradientSlide extends GradientTransform {
  final double value;
  const GradientSlide(this.value);
  @override
  Matrix4 transform(Rect bounds, {TextDirection? textDirection}) {
    return Matrix4.translationValues(bounds.width * (value * 2 - 1), 0, 0);
  }
}
```

- [ ] **Fix remaining hardcoded colors in token_screen.dart**

Replace 8 hardcoded `Color(0xFF...)` values:
- Line 111: `Color(0xFFE2E8F0)` — border → `theme.colorScheme.outlineVariant`
- Line 124: `Color(0xFF0F172A)` — text → `theme.colorScheme.onSurface`
- Line 138: `Color(0xFF334155)` — title → `theme.colorScheme.onSurfaceVariant`
- Line 143: `Color(0xFFF8FAFC)` — card bg → `theme.colorScheme.surfaceContainerHighest`
- Line 167: `Color(0xFF334155)` — title → `theme.colorScheme.onSurfaceVariant`
- Line 175: `Color(0xFF0F172A)` — token text → `theme.colorScheme.onSurface`
- Line 190: `Color(0xFF475569)` — checkbox label → `theme.colorScheme.onSurfaceVariant`
- Line 237: `Color(0xFF475569)` — rule text → `theme.colorScheme.onSurfaceVariant`

---

## Task 2: Login Screen — Brand Lift

**Files:**
- Modify: `features/auth/presentation/screens/login_screen.dart`

- [ ] **Add animated gradient background**

```dart
// Wrap current Scaffold body with:
AnimatedContainer(
  duration: const Duration(seconds: 3),
  decoration: BoxDecoration(
    gradient: LinearGradient(
      begin: Alignment.topLeft,
      end: Alignment.bottomRight,
      colors: [
        theme.colorScheme.primary.withValues(alpha: 0.05),
        theme.colorScheme.surface,
        theme.colorScheme.surface,
      ],
    ),
  ),
  child: // existing content
)
```

- [ ] **Increase icon size and add wordmark**

Change the icon from `h-12 w-12` equivalent (48px) to 72px. Add "Secure CBT" text below:
```dart
const SizedBox(height: 24),
Text('Secure CBT', style: theme.textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.bold)),
const SizedBox(height: 4),
Text('Platform Ujian Berbasis Komputer', style: theme.textTheme.bodySmall?.copyWith(color: theme.colorScheme.onSurfaceVariant)),
```

- [ ] **Add bouncy entrance animation on card**

Wrap Card in `TweenAnimationBuilder`:
```dart
TweenAnimationBuilder<double>(
  tween: Tween(begin: 0.9, end: 1.0),
  duration: const Duration(milliseconds: 400),
  curve: Curves.easeOutBack,
  builder: (context, scale, child) => Transform.scale(scale: scale, child: child),
  child: Card(...)
)
```

- [ ] **Move form title and description inside the card for better visual grouping**

---

## Task 3: Home Screen — Richer Surfaces

**Files:**
- Modify: `features/home/presentation/screens/home_screen.dart`

- [ ] **Convert `_StatCard` from Container to Card with elevation**

```dart
Card(
  elevation: 0,
  surfaceTintColor: color.withValues(alpha: 0.08),
  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
  child: Padding(
    padding: const EdgeInsets.all(14),
    child: Column(children: [
      Icon(icon, color: color, size: 22),
      const SizedBox(height: 6),
      Text(value, style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18, color: color)),
      const SizedBox(height: 2),
      Text(label, style: TextStyle(fontSize: 10, color: theme.colorScheme.onSurfaceVariant)),
    ]),
  ),
)
```

- [ ] **Add staggered entrance animation for stat cards**

Wrap the `Row` with `TweenAnimationBuilder` or use `AnimatedOpacity` with delays:
```dart
// Instead of direct Row children, use:
for (var i = 0; i < 3; i++)
  TweenAnimationBuilder<double>(
    tween: Tween(begin: 0, end: 1),
    duration: Duration(milliseconds: 300),
    curve: Curves.easeOut,
    builder: (context, value, child) =>
        Opacity(opacity: value, child: Transform.translate(offset: Offset(0, 20 * (1 - value)), child: child)),
    child: Expanded(child: _StatCard(...)),
  )
```

- [ ] **Refine quote card with subtle gradient**

Add a subtle tint background to the quote card instead of plain surface:
```dart
AppCard(
  padding: const EdgeInsets.all(16),
  borderRadius: 12,
  borderColor: theme.colorScheme.primary.withValues(alpha: 0.1),
  child: ...
)
```

- [ ] **Refine tips banner**

Softer amber, use theme colors:
```dart
Container(
  padding: const EdgeInsets.all(14),
  decoration: BoxDecoration(
    color: Colors.amber.shade50,
    borderRadius: BorderRadius.circular(12),
    border: Border.all(color: Colors.amber.shade200),
  ),
  child: Row(children: [
    Icon(Icons.lightbulb_outline_rounded, color: Colors.amber.shade700, size: 20),
    const SizedBox(width: 10),
    Expanded(child: Text('Tips: ...', style: TextStyle(fontSize: 12, color: Colors.amber.shade900))),
  ]),
)
```

- [ ] **Add shimmer loading state for stat cards**

Replace the plain `CircularProgressIndicator` with shimmer placeholders:
```dart
if (isLoading)
  Row(children: [
    for (var i = 0; i < 3; i++) ...[
      if (i > 0) const SizedBox(width: 12),
      Expanded(child: ShimmerBox(height: 80)),
    ],
  ])
```

---

## Task 4: Token Screen — Pre-Exam Confidence

**Files:**
- Modify: `features/auth/presentation/screens/token_screen.dart`

- [ ] **Replace bullet-point rules with numbered circle icons**

```dart
// For each rule, use:
Row(
  crossAxisAlignment: CrossAxisAlignment.start,
  children: [
    CircleAvatar(
      radius: 10,
      backgroundColor: theme.colorScheme.primary.withValues(alpha: 0.1),
      child: Text('$idx', style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: theme.colorScheme.primary)),
    ),
    const SizedBox(width: 10),
    Expanded(child: Text(text, style: TextStyle(fontSize: 13, height: 1.4, color: theme.colorScheme.onSurfaceVariant))),
  ],
)
```

- [ ] **Add animated token input border pulse when empty**

Wrap the TextFormField with `TweenAnimationBuilder` that pulses the border color when `_tokenController.text.isEmpty`:
```dart
Focus(
  onFocusChange: (focused) {
    setState(() => _tokenFocused = focused);
  },
  child: AnimatedContainer(
    duration: const Duration(milliseconds: 300),
    decoration: BoxDecoration(
      borderRadius: BorderRadius.circular(12),
      border: Border.all(
        color: _tokenFocused
            ? theme.colorScheme.primary
            : _tokenController.text.isEmpty
                ? theme.colorScheme.outlineVariant
                : theme.colorScheme.primary.withValues(alpha: 0.5),
        width: _tokenFocused ? 2 : 1,
      ),
    ),
    child: TextFormField(...)
  ),
)
```

- [ ] **Replace CheckboxListTile with custom animated check**

Use the existing `Checkbox` pattern with a custom animated container for the check state.

- [ ] **All hardcoded colors already fixed in Task 1**

---

## Task 5: Exam Screen — Focus & Clarity

**Files:**
- Modify: `features/exam/presentation/screens/exam_screen.dart`
- Modify: `features/exam/presentation/widgets/exam_question_card.dart`
- Modify: `features/exam/presentation/widgets/question_palette.dart`
- Modify: `features/exam/presentation/widgets/exam_bottom_bar.dart`

- [ ] **Add gradient progress bar**

Replace `LinearProgressIndicator` with a custom gradient-filled bar:
```dart
Container(
  height: 3,
  decoration: BoxDecoration(
    borderRadius: BorderRadius.circular(1.5),
    gradient: LinearGradient(
      colors: [theme.colorScheme.primary, theme.colorScheme.secondary],
    ),
  ),
  child: FractionallySizedBox(
    alignment: Alignment.centerLeft,
    widthFactor: answered / total,
    child: Container(
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(1.5),
        gradient: LinearGradient(
          colors: [theme.colorScheme.primary, theme.colorScheme.secondary],
        ),
      ),
    ),
  ),
)
```

- [ ] **Animate timer color transition on warning threshold**

In `ExamAppBar`, wrap the timer Container with `AnimatedContainer`:
```dart
AnimatedContainer(
  duration: const Duration(milliseconds: 500),
  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
  decoration: BoxDecoration(
    color: isWarning ? theme.colorScheme.errorContainer : Colors.transparent,
    borderRadius: BorderRadius.circular(8),
  ),
  child: Text(formatTime(remainingSeconds), style: TextStyle(
    fontWeight: FontWeight.bold,
    color: isWarning ? theme.colorScheme.onErrorContainer : theme.colorScheme.onSurface,
  )),
)
```

- [ ] **Add subtle scale animation on option selection**

Wrap option text/label in `AnimatedScale` or use `AnimatedContainer`:
```dart
AnimatedContainer(
  duration: const Duration(milliseconds: 150),
  transform: Matrix4.identity()..scale(isSelected ? 1.02 : 1.0),
  decoration: BoxDecoration(...),
  child: optionContent,
)
```

- [ ] **Add question palette grid stagger entrance**

In `question_palette.dart`, wrap grid items with staggered fade-in:
```dart
for (var i = 0; i < questions.length; i++)
  TweenAnimationBuilder<double>(
    tween: Tween(begin: 0, end: 1),
    duration: Duration(milliseconds: 200),
    delay: Duration(milliseconds: i * 30),
    builder: (context, value, child) => Opacity(opacity: value, child: child),
    child: gridItem,
  )
```

- [ ] **Animate flag toggle color transition**

```dart
AnimatedContainer(
  duration: const Duration(milliseconds: 200),
  child: Icon(isFlagged ? Icons.flag_rounded : Icons.flag_outlined_rounded,
    color: isFlagged ? Colors.orange : theme.colorScheme.outline),
)
```

---

## Task 6: Result Screen — Celebration Moment

**Files:**
- Modify: `features/exam/presentation/screens/result_screen.dart`

- [ ] **Animated score circle from 0 to final value**

Wrap score percentage with `TweenAnimationBuilder`:
```dart
TweenAnimationBuilder<double>(
  tween: Tween(begin: 0, end: score / 100),
  duration: const Duration(seconds: 1),
  curve: Curves.easeOutCubic,
  builder: (context, value, child) {
    return Stack(
      alignment: Alignment.center,
      children: [
        SizedBox(
          width: 160, height: 160,
          child: CircularProgressIndicator(
            value: value,
            strokeWidth: 12,
            backgroundColor: theme.colorScheme.surfaceContainerHighest,
            valueColor: AlwaysStoppedAnimation(value >= 0.6 ? Colors.green : theme.colorScheme.error),
          ),
        ),
        Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text('${(value * 100).round()}%', style: TextStyle(fontSize: 32, fontWeight: FontWeight.bold, color: theme.colorScheme.onSurface)),
            const SizedBox(height: 4),
            Text('Nilai Akhir', style: TextStyle(fontSize: 12, color: theme.colorScheme.onSurfaceVariant)),
          ],
        ),
      ],
    );
  },
)
```

- [ ] **Add staggered metric rows**

Wrap each `_MetricRow` with:
```dart
TweenAnimationBuilder<double>(
  tween: Tween(begin: 0, end: 1),
  duration: Duration(milliseconds: 300),
  delay: Duration(milliseconds: (index + 1) * 150),
  builder: (context, value, child) =>
      Opacity(opacity: value, child: Transform.translate(offset: Offset(0, 20 * (1 - value)), child: child)),
  child: _MetricRow(...),
)
```

- [ ] **Add delayed fade-in for decorative elements**

Wrap the success icon and title with `AnimatedOpacity`:
```dart
AnimatedOpacity(
  opacity: _showContent ? 1.0 : 0.0,
  duration: const Duration(milliseconds: 400),
  child: successContent,
)
```

Use `addPostFrameCallback` to trigger `_showContent = true` after build.

---

## Task 7: Bottom Navigation — Tactile Feedback

**Files:**
- Modify: `app/widgets/scaffold_with_nav_bar.dart`

- [ ] **Add icon scale animation on tab selection**

```dart
// Wrap the NavigationDestination icon:
AnimatedScale(
  scale: isSelected ? 1.1 : 1.0,
  duration: const Duration(milliseconds: 200),
  child: Icon(icon),
)
```

- [ ] **Add heavier shadow/elevation separation from content**

Increase bottom nav elevation and use surface tint:
```dart
NavigationBar(
  elevation: 6,
  surfaceTintColor: theme.colorScheme.primary.withValues(alpha: 0.08),
  shadowColor: theme.colorScheme.shadow.withValues(alpha: 0.15),
  ...
)
```

---

## Verification

```bash
cd apps/mobile && dart analyze lib/
```

Must pass with zero errors after each task.
