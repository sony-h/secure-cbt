import 'dart:async';
import 'package:dio/dio.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:secure_cbt_mobile/core/database/local_database.dart';
import 'package:secure_cbt_mobile/core/logger/logger.dart';
import 'package:secure_cbt_mobile/features/exam/providers/exam_state.dart';

class ExamNotifier extends StateNotifier<ExamState> {
  Timer? _autosaveTimer;
  Timer? _timer;
  Dio? _dio;
  void Function()? _onForceSubmit;
  void Function(String questionId)? _onAnswerSaved;
  void Function(String event, int count, String? sessionId)? _onViolation;
  void Function()? _onExamSubmitted;
  final LocalDatabase _db;
  bool _timerPaused = false;

  ExamNotifier(this._db) : super(const ExamState());

  Future<void> loadSession(
    String sessionId,
    List<Map<String, dynamic>> questions,
    int remainingSeconds,
    Dio dio,
  ) async {
    _timer?.cancel();
    _autosaveTimer?.cancel();
    state = state.copyWith(
      isLoading: true,
      sessionId: sessionId,
      questions: questions,
      remainingSeconds: remainingSeconds,
      currentIndex: 0,
      warningCount: 0,
      violations: [],
      answers: {},
      flagged: {},
      showSaveIndicator: false,
      isSubmitted: false,
      isFullscreen: true,
    );
    state = state.copyWith(isLoading: false);
    _dio = dio;

    // Sync pending offline answers
    try {
      final pending = await _db.getPendingAnswers(sessionId);
      for (final ans in pending) {
        try {
          await dio.post('/answers/save', data: {
            'session_id': sessionId,
            'question_id': ans.questionId,
            'answer_text': ans.answerText ?? '',
            'timestamp': ans.answeredAt.toUtc().toIso8601String(),
          });
          await _db.markSynced(ans.id);
        } catch (e) {
          AppLogger.error('Failed to sync pending answer', e);
        }
      }
    } catch (e) {
      AppLogger.error('Failed to get pending answers', e);
    }

    _startTimer();
    _startAutosave();
  }

  void pauseTimer() {
    _timerPaused = true;
    _timer?.cancel();
  }

  void resumeTimer() {
    if (!_timerPaused) return;
    _timerPaused = false;
    _startTimer();
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
    required void Function() onSaved,
  }) async {
    final newAnswers = Map<String, String>.from(state.answers);
    newAnswers[questionId] = answer;
    state = state.copyWith(answers: newAnswers);

    // Write to local DB first (offline-first)
    try {
      await _db.saveAnswer(
        sessionId: state.sessionId!,
        questionId: questionId,
        answerText: answer,
      );
    } catch (e) {
      AppLogger.error('Failed to save answer locally', e);
    }

    try {
      await dio.post('/answers/save', data: {
        'session_id': state.sessionId,
        'question_id': questionId,
        'answer_text': answer,
        'timestamp': DateTime.now().toUtc().toIso8601String(),
      });
      await _db.markSynced('${state.sessionId}_$questionId');
      state = state.copyWith(showSaveIndicator: true, lastSavedAt: DateTime.now());
      _onAnswerSaved?.call(questionId);
      onSaved();
      Future.delayed(const Duration(seconds: 2), () {
        state = state.copyWith(showSaveIndicator: false);
      });
    } catch (e) {
      AppLogger.error('Failed to save answer to server', e);
    }
  }

  void toggleFlag(String questionId) {
    final newFlagged = Set<String>.from(state.flagged);
    if (newFlagged.contains(questionId)) {
      newFlagged.remove(questionId);
    } else {
      newFlagged.add(questionId);
    }
    state = state.copyWith(flagged: newFlagged);
  }

  void logViolation(String event) {
    if (state.isSubmitted) return;

    final newCount = state.warningCount + 1;
    final newViolations = [...state.violations, '$event @ ${DateTime.now().toIso8601String()}'];
    state = state.copyWith(warningCount: newCount, violations: newViolations);
    AppLogger.warn('Violation: $event (warning $newCount / ${state.warningLimit})');
    _onViolation?.call(event, newCount, state.sessionId);

    if (newCount >= state.warningLimit) {
      AppLogger.error('Warning limit exceeded! Auto-submitting exam.');
      _onForceSubmit?.call();
    }
  }

  void setOnForceSubmit(void Function() callback) {
    _onForceSubmit = callback;
  }

  void setOnAnswerSaved(void Function(String questionId) callback) {
    _onAnswerSaved = callback;
  }

  void setOnViolation(void Function(String event, int count, String? sessionId) callback) {
    _onViolation = callback;
  }

  void setOnExamSubmitted(void Function() callback) {
    _onExamSubmitted = callback;
  }

  void exitFullscreen() {
    SystemChrome.setEnabledSystemUIMode(SystemUiMode.edgeToEdge);
    state = state.copyWith(isFullscreen: false);
  }

  void markSubmitted() {
    _onExamSubmitted?.call();
    state = state.copyWith(isSubmitted: true);
    _timer?.cancel();
    _autosaveTimer?.cancel();
    exitFullscreen();
  }

  void _startTimer() {
    _timer?.cancel();
    _timerPaused = false;
    _timer = Timer.periodic(const Duration(seconds: 1), (_) {
      if (state.remainingSeconds > 0) {
        state = state.copyWith(remainingSeconds: state.remainingSeconds - 1);
      } else if (state.remainingSeconds == 0 && !state.isSubmitted) {
        _onForceSubmit?.call();
      }
    });
  }

  void _startAutosave() {
    _autosaveTimer?.cancel();
    _autosaveTimer = Timer.periodic(const Duration(seconds: 15), (_) {
      final sid = state.sessionId;
      final dio = _dio;
      if (sid == null || dio == null) return;
      _db.getPendingAnswers(sid).then((pending) async {
        if (pending.isEmpty) return;
        AppLogger.info('Autosave: syncing ${pending.length} pending answers');
        for (final ans in pending) {
          try {
            await dio.post('/answers/save', data: {
              'session_id': sid,
              'question_id': ans.questionId,
              'answer_text': ans.answerText ?? '',
              'timestamp': ans.answeredAt.toUtc().toIso8601String(),
            });
            await _db.markSynced(ans.id);
          } catch (e) {
            AppLogger.warn('Autosave sync failed for ${ans.id}', e);
          }
        }
      }).catchError((e) {
        AppLogger.error('Autosave check failed', e);
      });
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
