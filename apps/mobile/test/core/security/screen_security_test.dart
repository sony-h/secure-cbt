import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';
import 'package:secure_cbt_mobile/core/database/local_database.dart';
import 'package:secure_cbt_mobile/core/security/screen_security.dart';
import 'package:secure_cbt_mobile/features/exam/providers/exam_notifier.dart';
import 'package:secure_cbt_mobile/features/exam/providers/exam_state.dart';

class MockLocalDatabase extends Mock implements LocalDatabase {}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  group('ScreenSecurity', () {
    test('onMultiWindowChanged broadcasts updates', () async {
      final emittedValues = <bool>[];
      final subscription = ScreenSecurity.onMultiWindowChanged.listen((isMulti) {
        emittedValues.add(isMulti);
      });

      ScreenSecurity.notifyMultiWindowChanged(true);
      ScreenSecurity.notifyMultiWindowChanged(false);

      await Future.delayed(const Duration(milliseconds: 10));

      expect(emittedValues, [true, false]);
      await subscription.cancel();
    });

    test('onWindowFocusChanged broadcasts updates', () async {
      final emittedValues = <bool>[];
      final subscription = ScreenSecurity.onWindowFocusChanged.listen((hasFocus) {
        emittedValues.add(hasFocus);
      });

      ScreenSecurity.notifyWindowFocusChanged(false);
      ScreenSecurity.notifyWindowFocusChanged(true);

      await Future.delayed(const Duration(milliseconds: 10));

      expect(emittedValues, [false, true]);
      await subscription.cancel();
    });
  });

  group('ExamState isDualScreenBlocked and isFocusLostBlocked', () {
    test('defaults to false and copyWith updates correctly', () {
      const state = ExamState();
      expect(state.isDualScreenBlocked, isFalse);
      expect(state.isFocusLostBlocked, isFalse);

      final updated = state.copyWith(isDualScreenBlocked: true, isFocusLostBlocked: true);
      expect(updated.isDualScreenBlocked, isTrue);
      expect(updated.isFocusLostBlocked, isTrue);

      final reverted = updated.copyWith(isDualScreenBlocked: false, isFocusLostBlocked: false);
      expect(reverted.isDualScreenBlocked, isFalse);
      expect(reverted.isFocusLostBlocked, isFalse);
    });
  });

  group('ExamNotifier setDualScreenBlocked', () {
    late MockLocalDatabase mockDb;
    late ExamNotifier notifier;

    setUp(() {
      mockDb = MockLocalDatabase();
      notifier = ExamNotifier(mockDb);
    });

    test('setting blocked true pauses timer, updates state, and logs SPLIT_SCREEN violation', () {
      final violations = <String>[];
      notifier.setOnViolation((event, count, sessionId) {
        violations.add(event);
      });

      notifier.setDualScreenBlocked(true);

      expect(notifier.state.isDualScreenBlocked, isTrue);
      expect(notifier.state.warningCount, 1);
      expect(violations, ['SPLIT_SCREEN']);

      // Setting it to true again should be a no-op (idempotent)
      notifier.setDualScreenBlocked(true);
      expect(notifier.state.warningCount, 1);

      // Setting to false clears blocked state
      notifier.setDualScreenBlocked(false);
      expect(notifier.state.isDualScreenBlocked, isFalse);
      expect(notifier.state.warningCount, 1);
    });
  });

  group('ExamNotifier setWindowFocus', () {
    late MockLocalDatabase mockDb;
    late ExamNotifier notifier;

    setUp(() {
      mockDb = MockLocalDatabase();
      notifier = ExamNotifier(mockDb);
    });

    test('focus lost immediately blocks state and cancels without violation if restored before 1000ms', () async {
      final violations = <String>[];
      notifier.setOnViolation((event, count, sessionId) {
        violations.add(event);
      });

      notifier.setWindowFocus(false);

      expect(notifier.state.isFocusLostBlocked, isTrue);
      expect(notifier.state.warningCount, 0);

      // Fast restore before 1000ms grace period expires
      await Future.delayed(const Duration(milliseconds: 200));
      notifier.setWindowFocus(true);

      expect(notifier.state.isFocusLostBlocked, isFalse);

      // Wait past the 1000ms mark to ensure no delayed violation was fired
      await Future.delayed(const Duration(milliseconds: 900));

      expect(notifier.state.warningCount, 0);
      expect(violations, isEmpty);
    });

    test('focus lost past 1000ms logs STATUS_BAR_EXPANDED violation and requires explicit acknowledgment to unblock', () async {
      final violations = <String>[];
      notifier.setOnViolation((event, count, sessionId) {
        violations.add(event);
      });

      notifier.setWindowFocus(false);

      expect(notifier.state.isFocusLostBlocked, isTrue);
      expect(notifier.state.isFocusViolationAckPending, isFalse);
      expect(notifier.state.warningCount, 0);

      // Wait beyond the 1000ms grace period
      await Future.delayed(const Duration(milliseconds: 1100));

      expect(notifier.state.isFocusLostBlocked, isTrue);
      expect(notifier.state.isFocusViolationAckPending, isTrue);
      expect(notifier.state.warningCount, 1);
      expect(violations, ['STATUS_BAR_EXPANDED']);

      // Restoring window focus does NOT auto-dismiss the warning curtain
      notifier.setWindowFocus(true);
      expect(notifier.state.isFocusLostBlocked, isTrue);
      expect(notifier.state.isFocusViolationAckPending, isTrue);

      // Student taps "Saya Mengerti & Lanjutkan Ujian"
      notifier.acknowledgeFocusViolation();
      expect(notifier.state.isFocusLostBlocked, isFalse);
      expect(notifier.state.isFocusViolationAckPending, isFalse);
      expect(notifier.state.warningCount, 1);
    });

    test('app pause cancels focus grace timer and debounces cascading violations to prevent double warnings', () async {
      final violations = <String>[];
      notifier.setOnViolation((event, count, sessionId) {
        violations.add(event);
      });

      // 1. Android loses window focus first
      notifier.setWindowFocus(false);
      expect(notifier.state.isFocusLostBlocked, isTrue);

      // 2. Android pauses app shortly after (e.g. 100ms)
      await Future.delayed(const Duration(milliseconds: 100));
      notifier.setAppPaused(true);
      notifier.logViolation('APP_MINIMIZED');

      expect(notifier.state.warningCount, 1);
      expect(violations, ['APP_MINIMIZED']);

      // 3. Wait past the 1000ms mark when focus timer would have fired
      await Future.delayed(const Duration(milliseconds: 1100));

      // STATUS_BAR_EXPANDED should NOT have fired! Still exactly 1 violation!
      expect(notifier.state.warningCount, 1);
      expect(violations, ['APP_MINIMIZED']);
    });
  });
}
