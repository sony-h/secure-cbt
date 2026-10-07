import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:intl/date_symbol_data_local.dart';
import 'package:secure_cbt_mobile/features/exam/presentation/screens/exam_review_screen.dart';
import 'package:secure_cbt_mobile/features/exam/providers/review_provider.dart';

void main() {
  setUpAll(() async {
    TestWidgetsFlutterBinding.ensureInitialized();
    await initializeDateFormatting('id_ID', null);
  });
  testWidgets('ExamReviewScreen renders review details and explanations', (tester) async {
    final mockReviewData = {
      'exam_title': 'UTS Matematika Peminatan',
      'subject_name': 'Matematika',
      'total_score': 100,
      'correct_count': 1,
      'wrong_count': 0,
      'total_questions': 1,
      'submitted_at': '2026-10-06T10:00:00Z',
      'questions': [
        {
          'number': 1,
          'type': 'MULTIPLE_CHOICE',
          'content': 'Berapakah 2 + 2?',
          'image_url': null,
          'explanation': '2 + 2 = 4 karena sifat penjumlahan dasar.',
          'is_correct': true,
          'score': 100,
          'student_answer': 'opt-1',
          'options': [
            {'id': 'opt-1', 'content': '4', 'is_correct': true},
            {'id': 'opt-2', 'content': '5', 'is_correct': false},
          ],
        },
      ],
    };

    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          examReviewProvider('session-123').overrideWith((ref) async => mockReviewData),
        ],
        child: const MaterialApp(
          home: ExamReviewScreen(sessionId: 'session-123'),
        ),
      ),
    );

    await tester.pump();
    await tester.pumpAndSettle();

    expect(find.text('Pembahasan & Kunci Jawaban'), findsOneWidget);
    expect(find.text('UTS Matematika Peminatan'), findsOneWidget);
    expect(find.text('Berapakah 2 + 2?'), findsOneWidget);
    expect(find.text('Pembahasan Guru:'), findsOneWidget);
    expect(find.text('2 + 2 = 4 karena sifat penjumlahan dasar.'), findsOneWidget);
  });
}
