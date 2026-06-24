import 'package:logger/logger.dart';

class AppLogger {
  static final Logger _logger = Logger(
    printer: PrettyPrinter(
      methodCount: 0,
      errorMethodCount: 8,
      lineLength: 120,
      colors: true,
      printEmojis: true,
      dateTimeFormat: DateTimeFormat.onlyTimeAndSinceStart,
    ),
  );

  static void debug(String message, [dynamic error, StackTrace? stack]) {
    _logger.d('$message ${error ?? ''}', error: error, stackTrace: stack);
  }

  static void info(String message, [dynamic error, StackTrace? stack]) {
    _logger.i('$message ${error ?? ''}', error: error, stackTrace: stack);
  }

  static void warn(String message, [dynamic error, StackTrace? stack]) {
    _logger.w('$message ${error ?? ''}', error: error, stackTrace: stack);
  }

  static void error(String message, [dynamic error, StackTrace? stack]) {
    _logger.e('$message ${error ?? ''}', error: error, stackTrace: stack);
  }
}
