import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';
import 'package:secure_cbt_mobile/core/database/local_database.dart';
import 'package:secure_cbt_mobile/features/exam/providers/exam_notifier.dart';

class MockLocalDatabase extends Mock implements LocalDatabase {}
class MockDio extends Mock implements Dio {}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  late MockLocalDatabase mockDb;
  late MockDio mockDio;
  late ExamNotifier notifier;

  setUp(() {
    mockDb = MockLocalDatabase();
    mockDio = MockDio();
    when(() => mockDb.getPendingAnswers(any())).thenAnswer((_) async => []);
    notifier = ExamNotifier(mockDb);
  });

  tearDown(() {
    notifier.dispose();
  });

  test('reopenSession restores isSubmitted to false, timer, and warnings to 0', () async {
    await notifier.loadSession(
      'session-123',
      [
        {'id': 'q-1', 'position': 1},
      ],
      1200,
      mockDio,
      warningCount: 3,
    );

    // Student submits or gets auto-submitted
    notifier.markSubmitted();
    expect(notifier.state.isSubmitted, isTrue);

    // Proctor reopens session with 900 seconds remaining
    notifier.reopenSession(remainingSeconds: 900, warningCount: 0);

    expect(notifier.state.isSubmitted, isFalse);
    expect(notifier.state.remainingSeconds, 900);
    expect(notifier.state.warningCount, 0);
    expect(notifier.state.violations, isEmpty);
    expect(notifier.state.isFullscreen, isTrue);
  });
}
