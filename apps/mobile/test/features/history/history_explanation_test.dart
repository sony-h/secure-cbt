import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:secure_cbt_mobile/features/history/presentation/screens/history_screen.dart';
import 'package:secure_cbt_mobile/features/history/providers/history_provider.dart';

void main() {
  testWidgets('HistoryScreen displays Terkunci and shows explanation disabled snackbar when show_explanation is false', (tester) async {
    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          historyDataProvider.overrideWith((ref) => Future.value([
            {
              'id': 'sess-expl-disabled',
              'exam_title': 'Kimia Organik',
              'subject_name': 'Kimia',
              'total_score': 90.0,
              'submitted_at': '2026-11-04T10:00:00.000Z',
              'end_at': '2026-11-04T11:00:00.000Z',
              'is_exam_finished': true,
              'show_results': true,
              'show_explanation': false,
              'correct_count': 18,
              'wrong_count': 2,
            },
          ])),
        ],
        child: const MaterialApp(
          home: HistoryScreen(),
        ),
      ),
    );

    await tester.pumpAndSettle();

    // Verify 'Terkunci' pill is shown because show_explanation is false
    expect(find.text('Terkunci'), findsOneWidget);
    expect(find.text('Solusi'), findsNothing);

    // Tap the card
    await tester.tap(find.text('Kimia Organik'));
    await tester.pump();

    // Verify the snackbar informs the student that explanation is disabled
    expect(find.text('Pembahasan soal tidak diaktifkan untuk ujian ini.'), findsOneWidget);
  });

  testWidgets('HistoryScreen displays Solusi when show_explanation is true and exam is finished', (tester) async {
    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          historyDataProvider.overrideWith((ref) => Future.value([
            {
              'id': 'sess-expl-enabled',
              'exam_title': 'Biologi Sel',
              'subject_name': 'Biologi',
              'total_score': 80.0,
              'submitted_at': '2026-11-04T10:00:00.000Z',
              'end_at': '2026-11-04T11:00:00.000Z',
              'is_exam_finished': true,
              'show_results': true,
              'show_explanation': true,
              'correct_count': 16,
              'wrong_count': 4,
            },
          ])),
        ],
        child: const MaterialApp(
          home: HistoryScreen(),
        ),
      ),
    );

    await tester.pumpAndSettle();

    // Verify 'Solusi' pill is shown
    expect(find.text('Solusi'), findsOneWidget);
    expect(find.text('Terkunci'), findsNothing);
  });

  testWidgets('HistoryScreen falls back to show_results when show_explanation is null (v1.7.x backward compatibility)', (tester) async {
    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          historyDataProvider.overrideWith((ref) => Future.value([
            {
              'id': 'sess-v17x-compat',
              'exam_title': 'Fisika Mekanika v1.7',
              'subject_name': 'Fisika',
              'total_score': 88.0,
              'submitted_at': '2026-11-04T10:00:00.000Z',
              'end_at': '2026-11-04T11:00:00.000Z',
              'is_exam_finished': true,
              'show_results': true,
              // show_explanation omitted to simulate v1.7.x backend payload
              'correct_count': 22,
              'wrong_count': 3,
            },
          ])),
        ],
        child: const MaterialApp(
          home: HistoryScreen(),
        ),
      ),
    );

    await tester.pumpAndSettle();

    // Should fall back to show_results (true) and display 'Solusi'
    expect(find.text('Solusi'), findsOneWidget);
    expect(find.text('Terkunci'), findsNothing);
  });
}
