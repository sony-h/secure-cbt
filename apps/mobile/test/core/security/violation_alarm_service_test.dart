import 'package:audioplayers/audioplayers.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';
import 'package:secure_cbt_mobile/core/security/screen_security.dart';
import 'package:secure_cbt_mobile/core/security/violation_alarm_service.dart';

class MockAudioPlayer extends Mock implements AudioPlayer {}
class FakeSource extends Fake implements Source {}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  setUpAll(() {
    registerFallbackValue(FakeSource());
    registerFallbackValue(ReleaseMode.loop);

    TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger.setMockMethodCallHandler(
      const MethodChannel('xyz.luan/audioplayers.global'),
      (call) async => 1,
    );
    TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger.setMockMethodCallHandler(
      const MethodChannel('xyz.luan/audioplayers'),
      (call) async => 1,
    );
  });

  late MockAudioPlayer mockAudioPlayer;
  late List<int> vibrateDurations;
  late int stopVibrateCalls;

  setUp(() {
    mockAudioPlayer = MockAudioPlayer();
    vibrateDurations = [];
    stopVibrateCalls = 0;

    when(() => mockAudioPlayer.setReleaseMode(any())).thenAnswer((_) async {});
    when(() => mockAudioPlayer.setVolume(any())).thenAnswer((_) async {});
    when(() => mockAudioPlayer.play(any())).thenAnswer((_) async {});
    when(() => mockAudioPlayer.stop()).thenAnswer((_) async {});
    when(() => mockAudioPlayer.dispose()).thenAnswer((_) async {});
  });

  ViolationAlarmService createService() {
    return ViolationAlarmService(
      audioPlayer: mockAudioPlayer,
      onVibrate: ({int durationMs = 3000}) async {
        vibrateDurations.add(durationMs);
      },
      onStopVibrate: () async {
        stopVibrateCalls++;
      },
    );
  }

  group('ViolationAlarmService - Deterrence Triggering', () {
    test('triggerAlarm with vibration only vibrates and does not play audio', () async {
      final service = createService();

      await service.triggerAlarm(
        vibrationEnabled: true,
        alarmEnabled: false,
        durationSeconds: 3,
        soundName: 'sharp_beep',
      );

      expect(vibrateDurations, [3000]);
      verifyNever(() => mockAudioPlayer.play(any()));
      expect(service.isPlaying, isTrue);

      service.stopAlarm();
    });

    test('triggerAlarm with audio only plays looping audio at volume 1.0 without vibration', () async {
      final service = createService();

      await service.triggerAlarm(
        vibrationEnabled: false,
        alarmEnabled: true,
        durationSeconds: 4,
        soundName: 'siren',
      );

      expect(vibrateDurations, isEmpty);
      verify(() => mockAudioPlayer.setReleaseMode(ReleaseMode.loop)).called(1);
      verify(() => mockAudioPlayer.setVolume(1.0)).called(1);
      verify(() => mockAudioPlayer.play(
            any(that: isA<AssetSource>().having((s) => s.path, 'path', 'sounds/siren.mp3')),
          )).called(1);
      expect(service.isPlaying, isTrue);

      service.stopAlarm();
    });

    test('triggerAlarm with both vibration and audio triggers both channels', () async {
      final service = createService();

      await service.triggerAlarm(
        vibrationEnabled: true,
        alarmEnabled: true,
        durationSeconds: 5,
        soundName: 'warning_radar',
      );

      expect(vibrateDurations, [5000]);
      verify(() => mockAudioPlayer.setReleaseMode(ReleaseMode.loop)).called(1);
      verify(() => mockAudioPlayer.setVolume(1.0)).called(1);
      verify(() => mockAudioPlayer.play(
            any(that: isA<AssetSource>().having((s) => s.path, 'path', 'sounds/warning_radar.mp3')),
          )).called(1);
      expect(service.isPlaying, isTrue);

      service.stopAlarm();
    });

    test('triggerAlarm with neither vibration nor audio is a no-op', () async {
      final service = createService();

      await service.triggerAlarm(
        vibrationEnabled: false,
        alarmEnabled: false,
        durationSeconds: 3,
        soundName: 'digital_pulse',
      );

      expect(vibrateDurations, isEmpty);
      verifyNever(() => mockAudioPlayer.play(any()));
      expect(service.isPlaying, isFalse);
    });
  });

  group('ViolationAlarmService - Sound Name Fallback & Sanitization', () {
    test('falls back to sharp_beep for unknown or empty sound name', () async {
      final service = createService();

      await service.triggerAlarm(
        vibrationEnabled: false,
        alarmEnabled: true,
        durationSeconds: 3,
        soundName: 'non_existent_sound',
      );

      verify(() => mockAudioPlayer.play(
            any(that: isA<AssetSource>().having((s) => s.path, 'path', 'sounds/sharp_beep.mp3')),
          )).called(1);

      service.stopAlarm();
    });

    test('correctly handles .mp3 suffix and supported sounds', () {
      expect(ViolationAlarmService.sanitizeSound('siren.mp3'), 'siren');
      expect(ViolationAlarmService.sanitizeSound('digital_pulse'), 'digital_pulse');
      expect(ViolationAlarmService.sanitizeSound('warning_radar.mp3'), 'warning_radar');
      expect(ViolationAlarmService.sanitizeSound('sharp_beep'), 'sharp_beep');
      expect(ViolationAlarmService.sanitizeSound('invalid.wav'), 'sharp_beep');
    });
  });

  group('ViolationAlarmService - Burst Expiration & Cancellation', () {
    testWidgets('automatic stop after burst duration expires', (tester) async {
      final service = createService();

      await service.triggerAlarm(
        vibrationEnabled: true,
        alarmEnabled: true,
        durationSeconds: 3,
        soundName: 'sharp_beep',
      );

      expect(service.isPlaying, isTrue);

      await tester.pump(const Duration(seconds: 3));

      expect(service.isPlaying, isFalse);
      verify(() => mockAudioPlayer.stop()).called(greaterThanOrEqualTo(1));
      expect(stopVibrateCalls, greaterThanOrEqualTo(1));
    });

    test('manual stopAlarm immediately cancels audio and vibration', () async {
      final service = createService();

      await service.triggerAlarm(
        vibrationEnabled: true,
        alarmEnabled: true,
        durationSeconds: 5,
        soundName: 'digital_pulse',
      );

      expect(service.isPlaying, isTrue);

      await service.stopAlarm();

      expect(service.isPlaying, isFalse);
      verify(() => mockAudioPlayer.stop()).called(greaterThanOrEqualTo(1));
      expect(stopVibrateCalls, greaterThanOrEqualTo(1));
    });

    test('triggerAlarm stops previous alarm burst before starting new one', () async {
      final service = createService();

      await service.triggerAlarm(
        vibrationEnabled: true,
        alarmEnabled: true,
        durationSeconds: 3,
        soundName: 'siren',
      );

      await service.triggerAlarm(
        vibrationEnabled: true,
        alarmEnabled: true,
        durationSeconds: 4,
        soundName: 'warning_radar',
      );

      verify(() => mockAudioPlayer.stop()).called(greaterThanOrEqualTo(1));
      expect(stopVibrateCalls, greaterThanOrEqualTo(1));
      expect(vibrateDurations, [3000, 4000]);

      service.stopAlarm();
    });

    test('dispose cancels alarm, stops audio, and disposes player', () async {
      final service = createService();

      service.dispose();
      await Future.delayed(Duration.zero);

      verify(() => mockAudioPlayer.stop()).called(1);
      verify(() => mockAudioPlayer.dispose()).called(1);
      expect(stopVibrateCalls, 1);
    });
  });

  group('ScreenSecurity Native Channel & Fallback', () {
    const channel = MethodChannel('com.securecbt.mobile/security');
    late List<MethodCall> channelCalls;

    setUp(() {
      channelCalls = [];
      TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger.setMockMethodCallHandler(
        channel,
        (MethodCall call) async {
          channelCalls.add(call);
          return true;
        },
      );
    });

    tearDown(() {
      ScreenSecurity.isAndroidOverride = null;
      TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger.setMockMethodCallHandler(
        channel,
        null,
      );
    });

    test('vibrateViolation invokes method channel on Android', () async {
      ScreenSecurity.isAndroidOverride = true;

      await ScreenSecurity.vibrateViolation(durationMs: 4000);

      expect(channelCalls, hasLength(1));
      expect(channelCalls.first.method, 'vibrateViolation');
      expect(channelCalls.first.arguments, {'durationMs': 4000});
    });

    test('stopVibration invokes method channel on Android', () async {
      ScreenSecurity.isAndroidOverride = true;

      await ScreenSecurity.stopVibration();

      expect(channelCalls, hasLength(1));
      expect(channelCalls.first.method, 'stopVibration');
    });

    test('vibrateViolation falls back to HapticFeedback on non-Android without crashing', () async {
      ScreenSecurity.isAndroidOverride = false;

      await ScreenSecurity.vibrateViolation(durationMs: 3000);

      expect(channelCalls, isEmpty);
    });

    test('stopVibration on non-Android is a safe no-op', () async {
      ScreenSecurity.isAndroidOverride = false;

      await ScreenSecurity.stopVibration();

      expect(channelCalls, isEmpty);
    });
  });

  group('Riverpod Provider', () {
    test('violationAlarmServiceProvider creates instance and disposes properly', () {
      final container = ProviderContainer();
      final service = container.read(violationAlarmServiceProvider);

      expect(service, isNotNull);
      expect(service, isA<ViolationAlarmService>());

      container.dispose();
    });
  });
}
