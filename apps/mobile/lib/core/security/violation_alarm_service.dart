import 'dart:async';
import 'package:audioplayers/audioplayers.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:secure_cbt_mobile/core/logger/logger.dart';
import 'package:secure_cbt_mobile/core/security/screen_security.dart';

/// Punitive violation deterrence service:
/// Combines aggressive native vibration bursts and high-urgency looping audio alarms.
class ViolationAlarmService {
  final AudioPlayer _player;
  final Future<void> Function({int durationMs}) _vibrateFn;
  final Future<void> Function() _stopVibrateFn;

  Timer? _burstTimer;
  bool _isPlaying = false;

  static const Set<String> validSounds = {
    'sharp_beep',
    'siren',
    'digital_pulse',
    'warning_radar',
  };

  static const String defaultSound = 'sharp_beep';

  ViolationAlarmService({
    AudioPlayer? audioPlayer,
    Future<void> Function({int durationMs})? onVibrate,
    Future<void> Function()? onStopVibrate,
  })  : _player = audioPlayer ?? AudioPlayer(),
        _vibrateFn = onVibrate ?? ScreenSecurity.vibrateViolation,
        _stopVibrateFn = onStopVibrate ?? ScreenSecurity.stopVibration;

  bool get isPlaying => _isPlaying;

  /// Sanitizes sound name to known sound assets, falling back to [defaultSound].
  static String sanitizeSound(String sound) {
    var clean = sound.trim();
    if (clean.toLowerCase().endsWith('.mp3')) {
      clean = clean.substring(0, clean.length - 4);
    }
    if (validSounds.contains(clean)) {
      return clean;
    }
    return defaultSound;
  }

  /// Triggers a punitive burst of vibration and/or alarm audio.
  /// Automatically stops after [durationSeconds].
  Future<void> triggerAlarm({
    required bool vibrationEnabled,
    required bool alarmEnabled,
    required int durationSeconds,
    required String soundName,
  }) async {
    // 1. Stop any currently active alarm first
    await stopAlarm();

    if (!vibrationEnabled && !alarmEnabled) {
      return;
    }

    _isPlaying = true;
    final effectiveDuration = durationSeconds > 0 ? durationSeconds : 3;
    final durationMs = effectiveDuration * 1000;

    final futures = <Future<void>>[];

    // 2. Trigger vibration if enabled
    if (vibrationEnabled) {
      futures.add(_vibrateFn(durationMs: durationMs).catchError((e) {
        AppLogger.warn('Failed to trigger violation vibration: $e');
      }));
    }

    // 3. Trigger alarm audio loop at full volume (1.0)
    if (alarmEnabled) {
      final sanitized = sanitizeSound(soundName);
      futures.add(() async {
        try {
          await _player.setReleaseMode(ReleaseMode.loop);
          await _player.setVolume(1.0);
          await _player.play(AssetSource('sounds/$sanitized.mp3'));
        } catch (e) {
          AppLogger.warn('Failed to play violation alarm audio: $e');
        }
      }());
    }

    // 4. Strict burst timer to auto-stop after durationSeconds
    _burstTimer = Timer(Duration(seconds: effectiveDuration), () {
      stopAlarm();
    });

    await Future.wait(futures);
  }

  /// Immediately cancels any active burst timer, stops audio, and cancels vibration.
  Future<void> stopAlarm() async {
    _burstTimer?.cancel();
    _burstTimer = null;
    _isPlaying = false;

    final stopAudioFuture = _player.stop().catchError((e) {
      AppLogger.warn('Error stopping violation alarm audio: $e');
    });

    final stopVibrateFuture = _stopVibrateFn().catchError((e) {
      AppLogger.warn('Error stopping violation vibration: $e');
    });

    await Future.wait([stopAudioFuture, stopVibrateFuture]);
  }

  /// Disposes timer, stops alarms, and disposes the audio player.
  void dispose() {
    stopAlarm();
    try {
      _player.dispose();
    } catch (e) {
      AppLogger.warn('Error disposing violation alarm audio player: $e');
    }
  }
}

final violationAlarmServiceProvider = Provider<ViolationAlarmService>((ref) {
  final service = ViolationAlarmService();
  ref.onDispose(() => service.dispose());
  return service;
});
