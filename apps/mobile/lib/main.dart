import 'dart:async';
import 'dart:io';
import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/date_symbol_data_local.dart';
import 'package:secure_cbt_mobile/app/app.dart';
import 'package:secure_cbt_mobile/core/logger/logger.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await initializeDateFormatting('id_ID', null);

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

  runZonedGuarded(() {
    runApp(
      const ProviderScope(
        child: SecureCbtApp(),
      ),
    );
  }, (error, stack) {
    AppLogger.error('Uncaught async error', error, stack);
  });
}
