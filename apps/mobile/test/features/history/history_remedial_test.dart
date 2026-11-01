import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:secure_cbt_mobile/core/widgets/status_pill.dart';

void main() {
  testWidgets('StatusPill.fromExamStatus returns Tersedia (Remedial) when isRemedial is true', (tester) async {
    final pill = StatusPill.fromExamStatus('PUBLISHED', isRemedial: true);

    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: Center(child: pill),
        ),
      ),
    );

    expect(find.text('Tersedia (Remedial)'), findsOneWidget);
  });

  testWidgets('StatusPill.fromExamStatus returns standard Tersedia when isRemedial is false', (tester) async {
    final pill = StatusPill.fromExamStatus('PUBLISHED', isRemedial: false);

    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: Center(child: pill),
        ),
      ),
    );

    expect(find.text('Tersedia'), findsOneWidget);
    expect(find.text('Tersedia (Remedial)'), findsNothing);
  });
}
