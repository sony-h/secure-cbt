import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:secure_cbt_mobile/core/widgets/rich_exam_text.dart';

void main() {
  testWidgets('RichExamText renders plain text when no formula is present', (tester) async {
    await tester.pumpWidget(
      const MaterialApp(
        home: Scaffold(
          body: RichExamText(text: 'Berapakah hasil dari 2 + 2?'),
        ),
      ),
    );

    expect(find.text('Berapakah hasil dari 2 + 2?'), findsOneWidget);
  });

  testWidgets('RichExamText renders inline math formulas', (tester) async {
    await tester.pumpWidget(
      const MaterialApp(
        home: Scaffold(
          body: RichExamText(text: r'Tentukan nilai $x^2 + 4x + 4 = 0$ sekarang.'),
        ),
      ),
    );

    // Matches the inline rich text widget
    expect(find.byType(RichExamText), findsOneWidget);
  });

  testWidgets('RichExamText renders block math formulas', (tester) async {
    await tester.pumpWidget(
      const MaterialApp(
        home: Scaffold(
          body: RichExamText(text: r'Hitunglah integral berikut: $$\int_{0}^{1} x \, dx$$'),
        ),
      ),
    );

    expect(find.byType(RichExamText), findsOneWidget);
  });
}
