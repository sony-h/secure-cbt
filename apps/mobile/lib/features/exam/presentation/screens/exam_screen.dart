import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:dio/dio.dart';
import 'package:secure_cbt_mobile/core/logger/logger.dart';
import 'package:secure_cbt_mobile/core/network/dio_client.dart';
import 'package:secure_cbt_mobile/features/exam/providers/exam_provider.dart';
import 'package:secure_cbt_mobile/features/exam/presentation/widgets/question_card.dart';
import 'package:secure_cbt_mobile/features/exam/presentation/widgets/navigation_panel.dart';
import 'package:secure_cbt_mobile/features/exam/presentation/widgets/timer_widget.dart';

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
  bool _submitting = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);

    _dio = ref.read(dioProvider);

    // Enter fullscreen immediately
    SystemChrome.setEnabledSystemUIMode(SystemUiMode.immersiveSticky);
    SystemChrome.setPreferredOrientations([
      DeviceOrientation.portraitUp,
      DeviceOrientation.portraitDown,
    ]);

    WidgetsBinding.instance.addPostFrameCallback((_) {
      final notifier = ref.read(examProvider.notifier);
      notifier.setWarningLimit(widget.warningLimit);
      notifier.setOnForceSubmit(() => _forceSubmit());
      notifier.loadSession(widget.sessionId);
    });
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    SystemChrome.setEnabledSystemUIMode(SystemUiMode.edgeToEdge);
    SystemChrome.setPreferredOrientations(DeviceOrientation.values);
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    final notifier = ref.read(examProvider.notifier);

    switch (state) {
      case AppLifecycleState.paused:
        // App going to background = violation
        notifier.logViolation('APP_MINIMIZED');
        _showViolationSnackbar('Peringatan! Aplikasi tidak boleh diminimalkan.');
        break;
      case AppLifecycleState.inactive:
        // App losing focus (e.g., notification drawer, split screen) = violation
        notifier.logViolation('APP_INACTIVE');
        break;
      case AppLifecycleState.resumed:
        // Re-enforce fullscreen when app returns
        SystemChrome.setEnabledSystemUIMode(SystemUiMode.immersiveSticky);
        break;
      case AppLifecycleState.hidden:
        notifier.logViolation('APP_HIDDEN');
        break;
      case AppLifecycleState.detached:
        notifier.logViolation('APP_DETACHED');
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
        action: SnackBarAction(
          label: 'OK',
          textColor: Colors.white,
          onPressed: () {},
        ),
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
      if (mounted) {
        context.goNamed('result', extra: {'sessionId': widget.sessionId});
      }
    }
  }

  Future<void> _submitExam() async {
    if (_submitting) return;
    _submitting = true;

    try {
      await _dio.post('/sessions/submit', data: {
        'session_id': widget.sessionId,
      });
    } catch (e) {
      AppLogger.error('Submit failed', e);
    }

    ref.read(examProvider.notifier).markSubmitted();
    if (mounted) {
      context.goNamed('result', extra: {'sessionId': widget.sessionId});
    }
  }

  @override
  Widget build(BuildContext context) {
    final examState = ref.watch(examProvider);

    return PopScope(
      canPop: false,
      onPopInvokedWithResult: (didPop, result) async {
        if (didPop) return;
        await showDialog<bool>(
          context: context,
          builder: (ctx) => AlertDialog(
            title: const Text('Keluar Ujian?'),
            content: const Text('Ujian akan otomatis terkumpul. Yakin ingin keluar?'),
            actions: [
              TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('BATAL')),
              TextButton(
                onPressed: () async {
                  Navigator.pop(ctx, true);
                  await _submitExam();
                },
                child: const Text('KUMPULKAN', style: TextStyle(color: Colors.red)),
              ),
            ],
          ),
        );
      },
      child: Scaffold(
        appBar: AppBar(
          title: Text(widget.examTitle),
          automaticallyImplyLeading: false,
          actions: [
            // Warning indicator
            if (examState.warningCount > 0)
              Padding(
                padding: const EdgeInsets.only(right: 8),
                child: Chip(
                  avatar: Icon(Icons.warning_amber, size: 16, color: Colors.red.shade700),
                  label: Text('${examState.warningCount}/${examState.warningLimit}',
                      style: TextStyle(fontSize: 12, color: Colors.red.shade700)),
                  backgroundColor: Colors.red.shade50,
                  side: BorderSide.none,
                ),
              ),
            TimerWidget(sessionId: widget.sessionId),
          ],
        ),
        body: examState.isLoading
            ? const Center(child: CircularProgressIndicator())
            : examState.questions.isEmpty
                ? const Center(child: Text('Tidak ada soal'))
                : Column(
                    children: [
                      // Fullscreen warning banner
                      if (!examState.isFullscreen)
                        Container(
                          width: double.infinity,
                          padding: const EdgeInsets.symmetric(vertical: 6, horizontal: 16),
                          color: Colors.orange.shade100,
                          child: Row(
                            children: [
                              Icon(Icons.fullscreen_exit, size: 16, color: Colors.orange.shade800),
                              const SizedBox(width: 8),
                              Text('Mode fullscreen diperlukan', style: TextStyle(fontSize: 12, color: Colors.orange.shade800)),
                              const Spacer(),
                              TextButton(
                                onPressed: () {
                                  SystemChrome.setEnabledSystemUIMode(SystemUiMode.immersiveSticky);
                                  ref.read(examProvider.notifier).logViolation('FULLSCREEN_RESTORE');
                                },
                                child: const Text('Aktifkan', style: TextStyle(fontSize: 12)),
                              ),
                            ],
                          ),
                        ),

                      // Question display
                      Expanded(
                        child: PageView.builder(
                          controller: PageController(initialPage: examState.currentIndex),
                          itemCount: examState.questions.length,
                          onPageChanged: (index) {
                            ref.read(examProvider.notifier).setCurrentIndex(index);
                          },
                          itemBuilder: (context, index) {
                            final question = examState.questions[index];
                            return QuestionCard(
                              question: question,
                              selectedAnswer: examState.answers[question['id']],
                              onAnswerChanged: (answer) {
                                ref.read(examProvider.notifier).saveAnswer(
                                  questionId: question['id'],
                                  answer: answer,
                                  dio: _dio,
                                );
                              },
                            );
                          },
                        ),
                      ),

                      // Navigation panel
                      NavigationPanel(
                        totalQuestions: examState.questions.length,
                        currentIndex: examState.currentIndex,
                        answeredQuestions: examState.answers,
                        onPageChanged: (index) {
                          ref.read(examProvider.notifier).setCurrentIndex(index);
                        },
                        onSubmit: () async => _submitExam(),
                      ),
                    ],
                  ),
      ),
    );
  }
}
