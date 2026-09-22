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
import 'package:secure_cbt_mobile/features/exam/presentation/handlers/exam_submit_handler.dart';
import 'package:secure_cbt_mobile/features/exam/presentation/handlers/exam_violation_handler.dart';
import 'package:secure_cbt_mobile/core/theme/theme.dart';
import 'package:secure_cbt_mobile/core/security/screen_security.dart';

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
  ExamSubmitHandler? _submitHandler;
  ExamViolationHandler? _violationHandler;

  @override
  void initState() {
    super.initState();
    _dio = ref.read(dioProvider);
    _pageController = PageController();
    _violationHandler = ExamViolationHandler(ref: ref, context: context);
    WidgetsBinding.instance.addPostFrameCallback((_) => _loadSessionData());
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _pageController.dispose();
    ref.read(monitoringSocketProvider).disconnect();
    ScreenSecurity.disable();
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
            const SnackBar(content: Text('Tidak ada soal untuk ujian ini'), backgroundColor: Colors.red),
          );
        }
        return;
      }

      SystemChrome.setEnabledSystemUIMode(SystemUiMode.immersiveSticky);
      SystemChrome.setPreferredOrientations([
        DeviceOrientation.portraitUp,
        DeviceOrientation.portraitDown,
      ]);
      ScreenSecurity.enable();

      final notifier = ref.read(examProvider.notifier);
      _submitHandler = ExamSubmitHandler(dio: _dio, sessionId: widget.sessionId, ref: ref, context: context);
      notifier.setOnForceSubmit(() => _submitHandler!.forceSubmit());
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
          if (mounted) _violationHandler?.enable();
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
              TextButton(onPressed: () => context.goNamed(RouteNames.token), child: const Text('KEMBALI')),
              TextButton(onPressed: () { Navigator.pop(ctx); _loadSessionData(); }, child: const Text('COBA LAGI')),
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
    super.didChangeAppLifecycleState(state);
    _violationHandler?.handleLifecycleChange(state);
  }

  void _openPalette() {
    final examState = ref.read(examProvider);
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
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
        onSubmit: () => _submitHandler?.submitExam(),
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
        final examState = ref.read(examProvider);
        final ok = await showSubmitDialog(context, answered: examState.answers.length, total: examState.questions.length, isWarning: true);
        if (ok == true && _submitHandler != null) {
          final handler = _submitHandler!;
          if (!handler.isSubmitting) handler.submitExam();
        }
      },
      child: Scaffold(
        backgroundColor: AppColors.canvas,
        appBar: ExamAppBar(title: widget.examTitle, examState: examState),
        body: examState.isLoading
            ? const Center(child: CircularProgressIndicator())
            : examState.questions.isEmpty
                ? Center(
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(Icons.assignment_late, size: 64, color: theme.colorScheme.onSurfaceVariant.withValues(alpha: 0.6)),
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
                          questionId: qId, answer: answer, dio: _dio, onSaved: () {},
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
                  final ok = await showSubmitDialog(context,
                    answered: examState.answers.length,
                    total: examState.questions.length,
                  );
                  if (ok == true && _submitHandler != null) {
                    final handler = _submitHandler!;
                    if (!handler.isSubmitting) handler.submitExam();
                  }
                },
                onPrevious: examState.currentIndex > 0
                    ? () => _pageController.previousPage(duration: const Duration(milliseconds: 250), curve: Curves.easeInOut)
                    : null,
                onNext: examState.currentIndex < examState.questions.length - 1
                    ? () => _pageController.nextPage(duration: const Duration(milliseconds: 250), curve: Curves.easeInOut)
                    : null,
                onOpenPalette: _openPalette,
              ),
      ),
    );
  }
}
