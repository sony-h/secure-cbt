import 'dart:async';
import 'package:dio/dio.dart';
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

  const ExamState({
    this.isLoading = false,
    this.sessionId,
    this.questions = const [],
    this.answers = const {},
    this.currentIndex = 0,
    this.remainingSeconds = 0,
    this.warningCount = 0,
  });

  ExamState copyWith({
    bool? isLoading,
    String? sessionId,
    List<Map<String, dynamic>>? questions,
    Map<String, String>? answers,
    int? currentIndex,
    int? remainingSeconds,
    int? warningCount,
  }) {
    return ExamState(
      isLoading: isLoading ?? this.isLoading,
      sessionId: sessionId ?? this.sessionId,
      questions: questions ?? this.questions,
      answers: answers ?? this.answers,
      currentIndex: currentIndex ?? this.currentIndex,
      remainingSeconds: remainingSeconds ?? this.remainingSeconds,
      warningCount: warningCount ?? this.warningCount,
    );
  }
}

// ── Exam Notifier ────────────────────────────────────────────
class ExamNotifier extends StateNotifier<ExamState> {
  Timer? _autosaveTimer;
  Timer? _timer;

  ExamNotifier() : super(const ExamState());

  Future<void> loadSession(String sessionId) async {
    state = state.copyWith(isLoading: true, sessionId: sessionId);

    // Questions loaded from session resume endpoint
    // For offline-first, questions are cached in Drift DB and loaded locally

    // Simulated: questions come from the session start/resume response
    // In production, the token screen would pass the full session data
    // For now, we set loading to false - actual data flows from the resume response

    state = state.copyWith(isLoading: false);
    _startTimer();
    _startAutosave();
  }

  void setQuestions(List<Map<String, dynamic>> questions, Map<String, String> existingAnswers) {
    state = state.copyWith(questions: questions, answers: existingAnswers);
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

    // Sync to server
    try {
      await dio.post('/answers/save', data: {
        'session_id': state.sessionId,
        'question_id': questionId,
        'answer_text': answer,
        'timestamp': DateTime.now().toIso8601String(),
      });
    } catch (e) {
      // Offline: answer saved locally, will sync later
      AppLogger.debug('Answer saved locally (offline): $questionId');
    }
  }

  void logViolation(String event) {
    final newCount = state.warningCount + 1;
    state = state.copyWith(warningCount: newCount);
    AppLogger.warn('Violation: $event (warning $newCount)');
  }

  void _startTimer() {
    _timer?.cancel();
    _timer = Timer.periodic(const Duration(seconds: 1), (_) {
      if (state.remainingSeconds > 0) {
        state = state.copyWith(remainingSeconds: state.remainingSeconds - 1);
      }
    });
  }

  void _startAutosave() {
    _autosaveTimer?.cancel();
    _autosaveTimer = Timer.periodic(const Duration(seconds: 5), (_) {
      // Batch sync unsynced answers (handled by local DB sync service)
      AppLogger.debug('Autosave tick - pending answers: ${state.answers.length}');
    });
  }

  @override
  void dispose() {
    _timer?.cancel();
    _autosaveTimer?.cancel();
    super.dispose();
  }
}

// ── Provider ──────────────────────────────────────────────────
final examProvider = StateNotifierProvider<ExamNotifier, ExamState>((ref) {
  return ExamNotifier();
});
