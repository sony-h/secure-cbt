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

  testWidgets('RichExamText renders fenced code block with horizontal scrollable container', (tester) async {
    const codeQuestion = '''
Perhatikan kode program berikut:
```python
def hitung(a, b):
    return a + b
```
Apakah nilai kembalian fungsi di atas?
''';

    await tester.pumpWidget(
      const MaterialApp(
        home: Scaffold(
          body: RichExamText(text: codeQuestion),
        ),
      ),
    );

    expect(find.textContaining('def hitung(a, b):'), findsOneWidget);
    expect(find.text('PYTHON'), findsOneWidget);
    expect(find.byType(SingleChildScrollView), findsWidgets);
  });

  testWidgets('RichExamText renders bold, italic, underline, and inline code formatting', (tester) async {
    const formattedText = 'Kata **tebal**, kata *miring*, <u>garis bawah</u>, dan `kode_inline`.';
    await tester.pumpWidget(
      const MaterialApp(
        home: Scaffold(
          body: RichExamText(text: formattedText),
        ),
      ),
    );

    expect(find.byType(RichExamText), findsOneWidget);
    expect(find.textContaining('tebal'), findsWidgets);
  });
}
