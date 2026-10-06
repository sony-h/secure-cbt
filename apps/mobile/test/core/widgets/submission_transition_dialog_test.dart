import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:secure_cbt_mobile/features/exam/presentation/widgets/submission_transition_dialog.dart';

void main() {
  testWidgets('showSubmissionTransitionDialog renders clean submit transition dialog', (tester) async {
    await tester.pumpWidget(
      MaterialApp(
        home: Builder(
          builder: (context) => Scaffold(
            body: Center(
              child: ElevatedButton(
                onPressed: () {
                  showSubmissionTransitionDialog(
                    context,
                    isAutoSubmit: false,
                    durationSeconds: 5,
                  );
                },
                child: const Text('Submit'),
              ),
            ),
          ),
        ),
      ),
    );

    await tester.tap(find.text('Submit'));
    await tester.pump();

    expect(find.text('Ujian Berhasil Dikumpulkan!'), findsOneWidget);
    expect(find.textContaining('Memuat hasil ujian dalam 5 detik...'), findsOneWidget);

    // Fast-forward 2 seconds
    await tester.pump(const Duration(seconds: 2));
    expect(find.textContaining('Memuat hasil ujian dalam 3 detik...'), findsOneWidget);

    // Fast-forward remaining 3 seconds to complete
    await tester.pump(const Duration(seconds: 3));
    await tester.pumpAndSettle();

    expect(find.text('Ujian Berhasil Dikumpulkan!'), findsNothing);
  });

  testWidgets('showSubmissionTransitionDialog renders auto-submit violation dialog', (tester) async {
    await tester.pumpWidget(
      MaterialApp(
        home: Builder(
          builder: (context) => Scaffold(
            body: Center(
              child: ElevatedButton(
                onPressed: () {
                  showSubmissionTransitionDialog(
                    context,
                    isAutoSubmit: true,
                    warningCount: 3,
                    warningLimit: 3,
                    durationSeconds: 10,
                  );
                },
                child: const Text('Auto Submit'),
              ),
            ),
          ),
        ),
      ),
    );

    await tester.tap(find.text('Auto Submit'));
    await tester.pump();

    expect(find.text('Ujian Dihentikan & Dikumpulkan Otomatis!'), findsOneWidget);
    expect(find.text('Peringatan Pelanggaran: 3/3'), findsOneWidget);
    expect(find.textContaining('Membuka lembar hasil dalam 10 detik...'), findsOneWidget);

    // Fast-forward 5 seconds
    await tester.pump(const Duration(seconds: 5));
    expect(find.textContaining('Membuka lembar hasil dalam 5 detik...'), findsOneWidget);

    // Fast-forward remaining 5 seconds
    await tester.pump(const Duration(seconds: 5));
    await tester.pumpAndSettle();

    expect(find.text('Ujian Dihentikan & Dikumpulkan Otomatis!'), findsNothing);
  });
}
