import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:secure_cbt_mobile/features/exam/providers/exam_provider.dart';

class ExamViolationHandler {
  final WidgetRef ref;
  final BuildContext context;
  bool _violationsEnabled = false;
  bool _violationPending = false;

  ExamViolationHandler({required this.ref, required this.context});

  void enable() {
    _violationsEnabled = true;
  }

  void handleLifecycleChange(AppLifecycleState state) {
    if (!_violationsEnabled) return;
    final notifier = ref.read(examProvider.notifier);
    switch (state) {
      case AppLifecycleState.paused:
      case AppLifecycleState.hidden:
        notifier.setAppPaused(true);
        notifier.pauseTimer();
        if (!_violationPending) {
          _violationPending = true;
          notifier.logViolation('APP_MINIMIZED');
        }
        break;
      case AppLifecycleState.resumed:
        if (_violationPending) {
          _violationPending = false;
          notifier.setAppPaused(false);
          notifier.triggerWarningOverlay('APP_MINIMIZED');
        } else {
          notifier.setAppPaused(false);
          notifier.resumeTimer();
        }
        SystemChrome.setEnabledSystemUIMode(SystemUiMode.immersiveSticky);
        break;
      case AppLifecycleState.inactive:
      case AppLifecycleState.detached:
        break;
    }
  }
}
