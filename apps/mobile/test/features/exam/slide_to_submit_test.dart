import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:secure_cbt_mobile/features/exam/presentation/widgets/slide_to_submit.dart';

void main() {
  testWidgets('Dragging less than 85% width snaps handle back and does not trigger onSubmitted', (tester) async {
    bool submitted = false;

    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: Center(
            child: SizedBox(
              width: 300,
              child: SlideToSubmit(
                totalQuestions: 20,
                unansweredQuestions: const [],
                onSubmitted: () {
                  submitted = true;
                },
              ),
            ),
          ),
        ),
      ),
    );

    expect(find.byType(SlideToSubmit), findsOneWidget);

    // Find the draggable slider handle
    final handleFinder = find.byKey(const Key('slide_to_submit_handle'));
    expect(handleFinder, findsOneWidget);

    // Drag handle 50% across (150px)
    await tester.drag(handleFinder, const Offset(150, 0));
    await tester.pumpAndSettle();

    expect(submitted, isFalse);
  });

  testWidgets('Dragging 85% or more triggers onSubmitted callback', (tester) async {
    bool submitted = false;

    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: Center(
            child: SizedBox(
              width: 300,
              child: SlideToSubmit(
                totalQuestions: 20,
                unansweredQuestions: const [],
                onSubmitted: () {
                  submitted = true;
                },
              ),
            ),
          ),
        ),
      ),
    );

    final handleFinder = find.byKey(const Key('slide_to_submit_handle'));
    expect(handleFinder, findsOneWidget);

    // Drag handle 90% across (270px)
    await tester.drag(handleFinder, const Offset(270, 0));
    await tester.pumpAndSettle();

    expect(submitted, isTrue);
  });

  testWidgets('Renders unanswered alert card when unansweredQuestions is not empty', (tester) async {
    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: Center(
            child: SizedBox(
              width: 350,
              child: SlideToSubmit(
                totalQuestions: 20,
                unansweredQuestions: const [3, 7, 12],
                onSubmitted: () {},
              ),
            ),
          ),
        ),
      ),
    );

    expect(find.textContaining('3 Soal Belum Terjawab'), findsOneWidget);
    expect(find.textContaining('No. 3, 7, 12'), findsOneWidget);
  });
}
