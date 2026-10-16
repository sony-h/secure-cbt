import 'package:drift/native.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:secure_cbt_mobile/core/database/local_database.dart';

void main() {
  group('LocalDatabase - QuestionAudioPlays', () {
    late LocalDatabase db;

    setUp(() {
      db = LocalDatabase.forTesting(NativeDatabase.memory());
    });

    tearDown(() async {
      await db.close();
    });

    test('getAudioPlaysUsed returns 0 when no plays recorded', () async {
      final plays = await db.getAudioPlaysUsed('session-1', 'question-1');
      expect(plays, 0);
    });

    test('incrementAudioPlay increments play count and persists', () async {
      final count1 = await db.incrementAudioPlay('session-1', 'question-1');
      expect(count1, 1);

      final count2 = await db.incrementAudioPlay('session-1', 'question-1');
      expect(count2, 2);

      final verified = await db.getAudioPlaysUsed('session-1', 'question-1');
      expect(verified, 2);
    });

    test('audio plays are isolated across different questions and sessions', () async {
      await db.incrementAudioPlay('session-1', 'question-1');
      await db.incrementAudioPlay('session-1', 'question-1');
      await db.incrementAudioPlay('session-1', 'question-2');
      await db.incrementAudioPlay('session-2', 'question-1');

      expect(await db.getAudioPlaysUsed('session-1', 'question-1'), 2);
      expect(await db.getAudioPlaysUsed('session-1', 'question-2'), 1);
      expect(await db.getAudioPlaysUsed('session-2', 'question-1'), 1);
      expect(await db.getAudioPlaysUsed('session-2', 'question-2'), 0);
    });
  });
}
