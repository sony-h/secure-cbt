import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:secure_cbt_mobile/features/exam/presentation/widgets/exam_question_card.dart';
import 'package:secure_cbt_mobile/features/exam/presentation/widgets/question_palette.dart';
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

  testWidgets('ExamQuestionCard updates draft immediately on SHORT_ANSWER and flushes on dispose before 500ms', (tester) async {
    const question = {
      'id': 'eq-short-1',
      'question': {
        'id': 'q-short-real-1',
        'type': 'SHORT_ANSWER',
        'content': 'Siapa penemu bola lampu?',
        'options': [],
      },
    };

    String draftQId = '';
    String draftAnswer = '';
    String flushedQId = '';
    String flushedAnswer = '';

    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: ExamQuestionCard(
            question: question,
            examState: const ExamState(),
            index: 0,
            onDraftChanged: (qId, answer) {
              draftQId = qId;
              draftAnswer = answer;
            },
            onSaveAnswer: (qId, answer) {
              flushedQId = qId;
              flushedAnswer = answer;
            },
            onToggleFlag: (qId) {},
          ),
        ),
      ),
    );

    // Type without waiting 500ms
    await tester.enterText(find.byType(TextFormField), 'Thomas Alva Edison');
    await tester.pump(const Duration(milliseconds: 50));

    // Draft must be updated immediately
    expect(draftQId, 'q-short-real-1');
    expect(draftAnswer, 'Thomas Alva Edison');
    expect(flushedAnswer, ''); // 500ms debounce has not fired yet

    // Unmount widget before 500ms (simulating swipe or close)
    await tester.pumpWidget(const MaterialApp(home: SizedBox()));

    // Pending save must be flushed on dispose
    expect(flushedQId, 'q-short-real-1');
    expect(flushedAnswer, 'Thomas Alva Edison');
  });

  test('computeUnansweredQuestionNumbers resolves nested question.id instead of exam_question.id', () {
    final questions = [
      {
        'id': 'eq-1',
        'position': 1,
        'question': {'id': 'q-101', 'type': 'MULTIPLE_CHOICE'},
      },
      {
        'id': 'eq-2',
        'position': 2,
        'question': {'id': 'q-102', 'type': 'SHORT_ANSWER'},
      },
      {
        'id': 'eq-3',
        'position': 3,
        'question': {'id': 'q-103', 'type': 'ESSAY'},
      },
    ];
    final answers = {
      'q-101': 'opt-a',
      'q-102': 'Nusantara',
      'q-103': 'Penjelasan lengkap esai siswa.',
    };

    final unanswered = computeUnansweredQuestionNumbers(questions, answers);
    expect(unanswered, isEmpty);
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
