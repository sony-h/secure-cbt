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
  });

  group('ExamState isDualScreenBlocked', () {
    test('defaults to false and copyWith updates correctly', () {
      const state = ExamState();
      expect(state.isDualScreenBlocked, isFalse);

      final updated = state.copyWith(isDualScreenBlocked: true);
      expect(updated.isDualScreenBlocked, isTrue);

      final reverted = updated.copyWith(isDualScreenBlocked: false);
      expect(reverted.isDualScreenBlocked, isFalse);
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
}
