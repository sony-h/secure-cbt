import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';
import 'package:secure_cbt_mobile/core/database/database_provider.dart';
import 'package:secure_cbt_mobile/core/database/local_database.dart';
import 'package:secure_cbt_mobile/features/exam/presentation/handlers/exam_violation_handler.dart';
import 'package:secure_cbt_mobile/features/exam/providers/exam_notifier.dart';
import 'package:secure_cbt_mobile/features/exam/providers/exam_provider.dart';

class MockLocalDatabase extends Mock implements LocalDatabase {}
class MockDio extends Mock implements Dio {}

class TestContainerWidget extends ConsumerStatefulWidget {
  final Function(ExamViolationHandler handler, ExamNotifier notifier) onReady;
  const TestContainerWidget({super.key, required this.onReady});

  @override
  ConsumerState<TestContainerWidget> createState() => _TestContainerWidgetState();
}

class _TestContainerWidgetState extends ConsumerState<TestContainerWidget> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final handler = ExamViolationHandler(ref: ref, context: context);
      final notifier = ref.read(examProvider.notifier);
      widget.onReady(handler, notifier);
    });
  }

  @override
  Widget build(BuildContext context) {
    return const SizedBox.shrink();
  }
}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  late MockLocalDatabase mockDb;
  late MockDio mockDio;

  setUp(() {
    mockDb = MockLocalDatabase();
    mockDio = MockDio();
    when(() => mockDb.getPendingAnswers(any())).thenAnswer((_) async => []);
    when(() => mockDio.post(any(), data: any(named: 'data'))).thenAnswer(
      (_) async => Response(requestOptions: RequestOptions(path: ''), statusCode: 200),
    );
  });

  testWidgets('ExamViolationHandler calls syncRemainingTime and logs APP_MINIMIZED on app pause', (tester) async {
    ExamViolationHandler? capturedHandler;
    ExamNotifier? capturedNotifier;

    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          localDatabaseProvider.overrideWithValue(mockDb),
        ],
        child: MaterialApp(
          home: TestContainerWidget(
            onReady: (handler, notifier) {
              capturedHandler = handler;
              capturedNotifier = notifier;
            },
          ),
        ),
      ),
    );

    await tester.pump();
    expect(capturedHandler, isNotNull);
    expect(capturedNotifier, isNotNull);

    await capturedNotifier!.loadSession('test-session', [], 1500, mockDio);
    capturedHandler!.enable();

    // Trigger paused state
    capturedHandler!.handleLifecycleChange(AppLifecycleState.paused);

    verify(() => mockDio.post(
      '/sessions/sync-time',
      data: {
        'session_id': 'test-session',
        'remaining_time_seconds': 1500,
      },
    )).called(1);
    expect(capturedNotifier!.state.warningCount, 1);
  });
}
