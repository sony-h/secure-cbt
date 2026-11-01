import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:secure_cbt_mobile/core/widgets/exhausted_attempts_dialog.dart';
import 'package:secure_cbt_mobile/core/widgets/status_pill.dart';

void main() {
  testWidgets('StatusPill.fromExamAttempts returns Tersedia with attempts remaining', (tester) async {
    final pill = StatusPill.fromExamAttempts(
      status: 'PUBLISHED',
      completedAttempts: 1,
      maxAttempts: 3,
    );

    await tester.pumpWidget(MaterialApp(home: Scaffold(body: Center(child: pill))));
    expect(find.text('Tersedia (Sisa 2x)'), findsOneWidget);
  });

  testWidgets('StatusPill.fromExamAttempts returns Selesai (Batas Habis) when exhausted', (tester) async {
    final pill = StatusPill.fromExamAttempts(
      status: 'FINISHED',
      completedAttempts: 3,
      maxAttempts: 3,
    );

    await tester.pumpWidget(MaterialApp(home: Scaffold(body: Center(child: pill))));
    expect(find.text('Selesai (Batas Habis)'), findsOneWidget);
  });

  testWidgets('showExhaustedAttemptsDialog renders polite alert and closes on Mengerti tap', (tester) async {
    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: Builder(
            builder: (context) => ElevatedButton(
              onPressed: () {
                showExhaustedAttemptsDialog(
                  context: context,
                  exam: {
                    'title': 'Ujian Akhir Semester Fisika',
                    'completed_attempts': 3,
                    'effective_max_attempts': 3,
                    'best_score': 92.5,
                  },
                );
              },
              child: const Text('Open Dialog'),
            ),
          ),
        ),
      ),
    );

    await tester.tap(find.text('Open Dialog'));
    await tester.pumpAndSettle();

    expect(find.text('Batas Percobaan Habis'), findsOneWidget);
    expect(find.text('Ujian Akhir Semester Fisika'), findsOneWidget);
    expect(
      find.text('Anda telah menyelesaikan seluruh kuota pengerjaan untuk ujian ini (3/3 percobaan). Nilai terbaik Anda telah tersimpan.'),
      findsOneWidget,
    );
    expect(find.text('Nilai Terbaik: 92.5'), findsOneWidget);
    expect(find.text('Mengerti'), findsOneWidget);

    await tester.tap(find.text('Mengerti'));
    await tester.pumpAndSettle();

    expect(find.text('Batas Percobaan Habis'), findsNothing);
  });

  testWidgets('showExhaustedAttemptsDialog invokes onViewHistory on secondary button tap', (tester) async {
    bool historyTapped = false;

    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: Builder(
            builder: (context) => ElevatedButton(
              onPressed: () {
                showExhaustedAttemptsDialog(
                  context: context,
                  exam: {
                    'title': 'Ujian Akhir Semester Fisika',
                    'completed_attempts': 3,
                    'effective_max_attempts': 3,
                    'best_score': 92.5,
                  },
                  onViewHistory: () {
                    historyTapped = true;
                  },
                );
              },
              child: const Text('Open Dialog'),
            ),
          ),
        ),
      ),
    );

    await tester.tap(find.text('Open Dialog'));
    await tester.pumpAndSettle();

    expect(find.text('Lihat Riwayat'), findsOneWidget);

    await tester.tap(find.text('Lihat Riwayat'));
    await tester.pumpAndSettle();

    expect(historyTapped, isTrue);
    expect(find.text('Batas Percobaan Habis'), findsNothing);
  });
}

