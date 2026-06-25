import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:dio/dio.dart';
import 'package:secure_cbt_mobile/core/logger/logger.dart';
import 'package:secure_cbt_mobile/core/network/dio_client.dart';
import 'package:secure_cbt_mobile/core/network/socket_client.dart';
import 'package:secure_cbt_mobile/features/auth/providers/auth_provider.dart';
import 'package:secure_cbt_mobile/features/exam/providers/exam_provider.dart';
import 'package:secure_cbt_mobile/features/exam/presentation/widgets/question_palette.dart';

class ExamScreen extends ConsumerStatefulWidget {
  final String sessionId;
  final String examTitle;
  final int warningLimit;

  const ExamScreen({
    super.key,
    required this.sessionId,
    required this.examTitle,
    this.warningLimit = 3,
  });

  @override
  ConsumerState<ExamScreen> createState() => _ExamScreenState();
}

class _ExamScreenState extends ConsumerState<ExamScreen> with WidgetsBindingObserver {
  late Dio _dio;
  late PageController _pageController;
  bool _submitting = false;
  bool _violationsEnabled = false;

  @override
  void initState() {
    super.initState();
    _dio = ref.read(dioProvider);
    _pageController = PageController();
    WidgetsBinding.instance.addPostFrameCallback((_) => _loadSessionData());
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _pageController.dispose();
    ref.read(monitoringSocketProvider).disconnect();
    SystemChrome.setEnabledSystemUIMode(SystemUiMode.edgeToEdge);
    SystemChrome.setPreferredOrientations(DeviceOrientation.values);
    super.dispose();
  }

  Future<void> _loadSessionData() async {
    try {
      final response = await _dio.post('/sessions/resume', data: {
        'session_id': widget.sessionId,
      });
      final session = response.data['data'];
      final questions = (session['questions'] as List<dynamic>?)
              ?.cast<Map<String, dynamic>>() ??
          [];
      final remainingSeconds = session['remaining_time_seconds'] as int? ?? 0;
      final warningLimit = session['exam']?['warning_limit'] as int? ?? 3;

      if (questions.isEmpty) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Tidak ada soal untuk ujian ini'),
              backgroundColor: Colors.red,
            ),
          );
        }
        return;
      }

      // Set fullscreen and lock orientation
      SystemChrome.setEnabledSystemUIMode(SystemUiMode.immersiveSticky);
      SystemChrome.setPreferredOrientations([
        DeviceOrientation.portraitUp,
        DeviceOrientation.portraitDown,
      ]);

      final notifier = ref.read(examProvider.notifier);
      notifier.setWarningLimit(warningLimit);
      notifier.setOnForceSubmit(() => _forceSubmit());
      notifier.loadSession(widget.sessionId, questions, remainingSeconds);

      // Connect monitoring socket
      final authState = ref.read(authProvider);
      final examId = session['exam_id'] ?? session['exam']?['id'] ?? '';
      if (authState.userId != null) {
        final socket = ref.read(monitoringSocketProvider);
        socket.connect(authState.userId!, examId);

        notifier.setOnAnswerSaved((questionId) {
          socket.emitAnswerSaved(widget.sessionId, questionId, examId);
        });

        notifier.setOnViolation((event, count) {
          socket.emitViolation(examId, count, event);
        });

        notifier.setOnExamSubmitted(() {
          socket.emitExamSubmitted(widget.sessionId, examId, authState.userId!);
        });
      }

      // Delay observer registration so immersive-mode lifecycle events settle first
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (!mounted) return;
        WidgetsBinding.instance.addObserver(this);
        Future.delayed(const Duration(milliseconds: 1500), () {
          if (mounted) {
            _violationsEnabled = true;
          }
        });
      });
    } on DioException catch (e) {
      AppLogger.error('Failed to load session', e);
      if (mounted) {
        showDialog(
          context: context,
          barrierDismissible: false,
          builder: (ctx) => AlertDialog(
            title: const Text('Gagal Memuat Soal'),
            content: Text(e.response?.data?['message'] ?? 'Tidak dapat memuat soal ujian.'),
            actions: [
              TextButton(
                onPressed: () => context.goNamed('token'),
                child: const Text('KEMBALI'),
              ),
              TextButton(
                onPressed: () {
                  Navigator.pop(ctx);
                  _loadSessionData();
                },
                child: const Text('COBA LAGI'),
              ),
            ],
          ),
        );
      }
    } catch (e) {
      AppLogger.error('Failed to load session', e);
      if (mounted) context.goNamed('token');
    }
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (!_violationsEnabled) return;
    final notifier = ref.read(examProvider.notifier);
    switch (state) {
      case AppLifecycleState.paused:
        notifier.logViolation('APP_MINIMIZED');
        _showViolationSnackbar('Peringatan! Aplikasi tidak boleh diminimalkan.');
        break;
      case AppLifecycleState.resumed:
        SystemChrome.setEnabledSystemUIMode(SystemUiMode.immersiveSticky);
        break;
      case AppLifecycleState.inactive:
      case AppLifecycleState.hidden:
      case AppLifecycleState.detached:
        break;
    }
  }

  void _showViolationSnackbar(String message) {
    if (!mounted) return;
    final examState = ref.read(examProvider);
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('$message (Peringatan ${examState.warningCount}/${examState.warningLimit})'),
        backgroundColor: Colors.red.shade700,
        duration: const Duration(seconds: 3),
      ),
    );
  }

  Future<void> _forceSubmit() async {
    if (_submitting) return;
    _submitting = true;
    try {
      await _dio.post('/sessions/submit', data: {
        'session_id': widget.sessionId,
        'reason': 'WARNING_LIMIT_EXCEEDED',
      });
    } catch (e) {
      AppLogger.error('Force submit failed', e);
    }
    ref.read(examProvider.notifier).markSubmitted();
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: const Text('Ujian otomatis dikumpulkan karena batas peringatan terlampaui.'),
          backgroundColor: Colors.red.shade700,
          duration: const Duration(seconds: 5),
        ),
      );
      await Future.delayed(const Duration(seconds: 2));
      if (mounted) context.goNamed('result', extra: {'sessionId': widget.sessionId});
    }
  }

  Future<void> _submitExam() async {
    if (_submitting) return;
    _submitting = true;
    try {
      await _dio.post('/sessions/submit', data: {'session_id': widget.sessionId});
    } catch (e) {
      AppLogger.error('Submit failed', e);
    }
    ref.read(examProvider.notifier).markSubmitted();
    if (mounted) context.goNamed('result', extra: {'sessionId': widget.sessionId});
  }

  // ── Build ─────────────────────────────────────────────────

  @override
  Widget build(BuildContext context) {
    final examState = ref.watch(examProvider);
    final theme = Theme.of(context);

    return PopScope(
      canPop: false,
      onPopInvokedWithResult: (didPop, result) async {
        if (didPop) return;
        final ok = await showDialog<bool>(
          context: context,
          builder: (ctx) => AlertDialog(
            title: const Text('Kumpulkan Ujian?'),
            content: const Text('Jawaban akan terkumpul dan tidak bisa diubah.'),
            actions: [
              TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('BATAL')),
              TextButton(
                onPressed: () => Navigator.pop(ctx, true),
                child: const Text('KUMPULKAN', style: TextStyle(color: Colors.red)),
              ),
            ],
          ),
        );
        if (ok == true) _submitExam();
      },
      child: Scaffold(
        backgroundColor: theme.colorScheme.surface,
        appBar: _buildAppBar(theme, examState),
        body: examState.isLoading
            ? const Center(child: CircularProgressIndicator())
            : examState.questions.isEmpty
                ? Center(
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(Icons.assignment_late, size: 64, color: Colors.grey.shade400),
                        const SizedBox(height: 16),
                        const Text('Tidak ada soal tersedia'),
                      ],
                    ),
                  )
                : PageView.builder(
                    controller: _pageController,
                    itemCount: examState.questions.length,
                    onPageChanged: (i) => ref.read(examProvider.notifier).setCurrentIndex(i),
                    itemBuilder: (context, index) =>
                        _buildQuestionCard(theme, examState.questions[index], examState, index),
                  ),
        bottomNavigationBar: (examState.isLoading || examState.questions.isEmpty)
            ? null
            : _buildBottomBar(theme, examState),
      ),
    );
  }

  PreferredSizeWidget _buildAppBar(ThemeData theme, ExamState examState) {
    final isWarning = examState.remainingSeconds < 300;
    final minutes = examState.remainingSeconds ~/ 60;
    final seconds = examState.remainingSeconds % 60;

    return AppBar(
      title: Text(widget.examTitle, style: theme.textTheme.titleMedium),
      automaticallyImplyLeading: false,
      actions: [
        // Timer
        Container(
          margin: const EdgeInsets.only(right: 8),
          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
          decoration: BoxDecoration(
            color: isWarning ? Colors.red.shade50 : theme.colorScheme.primaryContainer,
            borderRadius: BorderRadius.circular(8),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(
                Icons.timer_outlined,
                size: 16,
                color: isWarning ? Colors.red : theme.colorScheme.primary,
              ),
              const SizedBox(width: 5),
              Text(
                '${minutes.toString().padLeft(2, '0')}:${seconds.toString().padLeft(2, '0')}',
                style: TextStyle(
                  fontWeight: FontWeight.bold,
                  fontSize: 14,
                  fontFeatures: const [FontFeature.tabularFigures()],
                  color: isWarning ? Colors.red : theme.colorScheme.primary,
                ),
              ),
            ],
          ),
        ),
        // Warning chip (always visible so students know the limit)
        Padding(
          padding: const EdgeInsets.only(right: 8),
          child: Chip(
            avatar: Icon(Icons.warning_amber, size: 16, color: examState.warningCount > 0 ? Colors.red.shade700 : Colors.grey.shade500),
            label: Text('${examState.warningCount}/${examState.warningLimit}',
                style: TextStyle(fontSize: 12, color: examState.warningCount > 0 ? Colors.red.shade700 : Colors.grey.shade600)),
            backgroundColor: examState.warningCount > 0 ? Colors.red.shade50 : Colors.grey.shade100,
            side: BorderSide.none,
            visualDensity: VisualDensity.compact,
          ),
        ),
      ],
    );
  }

  Widget _buildQuestionCard(ThemeData theme, Map<String, dynamic> q, ExamState examState, int index) {
    // Extract data with fallbacks
    final content = q['question']?['content'] ?? q['content'] ?? '';
    final options = (q['question']?['options'] as List<dynamic>?) ??
        (q['options'] as List<dynamic>?) ??
        [];
    final questionId = q['question']?['id'] ?? q['id'] ?? '';
    final difficulty = q['question']?['difficulty'] ?? q['difficulty'] ?? '';
    final type = q['question']?['type'] ?? '';

    return SingleChildScrollView(
      padding: const EdgeInsets.fromLTRB(20, 16, 20, 8),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header row: number + difficulty
          Row(
            children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: theme.colorScheme.primaryContainer,
                  borderRadius: BorderRadius.circular(6),
                ),
                child: Text(
                  'Soal ${index + 1}',
                  style: theme.textTheme.labelLarge?.copyWith(
                    color: theme.colorScheme.onPrimaryContainer,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
              const SizedBox(width: 8),
              if (difficulty.isNotEmpty)
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                    color: _difficultyColor(difficulty).withValues(alpha: 0.12),
                    borderRadius: BorderRadius.circular(6),
                  ),
                  child: Text(
                    _difficultyLabel(difficulty),
                    style: theme.textTheme.labelSmall?.copyWith(
                      color: _difficultyColor(difficulty),
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
            ],
          ),
          const SizedBox(height: 16),
          // Question text
          Text(
            content,
            style: theme.textTheme.bodyLarge?.copyWith(
              height: 1.7,
              fontWeight: FontWeight.w500,
            ),
          ),
          const SizedBox(height: 20),
          // Options (MC/TrueFalse/MultiSelect) or Essay input
          if (type == 'ESSAY' || options.isEmpty)
            _buildEssayInput(theme, questionId, examState)
          else
            ...List.generate(options.length, (index) {
            final option = options[index] is Map ? options[index] as Map<String, dynamic> : {};
            final optId = option['id']?.toString() ?? '';
            final optText = option['content']?.toString() ?? option['label']?.toString() ?? '';
            final label = String.fromCharCode(65 + index); // A, B, C, D, E
            final isMultiSelect = type == 'MULTI_SELECT';
            final isSelected = isMultiSelect
                ? (examState.answers[questionId]?.split(',').contains(optId) ?? false)
                : examState.answers[questionId] == optId;

            return Padding(
              padding: const EdgeInsets.only(bottom: 10),
              child: InkWell(
                onTap: () {
                  if (isMultiSelect) {
                    final current = examState.answers[questionId] ?? '';
                    final selected = current.split(',').where((s) => s.isNotEmpty).toList();
                    if (selected.contains(optId)) {
                      selected.remove(optId);
                    } else {
                      selected.add(optId);
                    }
                    ref.read(examProvider.notifier).saveAnswer(
                      questionId: questionId,
                      answer: selected.join(','),
                      dio: _dio,
                      onSaved: () {},
                    );
                  } else {
                    ref.read(examProvider.notifier).saveAnswer(
                      questionId: questionId,
                      answer: optId,
                      dio: _dio,
                      onSaved: () {},
                    );
                  }
                },
                borderRadius: BorderRadius.circular(12),
                child: AnimatedContainer(
                  duration: const Duration(milliseconds: 200),
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                  decoration: BoxDecoration(
                    color: isSelected
                        ? theme.colorScheme.primary.withValues(alpha: 0.06)
                        : theme.colorScheme.surface,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(
                      color: isSelected ? theme.colorScheme.primary : theme.colorScheme.outline.withValues(alpha: 0.3),
                      width: isSelected ? 2 : 1,
                    ),
                  ),
                  child: Row(
                    children: [
                      // Option circle
                      Container(
                        width: 32,
                        height: 32,
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          color: isSelected ? theme.colorScheme.primary : Colors.transparent,
                          border: Border.all(
                            color: isSelected ? theme.colorScheme.primary : theme.colorScheme.outline.withValues(alpha: 0.4),
                            width: isSelected ? 0 : 1.5,
                          ),
                        ),
                        child: Center(
                          child: isSelected
                              ? Text(label, style: TextStyle(color: theme.colorScheme.onPrimary, fontWeight: FontWeight.bold, fontSize: 14))
                              : Text(label, style: TextStyle(color: theme.colorScheme.onSurface.withValues(alpha: 0.6), fontSize: 14)),
                        ),
                      ),
                      const SizedBox(width: 14),
                      // Option text
                      Expanded(
                        child: Text(
                          optText,
                          style: theme.textTheme.bodyMedium?.copyWith(
                            fontWeight: isSelected ? FontWeight.w600 : FontWeight.w400,
                            color: isSelected ? theme.colorScheme.primary : theme.colorScheme.onSurface,
                          ),
                        ),
                      ),
                      // Check icon
                      if (isSelected)
                        Icon(Icons.check_circle, size: 22, color: theme.colorScheme.primary),
                    ],
                  ),
                ),
              ),
            );
          }),
        ],
      ),
    );
  }

  Widget _buildBottomBar(ThemeData theme, ExamState examState) {
    final total = examState.questions.length;
    final current = examState.currentIndex;
    final answered = examState.answers.length;

    return Container(
      decoration: BoxDecoration(
        color: theme.colorScheme.surface,
        border: Border(top: BorderSide(color: theme.dividerColor.withValues(alpha: 0.3))),
        boxShadow: [
          BoxShadow(color: Colors.black.withValues(alpha: 0.04), blurRadius: 8, offset: const Offset(0, -2)),
        ],
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          // Save indicator
          if (examState.showSaveIndicator)
            Container(
              width: double.infinity,
              padding: const EdgeInsets.symmetric(vertical: 6, horizontal: 16),
              decoration: BoxDecoration(
                color: Colors.green.shade50,
                border: Border(bottom: BorderSide(color: Colors.green.shade100)),
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(Icons.cloud_done_outlined, size: 16, color: Colors.green.shade700),
                  const SizedBox(width: 6),
                  Text('Tersimpan', style: TextStyle(color: Colors.green.shade700, fontSize: 12, fontWeight: FontWeight.w600)),
                ],
              ),
            ),
          // Progress dots + buttons
          Padding(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
              child: Row(
                children: [
                  // Previous
                  TextButton.icon(
                    onPressed: current > 0 ? () => _pageController.previousPage(duration: const Duration(milliseconds: 250), curve: Curves.easeInOut) : null,
                    icon: const Icon(Icons.chevron_left, size: 20),
                    label: const Text('Sebelumnya', style: TextStyle(fontSize: 12)),
                    style: TextButton.styleFrom(visualDensity: VisualDensity.compact),
                  ),
                  const Spacer(),
                  // Dot indicators
                  GestureDetector(
                    onTap: () => _openPalette(),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: List.generate(total, (i) {
                        final q = examState.questions[i];
                        final qId = q['question']?['id'] ?? q['id'] ?? '';
                        final isAnswered = examState.answers.containsKey(qId);
                        final isCurrent = i == current;
                        return AnimatedContainer(
                          duration: const Duration(milliseconds: 200),
                          margin: const EdgeInsets.symmetric(horizontal: 3),
                          width: isCurrent ? 12 : 8,
                          height: isCurrent ? 12 : 8,
                          decoration: BoxDecoration(
                            shape: BoxShape.circle,
                            color: isCurrent
                                ? theme.colorScheme.primary
                                : isAnswered
                                    ? theme.colorScheme.primary.withValues(alpha: 0.5)
                                    : theme.colorScheme.outline.withValues(alpha: 0.3),
                            border: isCurrent ? Border.all(color: theme.colorScheme.primary, width: 0) : null,
                          ),
                        );
                      }),
                    ),
                  ),
                  const Spacer(),
                  // Next
                  TextButton.icon(
                    onPressed: current < total - 1
                        ? () => _pageController.nextPage(duration: const Duration(milliseconds: 250), curve: Curves.easeInOut)
                        : null,
                    icon: const Icon(Icons.chevron_right, size: 20),
                    label: const Text('Selanjutnya', style: TextStyle(fontSize: 12)),
                    style: TextButton.styleFrom(visualDensity: VisualDensity.compact),
                    iconAlignment: IconAlignment.end,
                  ),
                ],
              ),
            ),
            // Question counter
            Padding(
              padding: const EdgeInsets.only(bottom: 4),
              child: Text(
                '${current + 1} / $total',
                style: theme.textTheme.labelSmall?.copyWith(color: theme.colorScheme.onSurface.withValues(alpha: 0.5)),
              ),
            ),
            // Submit button
            Padding(
              padding: const EdgeInsets.fromLTRB(12, 0, 12, 8),
              child: SizedBox(
                width: double.infinity,
                height: 44,
                child: ElevatedButton.icon(
                  onPressed: () {
                    showDialog(
                      context: context,
                      builder: (ctx) => AlertDialog(
                        title: const Text('Submit Exam?'),
                        content: Text(answered < total
                            ? 'You have answered $answered of $total questions. Are you sure you want to submit?'
                            : 'All questions have been answered. Submit now?'),
                        actions: [
                          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('CANCEL')),
                          TextButton(
                            onPressed: () { Navigator.pop(ctx); _submitExam(); },
                            child: const Text('SUBMIT', style: TextStyle(color: Colors.red)),
                          ),
                        ],
                      ),
                    );
                  },
                  icon: const Icon(Icons.assignment_turned_in, size: 18),
                  label: const Text('Submit', style: TextStyle(fontWeight: FontWeight.w600)),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.red.shade600,
                    foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildEssayInput(ThemeData theme, String questionId, ExamState examState) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: TextFormField(
        key: ValueKey('essay_$questionId'),
        initialValue: examState.answers[questionId] ?? '',
        maxLines: 5,
        minLines: 3,
        style: theme.textTheme.bodyMedium,
        decoration: InputDecoration(
          hintText: 'Tulis jawaban Anda di sini...',
          hintStyle: TextStyle(color: theme.colorScheme.onSurface.withValues(alpha: 0.4)),
          border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(12),
          ),
          filled: true,
          fillColor: theme.colorScheme.surfaceContainerHighest.withValues(alpha: 0.3),
          contentPadding: const EdgeInsets.all(14),
        ),
        onChanged: (value) {
          ref.read(examProvider.notifier).saveAnswer(
            questionId: questionId,
            answer: value,
            dio: _dio,
            onSaved: () {},
          );
        },
      ),
    );
  }

  void _openPalette() {
    final examState = ref.read(examProvider);
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) => QuestionPalette(
        questions: examState.questions,
        answers: examState.answers,
        currentIndex: examState.currentIndex,
        onPageChanged: (i) {
          _pageController.jumpToPage(i);
          ref.read(examProvider.notifier).setCurrentIndex(i);
          Navigator.pop(ctx);
        },
        onSubmit: () {
          Navigator.pop(ctx);
          _submitExam();
        },
      ),
    );
  }

  Color _difficultyColor(String d) {
    switch (d) {
      case 'EASY':
        return Colors.green;
      case 'HARD':
        return Colors.red;
      default:
        return Colors.orange;
    }
  }

  String _difficultyLabel(String d) {
    switch (d) {
      case 'EASY':
        return 'Mudah';
      case 'HARD':
        return 'Sulit';
      case 'MEDIUM':
        return 'Sedang';
      default:
        return d;
    }
  }
}
