import 'dart:async';
import 'package:dio/dio.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:secure_cbt_mobile/core/logger/logger.dart';

// ── Exam State ───────────────────────────────────────────────
class ExamState {
  final bool isLoading;
  final String? sessionId;
  final List<Map<String, dynamic>> questions;
  final Map<String, String> answers; // questionId → answer
  final int currentIndex;
  final int remainingSeconds;
  final int warningCount;
  final int warningLimit;
  final bool isSubmitted;
  final bool isFullscreen;
  final List<String> violations;

  const ExamState({
    this.isLoading = false,
    this.sessionId,
    this.questions = const [],
    this.answers = const {},
    this.currentIndex = 0,
    this.remainingSeconds = 0,
    this.warningCount = 0,
    this.warningLimit = 3,
    this.isSubmitted = false,
    this.isFullscreen = true,
    this.violations = const [],
  });

  ExamState copyWith({
    bool? isLoading,
    String? sessionId,
    List<Map<String, dynamic>>? questions,
    Map<String, String>? answers,
    int? currentIndex,
    int? remainingSeconds,
    int? warningCount,
    int? warningLimit,
    bool? isSubmitted,
    bool? isFullscreen,
    List<String>? violations,
  }) {
    return ExamState(
      isLoading: isLoading ?? this.isLoading,
      sessionId: sessionId ?? this.sessionId,
      questions: questions ?? this.questions,
      answers: answers ?? this.answers,
      currentIndex: currentIndex ?? this.currentIndex,
      remainingSeconds: remainingSeconds ?? this.remainingSeconds,
      warningCount: warningCount ?? this.warningCount,
      warningLimit: warningLimit ?? this.warningLimit,
      isSubmitted: isSubmitted ?? this.isSubmitted,
      isFullscreen: isFullscreen ?? this.isFullscreen,
      violations: violations ?? this.violations,
    );
  }
}

// ── Exam Notifier ────────────────────────────────────────────
class ExamNotifier extends StateNotifier<ExamState> {
  Timer? _autosaveTimer;
  Timer? _timer;
  void Function()? _onForceSubmit;

  ExamNotifier() : super(const ExamState());

  Future<void> loadSession(String sessionId, List<Map<String, dynamic>> questions, int remainingSeconds) async {
    state = state.copyWith(
      isLoading: true,
      sessionId: sessionId,
      questions: questions,
      remainingSeconds: remainingSeconds,
    );
    state = state.copyWith(isLoading: false);
    _startTimer();
    _startAutosave();
    _enforceFullscreen();
  }

  void setQuestions(List<Map<String, dynamic>> questions, Map<String, String> existingAnswers) {
    state = state.copyWith(questions: questions, answers: existingAnswers);
  }

  void setWarningLimit(int limit) {
    state = state.copyWith(warningLimit: limit);
  }

  void setCurrentIndex(int index) {
    state = state.copyWith(currentIndex: index);
  }

  Future<void> saveAnswer({
    required String questionId,
    required String answer,
    required Dio dio,
  }) async {
    final newAnswers = Map<String, String>.from(state.answers);
    newAnswers[questionId] = answer;
    state = state.copyWith(answers: newAnswers);

    try {
      await dio.post('/answers/save', data: {
        'session_id': state.sessionId,
        'question_id': questionId,
        'answer_text': answer,
        'timestamp': DateTime.now().toIso8601String(),
      });
    } catch (e) {
      AppLogger.debug('Answer saved locally (offline): $questionId');
    }
  }

  void logViolation(String event) {
    if (state.isSubmitted) return;

    final newCount = state.warningCount + 1;
    final newViolations = [...state.violations, '$event @ ${DateTime.now().toIso8601String()}'];
    state = state.copyWith(warningCount: newCount, violations: newViolations);
    AppLogger.warn('Violation: $event (warning $newCount / ${state.warningLimit})');

    // Auto-submit if warning limit exceeded
    if (newCount >= state.warningLimit) {
      AppLogger.error('Warning limit exceeded! Auto-submitting exam.');
      _onForceSubmit?.call();
    }
  }

  /// Register callback for when warning limit is hit (force-submit)
  void setOnForceSubmit(void Function() callback) {
    _onForceSubmit = callback;
  }

  /// Enter fullscreen immersive mode
  void _enforceFullscreen() {
    SystemChrome.setEnabledSystemUIMode(SystemUiMode.immersiveSticky);
    state = state.copyWith(isFullscreen: true);
  }

  /// Exit fullscreen (e.g., on exam finish)
  void exitFullscreen() {
    SystemChrome.setEnabledSystemUIMode(SystemUiMode.edgeToEdge);
    state = state.copyWith(isFullscreen: false);
  }

  void markSubmitted() {
    state = state.copyWith(isSubmitted: true);
    _timer?.cancel();
    _autosaveTimer?.cancel();
    exitFullscreen();
  }

  void _startTimer() {
    _timer?.cancel();
    _timer = Timer.periodic(const Duration(seconds: 1), (_) {
      if (state.remainingSeconds > 0) {
        state = state.copyWith(remainingSeconds: state.remainingSeconds - 1);
      } else if (state.remainingSeconds == 0 && !state.isSubmitted) {
        // Time's up - auto submit
        _onForceSubmit?.call();
      }
    });
  }

  void _startAutosave() {
    _autosaveTimer?.cancel();
    _autosaveTimer = Timer.periodic(const Duration(seconds: 5), (_) {
      AppLogger.debug('Autosave tick - pending answers: ${state.answers.length}');
    });
  }

  @override
  void dispose() {
    _timer?.cancel();
    _autosaveTimer?.cancel();
    exitFullscreen();
    super.dispose();
  }
}

// ── Provider ──────────────────────────────────────────────────
final examProvider = StateNotifierProvider<ExamNotifier, ExamState>((ref) {
  return ExamNotifier();
});
