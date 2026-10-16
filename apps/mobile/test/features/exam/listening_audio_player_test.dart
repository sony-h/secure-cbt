import 'dart:async';
import 'package:audioplayers/audioplayers.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';
import 'package:secure_cbt_mobile/core/database/database_provider.dart';
import 'package:secure_cbt_mobile/core/database/local_database.dart';
import 'package:secure_cbt_mobile/core/services/audio_cache_service.dart';
import 'package:secure_cbt_mobile/features/exam/presentation/widgets/exam_question_card.dart';
import 'package:secure_cbt_mobile/features/exam/presentation/widgets/listening_audio_player.dart';
import 'package:secure_cbt_mobile/features/exam/providers/exam_state.dart';

class MockAudioPlayer extends Mock implements AudioPlayer {}
class MockLocalDatabase extends Mock implements LocalDatabase {}
class MockAudioCacheService extends Mock implements AudioCacheService {}
class FakeSource extends Fake implements Source {}

void main() {
  setUpAll(() {
    registerFallbackValue(FakeSource());
    registerFallbackValue(Duration.zero);
  });

  late MockAudioPlayer mockAudioPlayer;
  late MockLocalDatabase mockLocalDatabase;
  late MockAudioCacheService mockAudioCacheService;

  late StreamController<Duration> durationController;
  late StreamController<Duration> positionController;
  late StreamController<PlayerState> stateController;
  late StreamController<void> completeController;

  setUp(() {
    mockAudioPlayer = MockAudioPlayer();
    mockLocalDatabase = MockLocalDatabase();
    mockAudioCacheService = MockAudioCacheService();

    durationController = StreamController<Duration>.broadcast(sync: true);
    positionController = StreamController<Duration>.broadcast(sync: true);
    stateController = StreamController<PlayerState>.broadcast(sync: true);
    completeController = StreamController<void>.broadcast(sync: true);

    when(() => mockAudioPlayer.onDurationChanged).thenAnswer((_) => durationController.stream);
    when(() => mockAudioPlayer.onPositionChanged).thenAnswer((_) => positionController.stream);
    when(() => mockAudioPlayer.onPlayerStateChanged).thenAnswer((_) => stateController.stream);
    when(() => mockAudioPlayer.onPlayerComplete).thenAnswer((_) => completeController.stream);
    when(() => mockAudioPlayer.play(any())).thenAnswer((_) async {});
    when(() => mockAudioPlayer.pause()).thenAnswer((_) async {});
    when(() => mockAudioPlayer.resume()).thenAnswer((_) async {});
    when(() => mockAudioPlayer.stop()).thenAnswer((_) async {});
    when(() => mockAudioPlayer.seek(any())).thenAnswer((_) async {});
    when(() => mockAudioPlayer.dispose()).thenAnswer((_) async {});

    when(() => mockLocalDatabase.getAudioPlaysUsed(any(), any())).thenAnswer((_) async => 0);
    when(() => mockLocalDatabase.incrementAudioPlay(any(), any())).thenAnswer((_) async => 1);

    when(() => mockAudioCacheService.getCachedAudioPathSync(any())).thenReturn(null);
    when(() => mockAudioCacheService.getCachedAudioPath(any())).thenAnswer((_) async => null);
  });

  tearDown(() {
    durationController.close();
    positionController.close();
    stateController.close();
    completeController.close();
  });

  Widget buildTestWidget({
    required String audioUrl,
    int? playLimit,
    String sessionId = 'session-123',
    String questionId = 'question-456',
    AudioPlayer? audioPlayer,
    bool isActive = true,
  }) {
    return ProviderScope(
      overrides: [
        localDatabaseProvider.overrideWithValue(mockLocalDatabase),
        audioCacheServiceProvider.overrideWithValue(mockAudioCacheService),
      ],
      child: MaterialApp(
        home: Scaffold(
          body: ListeningAudioPlayer(
            audioUrl: audioUrl,
            playLimit: playLimit,
            sessionId: sessionId,
            questionId: questionId,
            audioPlayer: audioPlayer ?? mockAudioPlayer,
            isActive: isActive,
          ),
        ),
      ),
    );
  }

  group('ListeningAudioPlayer Widget', () {
    testWidgets('badge correctly displays remaining count when plays remain', (tester) async {
      when(() => mockLocalDatabase.getAudioPlaysUsed('session-123', 'question-456'))
          .thenAnswer((_) async => 1);

      await tester.pumpWidget(
        buildTestWidget(
          audioUrl: '/audio/listening1.mp3',
          playLimit: 3,
        ),
      );
      await tester.pumpAndSettle();

      // playLimit is 3, used is 1 -> remaining is 2 -> "Sisa: 2x"
      expect(find.text('Sisa: 2x'), findsOneWidget);
      expect(find.text('Audio Stimulus'), findsOneWidget);
    });

    testWidgets('badge displays "Tanpa Batas" when playLimit is null', (tester) async {
      await tester.pumpWidget(
        buildTestWidget(
          audioUrl: '/audio/listening-unlimited.mp3',
          playLimit: null,
        ),
      );
      await tester.pumpAndSettle();

      expect(find.text('Tanpa Batas'), findsOneWidget);
      // Locked banner should not be present
      expect(find.text('Batas pemutaran audio telah habis'), findsNothing);
    });

    testWidgets('disables play button and displays locked indicator when playLimit is reached initially', (tester) async {
      when(() => mockLocalDatabase.getAudioPlaysUsed('session-123', 'question-456'))
          .thenAnswer((_) async => 2);

      await tester.pumpWidget(
        buildTestWidget(
          audioUrl: '/audio/listening-exhausted.mp3',
          playLimit: 2,
        ),
      );
      await tester.pumpAndSettle();

      // Badge displays "Batas Pemutaran Habis"
      expect(find.text('Batas Pemutaran Habis'), findsOneWidget);
      // Locked banner
      expect(find.text('Batas pemutaran audio telah habis'), findsOneWidget);
      // Lock icon on the play button
      expect(find.byIcon(Icons.lock_outline_rounded), findsOneWidget);

      // Attempting to tap the play button should do nothing
      await tester.tap(find.byKey(const Key('listening_audio_play_button')));
      await tester.pump();

      verifyNever(() => mockAudioPlayer.play(any()));
    });

    testWidgets('play button increments database count and locks on track completion', (tester) async {
      when(() => mockLocalDatabase.getAudioPlaysUsed('session-123', 'question-456'))
          .thenAnswer((_) async => 0);
      when(() => mockLocalDatabase.incrementAudioPlay('session-123', 'question-456'))
          .thenAnswer((_) async => 1);

      await tester.pumpWidget(
        buildTestWidget(
          audioUrl: '/audio/listening-track.mp3',
          playLimit: 1,
        ),
      );
      await tester.pumpAndSettle();

      expect(find.text('Sisa: 1x'), findsOneWidget);
      expect(find.byIcon(Icons.play_arrow_rounded), findsOneWidget);

      // Tap play
      await tester.tap(find.byKey(const Key('listening_audio_play_button')));
      await tester.pump();

      verify(() => mockAudioPlayer.play(any())).called(1);

      // Emit duration and position
      durationController.add(const Duration(minutes: 2, seconds: 30));
      positionController.add(const Duration(seconds: 45));
      stateController.add(PlayerState.playing);
      await tester.pump();

      expect(find.text('00:45'), findsOneWidget);
      expect(find.text('02:30'), findsOneWidget);
      expect(find.byIcon(Icons.pause_rounded), findsOneWidget);

      // Emit track completion
      completeController.add(null);
      await tester.pumpAndSettle();

      // Should have incremented DB count
      verify(() => mockLocalDatabase.incrementAudioPlay('session-123', 'question-456')).called(1);

      // UI state should now reflect exhausted limit
      expect(find.text('Batas Pemutaran Habis'), findsOneWidget);
      expect(find.text('Batas pemutaran audio telah habis'), findsOneWidget);
      expect(find.byIcon(Icons.lock_outline_rounded), findsOneWidget);

      // Tapping play button again is disabled
      await tester.tap(find.byKey(const Key('listening_audio_play_button')));
      await tester.pump();

      // Only the first play should have been executed
      verifyNever(() => mockAudioPlayer.resume());
    });

    testWidgets('pauses and resumes playback when user toggles play/pause button', (tester) async {
      await tester.pumpWidget(
        buildTestWidget(
          audioUrl: '/audio/listening.mp3',
          playLimit: 2,
        ),
      );
      await tester.pumpAndSettle();

      // Tap play
      await tester.tap(find.byKey(const Key('listening_audio_play_button')));
      await tester.pump();

      stateController.add(PlayerState.playing);
      await tester.pump();

      expect(find.byIcon(Icons.pause_rounded), findsOneWidget);

      // Tap pause
      await tester.tap(find.byKey(const Key('listening_audio_play_button')));
      await tester.pump();

      verify(() => mockAudioPlayer.pause()).called(1);

      stateController.add(PlayerState.paused);
      await tester.pump();

      expect(find.byIcon(Icons.play_arrow_rounded), findsOneWidget);

      // Tap resume
      await tester.tap(find.byKey(const Key('listening_audio_play_button')));
      await tester.pump();

      verify(() => mockAudioPlayer.resume()).called(1);
    });

    testWidgets('uses cached local audio source when available via AudioCacheService', (tester) async {
      when(() => mockAudioCacheService.getCachedAudioPathSync('/audio/local.mp3'))
          .thenReturn('/data/user/0/cache/audio_local.mp3');

      await tester.pumpWidget(
        buildTestWidget(
          audioUrl: '/audio/local.mp3',
          playLimit: 2,
        ),
      );
      await tester.pumpAndSettle();

      await tester.tap(find.byKey(const Key('listening_audio_play_button')));
      await tester.pump();

      final captured = verify(() => mockAudioPlayer.play(captureAny())).captured;
      expect(captured.first, isA<DeviceFileSource>());
      expect((captured.first as DeviceFileSource).path, '/data/user/0/cache/audio_local.mp3');
    });

    testWidgets('falls back to UrlSource when audio is not cached', (tester) async {
      when(() => mockAudioCacheService.getCachedAudioPathSync('/audio/remote.mp3'))
          .thenReturn(null);
      when(() => mockAudioCacheService.getCachedAudioPath('/audio/remote.mp3'))
          .thenAnswer((_) async => null);

      await tester.pumpWidget(
        buildTestWidget(
          audioUrl: '/audio/remote.mp3',
          playLimit: 2,
        ),
      );
      await tester.pumpAndSettle();

      await tester.tap(find.byKey(const Key('listening_audio_play_button')));
      await tester.pump();

      final captured = verify(() => mockAudioPlayer.play(captureAny())).captured;
      expect(captured.first, isA<UrlSource>());
    });

    testWidgets('seeks audio position when slider changes', (tester) async {
      await tester.pumpWidget(
        buildTestWidget(
          audioUrl: '/audio/seekable.mp3',
          playLimit: 3,
        ),
      );
      await tester.pumpAndSettle();

      durationController.add(const Duration(minutes: 1));
      positionController.add(Duration.zero);
      await tester.pump();

      expect(find.text('01:00'), findsOneWidget);

      final sliderFinder = find.byType(Slider);
      expect(sliderFinder, findsOneWidget);

      final center = tester.getCenter(sliderFinder);
      await tester.tapAt(center + const Offset(50, 0));
      await tester.pump();

      verify(() => mockAudioPlayer.seek(any())).called(greaterThanOrEqualTo(1));
    });

    testWidgets('slider is disabled when play limit is reached', (tester) async {
      when(() => mockLocalDatabase.getAudioPlaysUsed('session-123', 'question-456'))
          .thenAnswer((_) async => 2);

      await tester.pumpWidget(
        buildTestWidget(
          audioUrl: '/audio/exhausted-slider.mp3',
          playLimit: 2,
        ),
      );
      await tester.pumpAndSettle();

      final slider = tester.widget<Slider>(find.byType(Slider));
      expect(slider.onChanged, isNull);
    });

    testWidgets('prevents rewinding backward when playLimit is active', (tester) async {
      await tester.pumpWidget(
        buildTestWidget(
          audioUrl: '/audio/restricted-seek.mp3',
          playLimit: 2,
        ),
      );
      await tester.pumpAndSettle();

      durationController.add(const Duration(minutes: 2));
      positionController.add(const Duration(seconds: 40));
      stateController.add(PlayerState.playing);
      await tester.pump();

      // Tap backward (to the left of current 40s position)
      final sliderFinder = find.byType(Slider);
      final topLeft = tester.getTopLeft(sliderFinder);
      await tester.tapAt(topLeft + const Offset(10, 10));
      await tester.pump();

      // Should NOT call seek because rewinding is blocked when playLimit is set
      verifyNever(() => mockAudioPlayer.seek(any(that: predicate<Duration>((d) => d.inSeconds < 40))));
    });

    testWidgets('pauses audio playback when isActive changes from true to false', (tester) async {
      when(() => mockAudioPlayer.pause()).thenAnswer((_) async {});

      await tester.pumpWidget(
        buildTestWidget(
          audioUrl: '/audio/active-switch.mp3',
          playLimit: 2,
          isActive: true,
        ),
      );
      await tester.pumpAndSettle();

      stateController.add(PlayerState.playing);
      await tester.pump();

      // Update widget with isActive: false (simulates swiping away)
      await tester.pumpWidget(
        buildTestWidget(
          audioUrl: '/audio/active-switch.mp3',
          playLimit: 2,
          isActive: false,
        ),
      );
      await tester.pump();

      verify(() => mockAudioPlayer.pause()).called(1);
    });

    testWidgets('resets player and reloads play count when widget updates to different question', (tester) async {
      when(() => mockLocalDatabase.getAudioPlaysUsed('session-123', 'q-1'))
          .thenAnswer((_) async => 0);
      when(() => mockLocalDatabase.getAudioPlaysUsed('session-123', 'q-2'))
          .thenAnswer((_) async => 1);

      await tester.pumpWidget(
        buildTestWidget(
          audioUrl: '/audio/q1.mp3',
          playLimit: 2,
          questionId: 'q-1',
        ),
      );
      await tester.pumpAndSettle();

      expect(find.text('Sisa: 2x'), findsOneWidget);

      // Rebuild with new questionId
      await tester.pumpWidget(
        buildTestWidget(
          audioUrl: '/audio/q2.mp3',
          playLimit: 2,
          questionId: 'q-2',
        ),
      );
      await tester.pumpAndSettle();

      verify(() => mockAudioPlayer.stop()).called(1);
      expect(find.text('Sisa: 1x'), findsOneWidget);
    });

    testWidgets('formats hour durations cleanly when duration > 1 hour', (tester) async {
      await tester.pumpWidget(
        buildTestWidget(
          audioUrl: '/audio/long.mp3',
          playLimit: 2,
        ),
      );
      await tester.pumpAndSettle();

      durationController.add(const Duration(hours: 1, minutes: 15, seconds: 30));
      positionController.add(const Duration(hours: 1, minutes: 0, seconds: 5));
      await tester.pump();

      expect(find.text('01:15:30'), findsOneWidget);
      expect(find.text('01:00:05'), findsOneWidget);
    });
  });

  group('ExamQuestionCard integration with ListeningAudioPlayer', () {
    testWidgets('renders ListeningAudioPlayer when question has audio_url', (tester) async {
      const question = {
        'id': 'q-audio-1',
        'type': 'MULTIPLE_CHOICE',
        'content': 'Dengarkan audio berikut lalu jawab pertanyaan:',
        'audio_url': '/uploads/audio/listening_01.mp3',
        'audio_play_limit': 2,
        'options': [
          {'id': 'opt-1', 'content': 'Pilihan A', 'is_correct': false},
          {'id': 'opt-2', 'content': 'Pilihan B', 'is_correct': true},
        ],
      };

      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            localDatabaseProvider.overrideWithValue(mockLocalDatabase),
            audioCacheServiceProvider.overrideWithValue(mockAudioCacheService),
          ],
          child: MaterialApp(
            home: Scaffold(
              body: ExamQuestionCard(
                question: question,
                examState: const ExamState(sessionId: 'session-test'),
                index: 0,
                onSaveAnswer: (qId, answer) {},
                onToggleFlag: (qId) {},
              ),
            ),
          ),
        ),
      );
      await tester.pumpAndSettle();

      expect(find.byType(ListeningAudioPlayer), findsOneWidget);
      expect(find.text('Audio Stimulus'), findsOneWidget);
      expect(find.text('Sisa: 2x'), findsOneWidget);
      expect(find.text('Dengarkan audio berikut lalu jawab pertanyaan:'), findsOneWidget);
    });

    testWidgets('renders ListeningAudioPlayer when question has nested question.audio_url', (tester) async {
      const question = {
        'question': {
          'id': 'q-nested-audio',
          'type': 'MULTIPLE_CHOICE',
          'content': 'Soal listening nested:',
          'audio_url': '/uploads/audio/nested.mp3',
          'audio_play_limit': 3,
          'options': [],
        },
      };

      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            localDatabaseProvider.overrideWithValue(mockLocalDatabase),
            audioCacheServiceProvider.overrideWithValue(mockAudioCacheService),
          ],
          child: MaterialApp(
            home: Scaffold(
              body: ExamQuestionCard(
                question: question,
                examState: const ExamState(sessionId: 'session-test'),
                index: 0,
                onSaveAnswer: (qId, answer) {},
                onToggleFlag: (qId) {},
              ),
            ),
          ),
        ),
      );
      await tester.pumpAndSettle();

      expect(find.byType(ListeningAudioPlayer), findsOneWidget);
      expect(find.text('Sisa: 3x'), findsOneWidget);
    });

    testWidgets('does not render ListeningAudioPlayer when question has no audio_url', (tester) async {
      const question = {
        'id': 'q-no-audio',
        'type': 'MULTIPLE_CHOICE',
        'content': 'Soal tanpa audio',
        'options': [],
      };

      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            localDatabaseProvider.overrideWithValue(mockLocalDatabase),
            audioCacheServiceProvider.overrideWithValue(mockAudioCacheService),
          ],
          child: MaterialApp(
            home: Scaffold(
              body: ExamQuestionCard(
                question: question,
                examState: const ExamState(sessionId: 'session-test'),
                index: 0,
                onSaveAnswer: (qId, answer) {},
                onToggleFlag: (qId) {},
              ),
            ),
          ),
        ),
      );
      await tester.pumpAndSettle();

      expect(find.byType(ListeningAudioPlayer), findsNothing);
      expect(find.text('Audio Stimulus'), findsNothing);
    });
  });
}
