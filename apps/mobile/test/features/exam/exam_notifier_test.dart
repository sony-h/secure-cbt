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

  test('loadSession preserves initialAnswers and warningCount', () async {
    final questions = [
      {'id': 'q-1', 'position': 1},
      {'id': 'q-2', 'position': 2},
    ];
    final initialAnswers = {'q-1': 'Jawaban A', 'q-2': 'Jawaban B'};

    await notifier.loadSession(
      'session-123',
      questions,
      1800,
      mockDio,
      initialAnswers: initialAnswers,
      warningCount: 2,
    );

    expect(notifier.state.answers, initialAnswers);
    expect(notifier.state.warningCount, 2);
    expect(notifier.state.remainingSeconds, 1800);
  });

  test('loadSession with autoSubmitImmediately triggers onForceSubmit', () async {
    bool forceSubmitCalled = false;
    notifier.setOnForceSubmit(() {
      forceSubmitCalled = true;
    });

    await notifier.loadSession(
      'session-123',
      [],
      1800,
      mockDio,
      autoSubmitImmediately: true,
    );

    expect(forceSubmitCalled, isTrue);
  });

  test('syncRemainingTime posts remaining_time_seconds to /sessions/sync-time', () async {
    when(() => mockDio.post(any(), data: any(named: 'data'))).thenAnswer(
      (_) async => Response(requestOptions: RequestOptions(path: ''), statusCode: 200),
    );

    await notifier.loadSession('session-xyz', [], 1234, mockDio);
    await notifier.syncRemainingTime();

    verify(() => mockDio.post(
      '/sessions/sync-time',
      data: {
        'session_id': 'session-xyz',
        'remaining_time_seconds': 1234,
      },
    )).called(1);
  });
}
