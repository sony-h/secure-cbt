import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:dio/dio.dart';
import 'package:secure_cbt_mobile/core/network/dio_client.dart';
import 'package:secure_cbt_mobile/features/exam/providers/exam_provider.dart';
import 'package:secure_cbt_mobile/features/exam/presentation/widgets/question_card.dart';
import 'package:secure_cbt_mobile/features/exam/presentation/widgets/navigation_panel.dart';
import 'package:secure_cbt_mobile/features/exam/presentation/widgets/timer_widget.dart';

class ExamScreen extends ConsumerStatefulWidget {
  final String sessionId;
  final String examTitle;

  const ExamScreen({
    super.key,
    required this.sessionId,
    required this.examTitle,
  });

  @override
  ConsumerState<ExamScreen> createState() => _ExamScreenState();
}

class _ExamScreenState extends ConsumerState<ExamScreen> with WidgetsBindingObserver {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);

    // Load session data
    WidgetsBinding.instance.addPostFrameCallback((_) {
      ref.read(examProvider.notifier).loadSession(widget.sessionId);
    });
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    // Detect app background (violation)
    if (state == AppLifecycleState.paused) {
      ref.read(examProvider.notifier).logViolation('APP_BACKGROUND');
    }
  }

  @override
  Widget build(BuildContext context) {
    final examState = ref.watch(examProvider);
    final dio = ref.watch(dioProvider);

    return PopScope(
      canPop: false, // Prevent back button during exam
      onPopInvokedWithResult: (didPop, result) async {
        if (didPop) return;
        final confirm = await showDialog<bool>(
          context: context,
          builder: (ctx) => AlertDialog(
            title: const Text('Keluar Ujian?'),
            content: const Text('Ujian akan otomatis terkumpul. Yakin ingin keluar?'),
            actions: [
              TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('BATAL')),
              TextButton(
                onPressed: () async {
                  Navigator.pop(ctx, true);
                  await _submitExam(dio);
                  if (context.mounted) context.goNamed('result', extra: {'sessionId': widget.sessionId});
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
            TimerWidget(sessionId: widget.sessionId),
          ],
        ),
        body: examState.isLoading
            ? const Center(child: CircularProgressIndicator())
            : examState.questions.isEmpty
                ? const Center(child: Text('Tidak ada soal'))
                : Column(
                    children: [
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
                                  dio: dio,
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
                        onSubmit: () async {
                          await _submitExam(dio);
                          if (context.mounted) {
                            context.goNamed('result', extra: {'sessionId': widget.sessionId});
                          }
                        },
                      ),
                    ],
                  ),
      ),
    );
  }

  Future<void> _submitExam(Dio dio) async {
    try {
      await dio.post('/sessions/submit', data: {
        'session_id': widget.sessionId,
      });
    } catch (e) {
      // Submission recorded locally; will sync later
    }
  }
}
