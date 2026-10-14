import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:intl/date_symbol_data_local.dart';
import 'package:secure_cbt_mobile/features/exam/presentation/screens/result_screen.dart';
import 'package:secure_cbt_mobile/features/exam/presentation/screens/exam_review_screen.dart';
import 'package:secure_cbt_mobile/features/exam/providers/result_provider.dart';
import 'package:secure_cbt_mobile/features/exam/providers/review_provider.dart';

void main() {
  setUpAll(() async {
    TestWidgetsFlutterBinding.ensureInitialized();
    await initializeDateFormatting('id_ID', null);
  });

  testWidgets('ResultScreen renders dual scoring (raw points earned and possible)', (tester) async {
    final mockResultData = {
      'exam_title': 'Ujian Acak Biologi',
      'total_score': 85.0,
      'raw_points_earned': 46.0,
      'raw_points_possible': 54.0,
      'correct_count': 26,
      'wrong_count': 4,
    };

    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          examResultProvider('session-pool-1').overrideWith((ref) async => mockResultData),
        ],
        child: const MaterialApp(
          home: ResultScreen(sessionId: 'session-pool-1'),
        ),
      ),
    );

    await tester.pump();
    await tester.pumpAndSettle();

    expect(find.text('Lembar Hasil Ujian'), findsOneWidget);
    expect(find.text('Total Poin Diperoleh'), findsOneWidget);
    expect(find.text('46 / 54 Poin'), findsOneWidget);
  });

  testWidgets('ExamReviewScreen renders raw points chip when available', (tester) async {
    final mockReviewData = {
      'exam_title': 'Ujian Acak Biologi',
      'subject_name': 'Biologi',
      'total_score': 85.0,
      'raw_points_earned': 46.0,
      'raw_points_possible': 54.0,
      'correct_count': 26,
      'wrong_count': 4,
      'total_questions': 30,
      'submitted_at': '2026-10-14T10:00:00Z',
      'questions': [],
    };

    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          examReviewProvider('session-pool-1').overrideWith((ref) async => mockReviewData),
        ],
        child: const MaterialApp(
          home: ExamReviewScreen(sessionId: 'session-pool-1'),
        ),
      ),
    );

    await tester.pump();
    await tester.pumpAndSettle();

    expect(find.text('46 / 54 Poin'), findsOneWidget);
  });
}
