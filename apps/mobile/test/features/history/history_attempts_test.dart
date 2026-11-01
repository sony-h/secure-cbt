import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:secure_cbt_mobile/features/history/presentation/screens/history_screen.dart';
import 'package:secure_cbt_mobile/features/history/providers/history_provider.dart';

void main() {
  testWidgets('HistoryScreen renders Nilai Terbaik and attempt badge for multi-attempt history', (tester) async {
    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          historyDataProvider.overrideWith((ref) => Future.value([
            {
              'id': 'sess-best-1',
              'exam_title': 'Fisika Dasar',
              'subject_name': 'Fisika',
              'total_score': 85.0,
              'best_score': 85.0,
              'is_best_attempt': true,
              'attempt_number': 2,
              'attempts_count': 2,
              'max_attempts': 3,
              'submitted_at': '2026-11-01T10:00:00.000Z',
              'end_at': '2026-11-01T12:00:00.000Z',
              'is_exam_finished': true,
              'show_results': true,
              'correct_count': 17,
              'wrong_count': 3,
            },
            {
              'id': 'sess-1',
              'exam_title': 'Fisika Dasar',
              'subject_name': 'Fisika',
              'total_score': 65.0,
              'best_score': 85.0,
              'is_best_attempt': false,
              'attempt_number': 1,
              'attempts_count': 2,
              'max_attempts': 3,
              'submitted_at': '2026-11-01T08:00:00.000Z',
              'end_at': '2026-11-01T12:00:00.000Z',
              'is_exam_finished': true,
              'show_results': true,
              'correct_count': 13,
              'wrong_count': 7,
            },
          ])),
        ],
        child: const MaterialApp(
          home: HistoryScreen(),
        ),
      ),
    );

    await tester.pumpAndSettle();

    expect(find.text('Percobaan #2'), findsOneWidget);
    expect(find.text('Percobaan #1'), findsOneWidget);
    expect(find.text('Nilai Terbaik'), findsOneWidget);
  });
}
