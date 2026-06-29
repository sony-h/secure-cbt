import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:dio/dio.dart';
import 'package:secure_cbt_mobile/app/route_names.dart';
import 'package:secure_cbt_mobile/core/logger/logger.dart';
import 'package:secure_cbt_mobile/core/network/dio_client.dart';
import 'package:secure_cbt_mobile/core/network/socket_client.dart';
import 'package:secure_cbt_mobile/features/auth/providers/auth_provider.dart';
import 'package:secure_cbt_mobile/features/exam/providers/exam_provider.dart';
import 'package:secure_cbt_mobile/features/exam/presentation/widgets/exam_app_bar.dart';
import 'package:secure_cbt_mobile/features/exam/presentation/widgets/exam_question_card.dart';
import 'package:secure_cbt_mobile/features/exam/presentation/widgets/exam_bottom_bar.dart';
import 'package:secure_cbt_mobile/features/exam/presentation/widgets/question_palette.dart';
import 'package:secure_cbt_mobile/features/exam/presentation/widgets/submit_dialog.dart';

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
  bool _violationPending = false;

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

      SystemChrome.setEnabledSystemUIMode(SystemUiMode.immersiveSticky);
      SystemChrome.setPreferredOrientations([
        DeviceOrientation.portraitUp,
        DeviceOrientation.portraitDown,
      ]);

      final notifier = ref.read(examProvider.notifier);
      notifier.setOnForceSubmit(() => _forceSubmit());
      notifier.loadSession(widget.sessionId, questions, remainingSeconds, _dio);
      notifier.setWarningLimit(warningLimit);

      final authState = ref.read(authProvider);
      final examId = session['exam_id'] ?? session['exam']?['id'] ?? '';
      final studentName = authState.fullName ?? '';
      if (authState.userId != null) {
        final socket = ref.read(monitoringSocketProvider);
        socket.connect(authState.userId!, examId, studentName: studentName);
        notifier.setOnAnswerSaved((questionId) {
          socket.emitAnswerSaved(widget.sessionId, questionId, examId);
        });
        notifier.setOnViolation((event, count, sessionId) {
          socket.emitViolation(examId, count, event, sessionId ?? widget.sessionId, studentName: studentName);
        });
      }

      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (!mounted) return;
        WidgetsBinding.instance.addObserver(this);
        Future.delayed(const Duration(milliseconds: 1500), () {
          if (mounted) _violationsEnabled = true;
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
                onPressed: () => context.goNamed(RouteNames.token),
                child: const Text('KEMBALI'),
              ),
              TextButton(
                onPressed: () { Navigator.pop(ctx); _loadSessionData(); },
                child: const Text('COBA LAGI'),
              ),
            ],
          ),
        );
      }
    } catch (e) {
      AppLogger.error('Failed to load session', e);
      if (mounted) context.goNamed(RouteNames.token);
    }
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (!_violationsEnabled) return;
    final notifier = ref.read(examProvider.notifier);
    switch (state) {
      case AppLifecycleState.paused:
      case AppLifecycleState.hidden:
        notifier.pauseTimer();
        if (!_violationPending) {
          _violationPending = true;
          notifier.logViolation('APP_MINIMIZED');
          _showViolationSnackbar('Peringatan! Aplikasi tidak boleh diminimalkan.');
        }
        break;
      case AppLifecycleState.resumed:
        _violationPending = false;
        notifier.resumeTimer();
        SystemChrome.setEnabledSystemUIMode(SystemUiMode.immersiveSticky);
        break;
      case AppLifecycleState.inactive:
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
      _submitting = false;
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Auto-submit gagal: ${e.toString()}'),
            backgroundColor: Colors.red.shade700,
          ),
        );
      }
      return;
    }
    ref.read(examProvider.notifier).markSubmitted();
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: const Text('Exam auto-submitted: warning limit exceeded.'),
          backgroundColor: Colors.red.shade700,
          duration: const Duration(seconds: 5),
        ),
      );
      await Future.delayed(const Duration(seconds: 2));
      if (mounted) context.goNamed(RouteNames.result, extra: {'sessionId': widget.sessionId});
    }
  }

  Future<void> _submitExam() async {
    if (_submitting) return;
    _submitting = true;
    try {
      await _dio.post('/sessions/submit', data: {'session_id': widget.sessionId});
    } catch (e) {
      AppLogger.error('Submit failed', e);
      _submitting = false;
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Submit gagal: ${e.toString()}'),
            backgroundColor: Colors.red.shade700,
          ),
        );
      }
      return;
    }
    ref.read(examProvider.notifier).markSubmitted();
    if (mounted) context.goNamed(RouteNames.result, extra: {'sessionId': widget.sessionId});
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
        flagged: examState.flagged,
        onPageChanged: (i) {
          _pageController.jumpToPage(i);
          ref.read(examProvider.notifier).setCurrentIndex(i);
          Navigator.pop(ctx);
        },
        onSubmit: () => _submitExam(),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final examState = ref.watch(examProvider);
    final theme = Theme.of(context);

    return PopScope(
      canPop: false,
      onPopInvokedWithResult: (didPop, result) async {
        if (didPop) return;
        final ok = await showWarningSubmitDialog(context);
        if (ok == true) _submitExam();
      },
      child: Scaffold(
        backgroundColor: theme.colorScheme.surface,
        appBar: ExamAppBar(
          title: widget.examTitle,
          examState: examState,
        ),
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
                    itemBuilder: (context, index) => ExamQuestionCard(
                      question: examState.questions[index],
                      examState: examState,
                      index: index,
                      onSaveAnswer: (qId, answer) {
                        ref.read(examProvider.notifier).saveAnswer(
                          questionId: qId,
                          answer: answer,
                          dio: _dio,
                          onSaved: () {},
                        );
                      },
                      onToggleFlag: (qId) {
                        ref.read(examProvider.notifier).toggleFlag(qId);
                      },
                    ),
                  ),
        bottomNavigationBar: (examState.isLoading || examState.questions.isEmpty)
            ? null
            : ExamBottomBar(
                total: examState.questions.length,
                current: examState.currentIndex,
                answered: examState.answers.length,
                showSaveIndicator: examState.showSaveIndicator,
                onSubmit: () async {
                  final ok = await showSubmitDialog(
                    context,
                    answered: examState.answers.length,
                    total: examState.questions.length,
                  );
                  if (ok == true) _submitExam();
                },
                onPrevious: examState.currentIndex > 0
                    ? () => _pageController.previousPage(
                          duration: const Duration(milliseconds: 250),
                          curve: Curves.easeInOut,
                        )
                    : null,
                onNext: examState.currentIndex < examState.questions.length - 1
                    ? () => _pageController.nextPage(
                          duration: const Duration(milliseconds: 250),
                          curve: Curves.easeInOut,
                        )
                    : null,
                onOpenPalette: _openPalette,
              ),
      ),
    );
  }
}
