import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:audioplayers/audioplayers.dart';
import 'package:secure_cbt_mobile/core/database/database_provider.dart';
import 'package:secure_cbt_mobile/core/logger/logger.dart';
import 'package:secure_cbt_mobile/core/network/dio_client.dart';
import 'package:secure_cbt_mobile/core/services/audio_cache_service.dart';
import 'package:secure_cbt_mobile/core/theme/theme.dart';
import 'package:secure_cbt_mobile/features/exam/providers/exam_provider.dart';

class ListeningAudioPlayer extends ConsumerStatefulWidget {
  final String audioUrl;
  final int? playLimit;
  final String sessionId;
  final String questionId;
  final AudioPlayer? audioPlayer;
  final bool isActive;

  const ListeningAudioPlayer({
    super.key,
    required this.audioUrl,
    this.playLimit,
    required this.sessionId,
    required this.questionId,
    this.audioPlayer,
    this.isActive = true,
  });

  @override
  ConsumerState<ListeningAudioPlayer> createState() => _ListeningAudioPlayerState();
}

class _ListeningAudioPlayerState extends ConsumerState<ListeningAudioPlayer> {
  late final AudioPlayer _player;
  bool _isPlayerLocallyCreated = false;

  PlayerState _playerState = PlayerState.stopped;
  Duration _duration = Duration.zero;
  Duration _position = Duration.zero;
  int _playsUsed = 0;
  bool _isLoading = false;

  StreamSubscription<Duration>? _durationSub;
  StreamSubscription<Duration>? _positionSub;
  StreamSubscription<PlayerState>? _stateSub;
  StreamSubscription<void>? _completeSub;

  bool get _isLimitReached =>
      widget.playLimit != null && _playsUsed >= widget.playLimit!;

  @override
  void initState() {
    super.initState();
    if (widget.audioPlayer != null) {
      _player = widget.audioPlayer!;
      _isPlayerLocallyCreated = false;
    } else {
      _player = AudioPlayer();
      _isPlayerLocallyCreated = true;
    }

    _initPlayerListeners();
    _loadInitialPlayCount();
  }

  void _initPlayerListeners() {
    _durationSub = _player.onDurationChanged.listen((dur) {
      if (mounted) setState(() => _duration = dur);
    });

    _positionSub = _player.onPositionChanged.listen((pos) {
      if (mounted) setState(() => _position = pos);
    });

    _stateSub = _player.onPlayerStateChanged.listen((state) {
      if (mounted) setState(() => _playerState = state);
    });

    _completeSub = _player.onPlayerComplete.listen((_) async {
      await _handlePlayCompleted();
    });
  }

  Future<void> _loadInitialPlayCount() async {
    if (widget.sessionId.isEmpty || widget.questionId.isEmpty) return;
    try {
      final plays = await ref
          .read(localDatabaseProvider)
          .getAudioPlaysUsed(widget.sessionId, widget.questionId);
      if (mounted) {
        setState(() {
          _playsUsed = plays;
        });
      }
    } catch (e, st) {
      AppLogger.error('Failed to load initial audio plays count', e, st);
    }
  }

  Future<void> _handlePlayCompleted() async {
    if (!mounted) return;
    int nextCount = _playsUsed + 1;
    if (widget.sessionId.isNotEmpty && widget.questionId.isNotEmpty) {
      try {
        nextCount = await ref
            .read(localDatabaseProvider)
            .incrementAudioPlay(widget.sessionId, widget.questionId);
      } catch (e, st) {
        AppLogger.error('Failed to increment audio play count', e, st);
      }
    }

    if (mounted) {
      setState(() {
        _playsUsed = nextCount;
        _position = Duration.zero;
        _playerState = PlayerState.completed;
      });
    }
  }

  @override
  void didUpdateWidget(covariant ListeningAudioPlayer oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.isActive && !widget.isActive) {
      if (_playerState == PlayerState.playing) {
        _player.pause();
      }
    }
    if (oldWidget.questionId != widget.questionId ||
        oldWidget.audioUrl != widget.audioUrl ||
        oldWidget.sessionId != widget.sessionId) {
      _player.stop();
      setState(() {
        _playerState = PlayerState.stopped;
        _position = Duration.zero;
        _duration = Duration.zero;
      });
      _loadInitialPlayCount();
    }
  }

  @override
  void dispose() {
    _durationSub?.cancel();
    _positionSub?.cancel();
    _stateSub?.cancel();
    _completeSub?.cancel();
    if (_isPlayerLocallyCreated) {
      _player.dispose();
    }
    super.dispose();
  }

  Future<Source> _resolveAudioSource(String url) async {
    final audioCache = ref.read(audioCacheServiceProvider);
    final syncPath = audioCache.getCachedAudioPathSync(url);
    if (syncPath != null && syncPath.isNotEmpty) {
      return DeviceFileSource(syncPath);
    }
    final cachedPath = await audioCache.getCachedAudioPath(url);
    if (cachedPath != null && cachedPath.isNotEmpty) {
      return DeviceFileSource(cachedPath);
    }
    return UrlSource(resolveMediaUrl(url));
  }

  Future<void> _togglePlayPause() async {
    if (_isLimitReached &&
        _playerState != PlayerState.playing &&
        _playerState != PlayerState.paused) {
      return;
    }

    try {
      if (_playerState == PlayerState.playing) {
        await _player.pause();
      } else if (_playerState == PlayerState.paused) {
        await _player.resume();
      } else {
        setState(() => _isLoading = true);
        try {
          final source = await _resolveAudioSource(widget.audioUrl);
          await _player.play(source);
        } finally {
          if (mounted) setState(() => _isLoading = false);
        }
      }
    } catch (e, st) {
      AppLogger.error('Failed to toggle play/pause audio', e, st);
      if (mounted) setState(() => _isLoading = false);
    }
  }

  void _onSeek(double value) {
    if (_isLimitReached &&
        _playerState != PlayerState.playing &&
        _playerState != PlayerState.paused) {
      return;
    }
    // Enforce ANBK/TOEFL standard: prevent rewinding backwards when play limit is active
    if (widget.playLimit != null && value < _position.inMilliseconds) {
      return;
    }
    final target = Duration(milliseconds: value.toInt());
    _player.seek(target);
    setState(() => _position = target);
  }

  String _formatDuration(Duration d) {
    if (d.isNegative || (d.inSeconds <= 0 && d.inMinutes <= 0)) {
      return '00:00';
    }
    final minutes = d.inMinutes.remainder(60).toString().padLeft(2, '0');
    final seconds = d.inSeconds.remainder(60).toString().padLeft(2, '0');
    if (d.inHours > 0) {
      return '${d.inHours.toString().padLeft(2, '0')}:$minutes:$seconds';
    }
    return '$minutes:$seconds';
  }

  @override
  Widget build(BuildContext context) {
    ref.listen(
      examProvider.select(
        (s) => s.isWarningOverlayActive || s.isDualScreenBlocked || s.isFocusLostBlocked,
      ),
      (prev, isBlocked) {
        if (isBlocked && _playerState == PlayerState.playing) {
          _player.pause();
        }
      },
    );

    final isPlaying = _playerState == PlayerState.playing;
    final isPaused = _playerState == PlayerState.paused;
    final isExhausted = _isLimitReached && !isPlaying && !isPaused;

    final double maxDurationMs = _duration.inMilliseconds > 0
        ? _duration.inMilliseconds.toDouble()
        : 1.0;
    final double sliderValue = _position.inMilliseconds
        .toDouble()
        .clamp(0.0, maxDurationMs);
    final bool canSeek = !isExhausted && _duration.inMilliseconds > 0;

    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: isExhausted
              ? AppColors.border
              : AppColors.primaryLight.withValues(alpha: 0.35),
          width: 1.2,
        ),
        boxShadow: AppShadows.card,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // Header Row: Audio Icon, Title, and Limit Badge
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(6),
                decoration: BoxDecoration(
                  color: isExhausted
                      ? AppColors.surfaceSubtle
                      : AppColors.primaryContainer,
                  shape: BoxShape.circle,
                ),
                child: Icon(
                  Icons.headphones_rounded,
                  size: 16,
                  color: isExhausted ? AppColors.textMuted : AppColors.primary,
                ),
              ),
              const SizedBox(width: 8),
              const Text(
                'Audio Stimulus',
                style: TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w700,
                  color: AppColors.textPrimary,
                  letterSpacing: -0.2,
                ),
              ),
              const Spacer(),
              _buildLimitBadge(),
            ],
          ),
          const SizedBox(height: 12),

          // Controls & Slider Row
          Row(
            children: [
              _buildPlayButton(isExhausted, isPlaying),
              const SizedBox(width: 10),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    SliderTheme(
                      data: SliderTheme.of(context).copyWith(
                        trackHeight: 4,
                        thumbShape: const RoundSliderThumbShape(enabledThumbRadius: 6),
                        overlayShape: const RoundSliderOverlayShape(overlayRadius: 14),
                        activeTrackColor: isExhausted
                            ? AppColors.textMuted
                            : AppColors.primary,
                        inactiveTrackColor: AppColors.border,
                        thumbColor: isExhausted
                            ? AppColors.textMuted
                            : AppColors.primary,
                        overlayColor: AppColors.primary.withValues(alpha: 0.12),
                      ),
                      child: Slider(
                        value: sliderValue,
                        min: 0.0,
                        max: maxDurationMs,
                        onChanged: canSeek ? (val) => _onSeek(val) : null,
                      ),
                    ),
                    Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 4),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text(
                            _formatDuration(_position),
                            style: const TextStyle(
                              fontSize: 11,
                              fontWeight: FontWeight.w500,
                              color: AppColors.textSecondary,
                            ),
                          ),
                          Text(
                            _formatDuration(_duration),
                            style: const TextStyle(
                              fontSize: 11,
                              fontWeight: FontWeight.w500,
                              color: AppColors.textSecondary,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),

          // Locked / Limit Exceeded Feedback Banner
          if (isExhausted) ...[
            const SizedBox(height: 10),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 7),
              decoration: BoxDecoration(
                color: AppColors.errorContainer,
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: AppColors.error.withValues(alpha: 0.3)),
              ),
              child: const Row(
                children: [
                  Icon(Icons.lock_rounded, size: 14, color: AppColors.error),
                  SizedBox(width: 6),
                  Expanded(
                    child: Text(
                      'Batas pemutaran audio telah habis',
                      style: TextStyle(
                        fontSize: 11.5,
                        fontWeight: FontWeight.w600,
                        color: AppColors.onErrorContainer,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildLimitBadge() {
    final isUnlimited = widget.playLimit == null;
    final remaining = isUnlimited ? 0 : widget.playLimit! - _playsUsed;
    final isExhausted = !isUnlimited && remaining <= 0;

    final String label;
    final Color bgColor;
    final Color textColor;
    final BorderSide borderSide;

    if (isUnlimited) {
      label = 'Tanpa Batas';
      bgColor = AppColors.surfaceSubtle;
      textColor = AppColors.textSecondary;
      borderSide = const BorderSide(color: AppColors.border);
    } else if (isExhausted) {
      label = 'Batas Pemutaran Habis';
      bgColor = AppColors.errorContainer;
      textColor = AppColors.error;
      borderSide = BorderSide(color: AppColors.error.withValues(alpha: 0.3));
    } else {
      label = 'Sisa: ${remaining}x';
      bgColor = AppColors.primaryContainer;
      textColor = AppColors.primary;
      borderSide = BorderSide(color: AppColors.primary.withValues(alpha: 0.3));
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: bgColor,
        borderRadius: BorderRadius.circular(8),
        border: Border.fromBorderSide(borderSide),
      ),
      child: Text(
        label,
        style: TextStyle(
          fontSize: 11,
          fontWeight: FontWeight.w700,
          color: textColor,
          letterSpacing: -0.2,
        ),
      ),
    );
  }

  Widget _buildPlayButton(bool isExhausted, bool isPlaying) {
    IconData iconData;
    if (_isLoading) {
      iconData = Icons.hourglass_top_rounded;
    } else if (isPlaying) {
      iconData = Icons.pause_rounded;
    } else if (isExhausted) {
      iconData = Icons.lock_outline_rounded;
    } else if (_playerState == PlayerState.completed) {
      iconData = Icons.replay_rounded;
    } else {
      iconData = Icons.play_arrow_rounded;
    }

    final VoidCallback? onTapAction = isExhausted ? null : () => _togglePlayPause();

    return Material(
      color: Colors.transparent,
      child: InkWell(
        key: const Key('listening_audio_play_button'),
        onTap: onTapAction,
        borderRadius: BorderRadius.circular(22),
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 200),
          width: 44,
          height: 44,
          decoration: BoxDecoration(
            color: isExhausted ? AppColors.surfaceSubtle : AppColors.primary,
            shape: BoxShape.circle,
            boxShadow: isExhausted ? null : AppShadows.primaryButton,
            border: isExhausted
                ? Border.all(color: AppColors.border, width: 1.2)
                : null,
          ),
          child: Center(
            child: _isLoading
                ? const SizedBox(
                    width: 20,
                    height: 20,
                    child: CircularProgressIndicator(
                      strokeWidth: 2,
                      color: Colors.white,
                    ),
                  )
                : Icon(
                    iconData,
                    size: 24,
                    color: isExhausted ? AppColors.textMuted : Colors.white,
                  ),
          ),
        ),
      ),
    );
  }
}
