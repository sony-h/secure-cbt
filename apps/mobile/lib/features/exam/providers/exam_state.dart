class ExamState {
  final bool isLoading;
  final String? sessionId;
  final List<Map<String, dynamic>> questions;
  final Map<String, String> answers;
  final int currentIndex;
  final int remainingSeconds;
  final int warningCount;
  final int warningLimit;
  final bool isSubmitted;
  final bool isFullscreen;
  final List<String> violations;
  final bool showSaveIndicator;
  final DateTime? lastSavedAt;
  final Set<String> flagged;
  final bool isDualScreenBlocked;

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
    this.showSaveIndicator = false,
    this.lastSavedAt,
    this.flagged = const {},
    this.isDualScreenBlocked = false,
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
    bool? showSaveIndicator,
    DateTime? lastSavedAt,
    Set<String>? flagged,
    bool? isDualScreenBlocked,
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
      showSaveIndicator: showSaveIndicator ?? this.showSaveIndicator,
      lastSavedAt: lastSavedAt ?? this.lastSavedAt,
      flagged: flagged ?? this.flagged,
      isDualScreenBlocked: isDualScreenBlocked ?? this.isDualScreenBlocked,
    );
  }
}
