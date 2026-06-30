import 'dart:async';
import 'dart:io';
import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';

/// Manages screen security (screenshot prevention) for exam sessions.
///
/// Android: Uses FLAG_SECURE via MethodChannel to block screenshots/recordings.
///   Enable on exam start, disable on exam end.
///
/// iOS: Screenshot prevention is not natively supported by iOS.
///   When iOS platform is added, implement screenshot detection via
///   `UIApplication.userDidTakeScreenshotNotification` in AppDelegate.swift
///   and emit a Dart event that logs a `SCREENSHOT_TAKEN` violation.
class ScreenSecurity {
  static const _channel = MethodChannel('com.securecbt.mobile/security');

  /// Stream controller for iOS screenshot notifications (reserved for future use).
  static final _screenshotController = StreamController<void>.broadcast();
  static Stream<void> get onScreenshotCaptured => _screenshotController.stream;

  static Future<void> enable() async {
    if (!Platform.isAndroid) return;
    try {
      await _channel.invokeMethod('enableSecureScreen');
    } on MissingPluginException {
      // MethodChannel not registered (e.g., during tests)
    }
  }

  static Future<void> disable() async {
    if (!Platform.isAndroid) return;
    try {
      await _channel.invokeMethod('disableSecureScreen');
    } on MissingPluginException {
      // MethodChannel not registered (e.g., during tests)
    }
  }

  /// Called by iOS native code when a screenshot is detected.
  /// Reserved for future iOS setup — wire to AppDelegate.swift when added.
  @visibleForTesting
  static void notifyScreenshotCaptured() {
    _screenshotController.add(null);
  }

  static void dispose() {
    _screenshotController.close();
  }
}
