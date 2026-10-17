import 'package:drift/native.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:secure_cbt_mobile/core/database/local_database.dart';

void main() {
  group('LocalDatabase - getAllAnswers', () {
    late LocalDatabase db;

    setUp(() {
      db = LocalDatabase.forTesting(NativeDatabase.memory());
    });

    tearDown(() async {
      await db.close();
    });

    test('getAllAnswers returns empty map when no answers exist', () async {
      final answers = await db.getAllAnswers('session-1');
      expect(answers, isEmpty);
    });

    test('getAllAnswers returns all saved answers for the session including synced and unsynced', () async {
      await db.saveAnswer(
        sessionId: 'session-1',
        questionId: 'q-1',
        answerText: 'Jawaban 1',
      );
      await db.saveAnswer(
        sessionId: 'session-1',
        questionId: 'q-2',
        answerText: 'Jawaban 2',
      );
      // Mark q-1 as synced
      await db.markSynced('session-1_q-1');

      // Add answer for a different session
      await db.saveAnswer(
        sessionId: 'session-2',
        questionId: 'q-3',
        answerText: 'Jawaban lain',
      );

      final answers = await db.getAllAnswers('session-1');
      expect(answers, {
        'q-1': 'Jawaban 1',
        'q-2': 'Jawaban 2',
      });
    });
  });
}
