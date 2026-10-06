import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:secure_cbt_mobile/features/exam/presentation/widgets/exam_question_card.dart';
import 'package:secure_cbt_mobile/features/exam/providers/exam_state.dart';

void main() {
  testWidgets('ExamQuestionCard renders SHORT_ANSWER input', (tester) async {
    const question = {
      'id': 'q-short-1',
      'type': 'SHORT_ANSWER',
      'content': 'Ibukota negara Indonesia yang baru adalah...',
      'options': [
        {'id': 'opt-1', 'content': 'Nusantara', 'is_correct': true},
      ],
    };

    String savedAnswer = '';
    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: ExamQuestionCard(
            question: question,
            examState: const ExamState(),
            index: 0,
            onSaveAnswer: (qId, answer) {
              savedAnswer = answer;
            },
            onToggleFlag: (qId) {},
          ),
        ),
      ),
    );

    expect(find.text('Jawaban Singkat Anda'), findsOneWidget);
    expect(find.byType(TextFormField), findsOneWidget);

    await tester.enterText(find.byType(TextFormField), 'Nusantara');
    await tester.pump(const Duration(milliseconds: 600));

    expect(savedAnswer, 'Nusantara');
  });

  testWidgets('ExamQuestionCard renders MATCHING pairs input', (tester) async {
    const question = {
      'id': 'q-match-1',
      'type': 'MATCHING',
      'content': 'Jodohkan istilah hukum Newton berikut dengan maknanya:',
      'options': [
        {
          'id': 'pair-1',
          'content': '{"left":"Hukum I Newton","right":"Kelembaman"}',
          'is_correct': true,
        },
        {
          'id': 'pair-2',
          'content': '{"left":"Hukum II Newton","right":"Percepatan"}',
          'is_correct': true,
        },
      ],
    };

    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: ExamQuestionCard(
            question: question,
            examState: const ExamState(),
            index: 0,
            onSaveAnswer: (qId, answer) {},
            onToggleFlag: (qId) {},
          ),
        ),
      ),
    );

    expect(find.text('Pasangkan Jawaban'), findsOneWidget);
    expect(find.text('Hukum I Newton'), findsOneWidget);
    expect(find.text('Hukum II Newton'), findsOneWidget);
  });
}
