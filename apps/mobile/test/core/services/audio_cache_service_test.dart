import 'dart:io';
import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';
import 'package:secure_cbt_mobile/core/services/audio_cache_service.dart';

class MockDio extends Mock implements Dio {}

void main() {
  late MockDio mockDio;
  late Directory tempDir;
  late AudioCacheService service;

  setUp(() async {
    mockDio = MockDio();
    tempDir = await Directory.systemTemp.createTemp('audio_cache_test_');
    service = AudioCacheService(
      dio: mockDio,
      customDir: tempDir,
    );
  });

  tearDown(() async {
    if (await tempDir.exists()) {
      await tempDir.delete(recursive: true);
    }
  });

  group('AudioCacheService', () {
    test('getCachedAudioPath returns null if audio file has not been cached', () async {
      final path = await service.getCachedAudioPath('http://10.0.2.2:3000/uploads/audio/listening-1.mp3');
      expect(path, isNull);
    });

    test('preCacheExamAudio downloads missing audio files and reports progress', () async {
      when(() => mockDio.download(any(), any())).thenAnswer((invocation) async {
        final savePath = invocation.positionalArguments[1] as String;
        final file = File(savePath);
        await file.parent.create(recursive: true);
        await file.writeAsBytes([1, 2, 3, 4]);
        return Response(
          requestOptions: RequestOptions(path: invocation.positionalArguments[0] as String),
          statusCode: 200,
        );
      });

      final questions = [
        {
          'id': 'q1',
          'prompt': 'Question with audio 1',
          'audio_url': '/uploads/audio/q1.mp3',
        },
        {
          'id': 'q2',
          'prompt': 'Question without audio',
        },
        {
          'id': 'q3',
          'prompt': 'Question with audio 2',
          'audio_url': 'http://10.0.2.2:3000/uploads/audio/q3.wav',
        },
      ];

      final progressCalls = <Map<String, int>>[];
      final cacheMap = await service.preCacheExamAudio(
        questions,
        onProgress: (current, total) {
          progressCalls.add({'current': current, 'total': total});
        },
      );

      expect(cacheMap.length, 2);
      expect(cacheMap.containsKey('/uploads/audio/q1.mp3'), isTrue);
      expect(cacheMap.containsKey('http://10.0.2.2:3000/uploads/audio/q3.wav'), isTrue);

      final q1Path = cacheMap['/uploads/audio/q1.mp3']!;
      expect(File(q1Path).existsSync(), isTrue);

      expect(progressCalls, [
        {'current': 1, 'total': 2},
        {'current': 2, 'total': 2},
      ]);

      // Verifying getCachedAudioPath now returns the path
      final retrievedPath = await service.getCachedAudioPath('/uploads/audio/q1.mp3');
      expect(retrievedPath, equals(q1Path));
    });

    test('preCacheExamAudio skips already cached files without re-downloading', () async {
      // First download
      when(() => mockDio.download(any(), any())).thenAnswer((invocation) async {
        final savePath = invocation.positionalArguments[1] as String;
        final file = File(savePath);
        await file.parent.create(recursive: true);
        await file.writeAsBytes([1, 2, 3, 4]);
        return Response(
          requestOptions: RequestOptions(path: invocation.positionalArguments[0] as String),
          statusCode: 200,
        );
      });

      final questions = [
        {
          'id': 'q1',
          'audio_url': '/uploads/audio/q1.mp3',
        },
      ];

      await service.preCacheExamAudio(questions);
      verify(() => mockDio.download(any(), any())).called(1);

      // Second download with same audio
      final cacheMap = await service.preCacheExamAudio(questions);
      expect(cacheMap.containsKey('/uploads/audio/q1.mp3'), isTrue);
      // Dio download should NOT have been called a second time
      verifyNever(() => mockDio.download(any(), any()));
    });

    test('preCacheExamAudio deduplicates identical audio URLs across questions', () async {
      when(() => mockDio.download(any(), any())).thenAnswer((invocation) async {
        final savePath = invocation.positionalArguments[1] as String;
        final file = File(savePath);
        await file.parent.create(recursive: true);
        await file.writeAsBytes([1, 2, 3, 4]);
        return Response(
          requestOptions: RequestOptions(path: invocation.positionalArguments[0] as String),
          statusCode: 200,
        );
      });

      final questions = [
        {'id': 'q1', 'audio_url': '/uploads/audio/passage-1.mp3'},
        {'id': 'q2', 'audio_url': '/uploads/audio/passage-1.mp3'},
      ];

      final cacheMap = await service.preCacheExamAudio(questions);
      expect(cacheMap.containsKey('/uploads/audio/passage-1.mp3'), isTrue);
      verify(() => mockDio.download(any(), any())).called(1);
    });

    test('preCacheExamAudio throws AudioCacheException when download fails', () async {
      when(() => mockDio.download(any(), any())).thenThrow(
        DioException(
          requestOptions: RequestOptions(path: 'http://test/fail.mp3'),
          error: 'Connection refused',
        ),
      );

      final questions = [
        {'id': 'q1', 'audio_url': '/uploads/audio/fail.mp3'},
      ];

      expect(
        () => service.preCacheExamAudio(questions),
        throwsA(isA<AudioCacheException>()),
      );
    });

    test('clearAudioCache deletes all cached files', () async {
      when(() => mockDio.download(any(), any())).thenAnswer((invocation) async {
        final savePath = invocation.positionalArguments[1] as String;
        final file = File(savePath);
        await file.parent.create(recursive: true);
        await file.writeAsBytes([1, 2, 3, 4]);
        return Response(
          requestOptions: RequestOptions(path: invocation.positionalArguments[0] as String),
          statusCode: 200,
        );
      });

      final questions = [
        {'id': 'q1', 'audio_url': '/uploads/audio/sound1.mp3'},
        {'id': 'q2', 'audio_url': '/uploads/audio/sound2.mp3'},
      ];

      await service.preCacheExamAudio(questions);
      expect(await service.getCachedAudioPath('/uploads/audio/sound1.mp3'), isNotNull);

      await service.clearAudioCache();
      expect(await service.getCachedAudioPath('/uploads/audio/sound1.mp3'), isNull);
      expect(await service.getCachedAudioPath('/uploads/audio/sound2.mp3'), isNull);
    });

    test('preCacheExamAudio handles questions with no audio cleanly', () async {
      int? reportedCurrent;
      int? reportedTotal;

      final result = await service.preCacheExamAudio(
        [
          {'id': 'q1', 'prompt': 'No audio here'},
          {'id': 'q2', 'prompt': 'Still no audio', 'audio_url': ''},
        ],
        onProgress: (current, total) {
          reportedCurrent = current;
          reportedTotal = total;
        },
      );

      expect(result, isEmpty);
      expect(reportedCurrent, 0);
      expect(reportedTotal, 0);
    });

    test('preCacheExamAudio supports audioUrl (camelCase)', () async {
      when(() => mockDio.download(any(), any())).thenAnswer((invocation) async {
        final savePath = invocation.positionalArguments[1] as String;
        final file = File(savePath);
        await file.parent.create(recursive: true);
        await file.writeAsBytes([1, 2, 3]);
        return Response(
          requestOptions: RequestOptions(path: invocation.positionalArguments[0] as String),
          statusCode: 200,
        );
      });

      final result = await service.preCacheExamAudio([
        {'id': 'q1', 'audioUrl': '/uploads/audio/camel.mp3'},
      ]);

      expect(result.containsKey('/uploads/audio/camel.mp3'), isTrue);
      expect(File(result['/uploads/audio/camel.mp3']!).existsSync(), isTrue);
    });

    test('getLocalAudioPath and getCachedAudioPathSync return expected paths', () async {
      when(() => mockDio.download(any(), any())).thenAnswer((invocation) async {
        final savePath = invocation.positionalArguments[1] as String;
        final file = File(savePath);
        await file.parent.create(recursive: true);
        await file.writeAsBytes([1, 2, 3]);
        return Response(
          requestOptions: RequestOptions(path: invocation.positionalArguments[0] as String),
          statusCode: 200,
        );
      });

      await service.preCacheExamAudio([
        {'id': 'q1', 'audio_url': '/uploads/audio/sync-test.mp3'},
      ]);

      final asyncPath = await service.getLocalAudioPath('/uploads/audio/sync-test.mp3');
      final syncPath = service.getCachedAudioPathSync('/uploads/audio/sync-test.mp3');

      expect(asyncPath, isNotNull);
      expect(syncPath, equals(asyncPath));
    });

    test('getCachedAudioPath returns null for empty or invalid URL', () async {
      expect(await service.getCachedAudioPath(''), isNull);
      expect(await service.getCachedAudioPath('   '), isNull);
      expect(service.getCachedAudioPathSync(''), isNull);
    });

    test('audioCacheServiceProvider is accessible via Riverpod container', () {
      final container = ProviderContainer();
      addTearDown(container.dispose);

      final instance = container.read(audioCacheServiceProvider);
      expect(instance, isA<AudioCacheService>());
    });
  });
}
