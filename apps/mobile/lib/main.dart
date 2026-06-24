import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:secure_cbt_mobile/app/app.dart';
import 'package:secure_cbt_mobile/core/logger/logger.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();

  // ── Android Security Configuration ──────────────────────────
  if (Platform.isAndroid) {
    // Set preferred orientations (portrait only for exam security)
    SystemChrome.setPreferredOrientations([
      DeviceOrientation.portraitUp,
      DeviceOrientation.portraitDown,
    ]);

    // Set system UI overlay style
    SystemChrome.setSystemUIOverlayStyle(
      const SystemUiOverlayStyle(
        statusBarColor: Colors.transparent,
        statusBarIconBrightness: Brightness.dark,
        systemNavigationBarColor: Colors.black,
        systemNavigationBarIconBrightness: Brightness.light,
      ),
    );
  }

  // ── Global Error Handling ───────────────────────────────────
  FlutterError.onError = (details) {
    AppLogger.error('Flutter Error', details.exception, details.stack);
  };

  PlatformDispatcher.instance.onError = (error, stack) {
    AppLogger.error('Platform Error', error, stack);
    return true;
  };

  runApp(
    const ProviderScope(
      child: SecureCbtApp(),
    ),
  );
}
