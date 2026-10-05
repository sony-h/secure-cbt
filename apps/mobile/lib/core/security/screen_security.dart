import 'dart:async';
import 'dart:io';
import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';

/// Manages screen security (screenshot prevention & multi-window detection) for exam sessions.
///
/// Android:
///   - Uses FLAG_SECURE via MethodChannel to block screenshots/recordings.
///   - Detects split-screen and floating pop-up window modes (isInMultiWindowMode).
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

  /// Stream controller for multi-window / split-screen changes.
  static final _multiWindowController = StreamController<bool>.broadcast();
  static Stream<bool> get onMultiWindowChanged {
    _ensureMethodCallHandler();
    return _multiWindowController.stream;
  }

  /// Stream controller for window focus changes (notification panel / status bar pulled down).
  static final _windowFocusController = StreamController<bool>.broadcast();
  static Stream<bool> get onWindowFocusChanged {
    _ensureMethodCallHandler();
    return _windowFocusController.stream;
  }

  static bool _handlerInitialized = false;

  static void _ensureMethodCallHandler() {
    if (_handlerInitialized) return;
    _handlerInitialized = true;
    _channel.setMethodCallHandler((call) async {
      switch (call.method) {
        case 'onMultiWindowChanged':
          final isMulti = call.arguments as bool? ?? false;
          _multiWindowController.add(isMulti);
          break;
        case 'onWindowFocusChanged':
          final hasFocus = call.arguments as bool? ?? true;
          _windowFocusController.add(hasFocus);
          break;
        case 'onScreenshotCaptured':
          _screenshotController.add(null);
          break;
      }
    });
  }

  static Future<void> enable() async {
    if (!Platform.isAndroid) return;
    _ensureMethodCallHandler();
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

  /// Checks if the activity is currently in split-screen / multi-window mode.
  static Future<bool> isMultiWindowMode() async {
    if (!Platform.isAndroid) return false;
    _ensureMethodCallHandler();
    try {
      final res = await _channel.invokeMethod<bool>('isMultiWindowMode');
      return res ?? false;
    } on MissingPluginException {
      return false;
    } catch (_) {
      return false;
    }
  }

  /// Called by iOS native code when a screenshot is detected.
  /// Reserved for future iOS setup — wire to AppDelegate.swift when added.
  @visibleForTesting
  static void notifyScreenshotCaptured() {
    _screenshotController.add(null);
  }

  @visibleForTesting
  static void notifyMultiWindowChanged(bool isMultiWindow) {
    _multiWindowController.add(isMultiWindow);
  }

  @visibleForTesting
  static void notifyWindowFocusChanged(bool hasFocus) {
    _windowFocusController.add(hasFocus);
  }

  static void dispose() {
    _screenshotController.close();
    _multiWindowController.close();
    _windowFocusController.close();
  }
}
