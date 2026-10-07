import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:dio/dio.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:secure_cbt_mobile/app/route_names.dart';
import 'package:secure_cbt_mobile/core/logger/logger.dart';
import 'package:secure_cbt_mobile/core/network/dio_client.dart';
import 'package:secure_cbt_mobile/core/network/socket_client.dart';
import 'package:secure_cbt_mobile/features/auth/providers/auth_provider.dart';
import 'package:secure_cbt_mobile/features/exam/providers/exam_provider.dart';
import 'package:secure_cbt_mobile/features/exam/providers/exam_state.dart';
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
  StreamSubscription<bool>? _multiWindowSubscription;
  StreamSubscription<bool>? _windowFocusSubscription;

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
    _multiWindowSubscription?.cancel();
    _windowFocusSubscription?.cancel();
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

      if (!mounted) return;

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

      _precacheExamImages(questions);

      WidgetsBinding.instance.addPostFrameCallback((_) async {
        if (!mounted) return;
        WidgetsBinding.instance.addObserver(this);

        // Listen for realtime multi-window / split-screen changes
        _multiWindowSubscription?.cancel();
        _multiWindowSubscription = ScreenSecurity.onMultiWindowChanged.listen((isMulti) {
          if (!mounted) return;
          ref.read(examProvider.notifier).setDualScreenBlocked(isMulti);
        });

        // Listen for realtime window focus changes (notification panel / status bar pull-down)
        _windowFocusSubscription?.cancel();
        _windowFocusSubscription = ScreenSecurity.onWindowFocusChanged.listen((hasFocus) {
          if (!mounted) return;
          ref.read(examProvider.notifier).setWindowFocus(hasFocus);
        });

        // Initial multi-window check
        final isMulti = await ScreenSecurity.isMultiWindowMode();
        if (isMulti && mounted) {
          ref.read(examProvider.notifier).setDualScreenBlocked(true);
        }

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

  void _precacheExamImages(List<Map<String, dynamic>> questions) {
    for (final q in questions) {
      final qData = q['question'] as Map<String, dynamic>? ?? q;
      final qImg = qData['image_url']?.toString();
      if (qImg != null && qImg.isNotEmpty && mounted) {
        precacheImage(CachedNetworkImageProvider(resolveMediaUrl(qImg)), context).catchError((_) {});
      }

      final options = qData['options'] as List<dynamic>?;
      if (options != null) {
        for (final opt in options) {
          if (opt is Map) {
            final optImg = opt['image_url']?.toString();
            if (optImg != null && optImg.isNotEmpty && mounted) {
              precacheImage(CachedNetworkImageProvider(resolveMediaUrl(optImg)), context).catchError((_) {});
            }
          }
        }
      }
    }
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
      onPopInvokedWithResult: (didPop, result) {
        // Back gesture / hardware button is completely disabled during exam
      },
      child: Scaffold(
        backgroundColor: AppColors.canvas,
        appBar: ExamAppBar(title: widget.examTitle, examState: examState),
        body: examState.isDualScreenBlocked
            ? _DualScreenBlockedOverlay(examState: examState)
            : examState.isWarningOverlayActive
                ? _WarningDangerOverlay(
                    examState: examState,
                    onCountdownComplete: () {
                      ref.read(examProvider.notifier).finishWarningOverlayCountdown();
                    },
                  )
                : examState.isFocusLostBlocked
                    ? _FocusLostBlockedOverlay(examState: examState)
                    : examState.isLoading
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
        bottomNavigationBar: (examState.isDualScreenBlocked ||
                examState.isWarningOverlayActive ||
                examState.isFocusLostBlocked ||
                examState.isLoading ||
                examState.questions.isEmpty)
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

class _DualScreenBlockedOverlay extends StatelessWidget {
  final ExamState examState;

  const _DualScreenBlockedOverlay({required this.examState});

  @override
  Widget build(BuildContext context) {
    return Container(
      color: AppColors.canvas,
      width: double.infinity,
      height: double.infinity,
      padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 32),
      child: Center(
        child: SingleChildScrollView(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              // Warning Emblem
              Container(
                width: 80,
                height: 80,
                decoration: BoxDecoration(
                  color: AppColors.errorContainer,
                  shape: BoxShape.circle,
                  border: Border.all(
                    color: AppColors.error.withValues(alpha: 0.3),
                    width: 2,
                  ),
                  boxShadow: [
                    BoxShadow(
                      color: AppColors.error.withValues(alpha: 0.15),
                      blurRadius: 16,
                      offset: const Offset(0, 6),
                    ),
                  ],
                ),
                child: const Center(
                  child: Icon(
                    Icons.splitscreen_rounded,
                    size: 40,
                    color: AppColors.error,
                  ),
                ),
              ),
              const SizedBox(height: 20),

              // Title
              const Text(
                'Layar Terpisah / Pop-Up Terdeteksi!',
                textAlign: TextAlign.center,
                style: TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.w800,
                  letterSpacing: -0.4,
                  color: AppColors.textPrimary,
                ),
              ),
              const SizedBox(height: 8),

              // Description
              const Text(
                'Aplikasi Secure CBT melarang penggunaan mode layar terpisah (split-screen) atau jendela mengambang demi menjaga integritas ujian.',
                textAlign: TextAlign.center,
                style: TextStyle(
                  fontSize: 13,
                  height: 1.5,
                  color: AppColors.textSecondary,
                ),
              ),
              const SizedBox(height: 20),

              // Action Guidance Box
              Container(
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: AppColors.surface,
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(color: AppColors.border),
                  boxShadow: AppShadows.card,
                ),
                child: const Row(
                  children: [
                    Icon(
                      Icons.fullscreen_rounded,
                      color: AppColors.primary,
                      size: 22,
                    ),
                    SizedBox(width: 10),
                    Expanded(
                      child: Text(
                        'Tutup aplikasi lain dan kembalikan ke satu layar penuh untuk melanjutkan.',
                        style: TextStyle(
                          fontSize: 12.5,
                          fontWeight: FontWeight.w600,
                          color: AppColors.textPrimary,
                          height: 1.35,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 16),

              // Violation count badge
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
                decoration: BoxDecoration(
                  color: AppColors.errorContainer,
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(color: AppColors.error.withValues(alpha: 0.3)),
                ),
                child: Text(
                  'Peringatan Pelanggaran: ${examState.warningCount}/${examState.warningLimit}',
                  style: const TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w700,
                    color: AppColors.error,
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _FocusLostBlockedOverlay extends StatelessWidget {
  final ExamState examState;

  const _FocusLostBlockedOverlay({required this.examState});

  @override
  Widget build(BuildContext context) {
    return Container(
      color: AppColors.canvas,
      width: double.infinity,
      height: double.infinity,
      padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 32),
      child: Center(
        child: SingleChildScrollView(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Container(
                width: 76,
                height: 76,
                decoration: BoxDecoration(
                  color: AppColors.surfaceSubtle,
                  shape: BoxShape.circle,
                  border: Border.all(color: AppColors.border, width: 2),
                ),
                child: const Center(
                  child: Icon(
                    Icons.notifications_paused_rounded,
                    size: 38,
                    color: AppColors.textSecondary,
                  ),
                ),
              ),
              const SizedBox(height: 18),
              const Text(
                'Bilah Status / Panel Notifikasi Terdeteksi',
                textAlign: TextAlign.center,
                style: TextStyle(
                  fontSize: 17,
                  fontWeight: FontWeight.w800,
                  color: AppColors.textPrimary,
                ),
              ),
              const SizedBox(height: 8),
              const Text(
                'Akses ke soal ditutup sementara. Geser kembali ke atas sekarang untuk melanjutkan ujian.',
                textAlign: TextAlign.center,
                style: TextStyle(
                  fontSize: 13,
                  height: 1.5,
                  color: AppColors.textSecondary,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _WarningDangerOverlay extends StatefulWidget {
  final ExamState examState;
  final VoidCallback onCountdownComplete;

  const _WarningDangerOverlay({
    required this.examState,
    required this.onCountdownComplete,
  });

  @override
  State<_WarningDangerOverlay> createState() => _WarningDangerOverlayState();
}

class _WarningDangerOverlayState extends State<_WarningDangerOverlay> {
  int _countdown = 10;
  Timer? _timer;

  @override
  void initState() {
    super.initState();
    _startCountdown();
  }

  @override
  void didUpdateWidget(covariant _WarningDangerOverlay oldWidget) {
    super.didUpdateWidget(oldWidget);
    // If a new violation strike was logged (e.g. anti-loophole retrigger), restart countdown!
    if (oldWidget.examState.warningCount != widget.examState.warningCount) {
      _startCountdown();
    }
  }

  void _startCountdown() {
    _timer?.cancel();
    setState(() {
      _countdown = 10;
    });
    _timer = Timer.periodic(const Duration(seconds: 1), (timer) {
      if (!mounted) {
        timer.cancel();
        return;
      }
      if (_countdown > 1) {
        setState(() {
          _countdown--;
        });
      } else {
        setState(() {
          _countdown = 0;
        });
        timer.cancel();
        widget.onCountdownComplete();
      }
    });
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final isMinimized = widget.examState.currentViolationEvent == 'APP_MINIMIZED';
    final reasonTitle = isMinimized
        ? 'Aplikasi Diminimalkan / Pindah Aplikasi'
        : 'Bilah Status / Panel Notifikasi Dibuka';
    final reasonDesc = isMinimized
        ? 'Anda terdeteksi meminimalkan aplikasi Secure CBT atau beralih ke aplikasi lain selama ujian berlangsung.'
        : 'Anda terdeteksi menarik bilah status atau membuka panel notifikasi di atas layar ujian.';

    return Container(
      width: double.infinity,
      height: double.infinity,
      decoration: const BoxDecoration(
        gradient: LinearGradient(
          colors: [Color(0xFF7F1D1D), Color(0xFF991B1B), Color(0xFF881337)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
      ),
      padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 32),
      child: Center(
        child: SingleChildScrollView(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              // Pulsing Danger Emblem
              Container(
                width: 86,
                height: 86,
                decoration: BoxDecoration(
                  color: Colors.white.withValues(alpha: 0.15),
                  shape: BoxShape.circle,
                  border: Border.all(
                    color: Colors.white.withValues(alpha: 0.35),
                    width: 3,
                  ),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withValues(alpha: 0.3),
                      blurRadius: 24,
                      offset: const Offset(0, 8),
                    ),
                  ],
                ),
                child: const Center(
                  child: Icon(
                    Icons.gavel_rounded,
                    size: 46,
                    color: Colors.white,
                  ),
                ),
              ),
              const SizedBox(height: 22),

              // Title
              const Text(
                'PERINGATAN KEAMANAN UJIAN!',
                textAlign: TextAlign.center,
                style: TextStyle(
                  fontSize: 20,
                  fontWeight: FontWeight.w900,
                  letterSpacing: -0.3,
                  color: Colors.white,
                ),
              ),
              const SizedBox(height: 12),

              // Strike Counter Badge
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
                decoration: BoxDecoration(
                  color: Colors.white.withValues(alpha: 0.2),
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(color: Colors.white.withValues(alpha: 0.45)),
                ),
                child: Text(
                  'PELANGGARAN #${widget.examState.warningCount} DARI ${widget.examState.warningLimit}',
                  style: const TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w900,
                    letterSpacing: 0.5,
                    color: Colors.white,
                  ),
                ),
              ),
              const SizedBox(height: 20),

              // Detailed Reason Card
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: Colors.black.withValues(alpha: 0.25),
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: Colors.white.withValues(alpha: 0.2)),
                ),
                child: Column(
                  children: [
                    Text(
                      reasonTitle,
                      textAlign: TextAlign.center,
                      style: const TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w800,
                        color: Color(0xFFFDE047), // Amber warning
                      ),
                    ),
                    const SizedBox(height: 6),
                    Text(
                      reasonDesc,
                      textAlign: TextAlign.center,
                      style: const TextStyle(
                        fontSize: 12.5,
                        height: 1.45,
                        color: Colors.white,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 14),

              // Guilt & Proctor Report Notice
              Text(
                'Pelanggaran ini telah dicatat dan dilaporkan langsung ke pengawas ujian secara real-time. Layar Anda terkunci selama 10 detik sebagai sanksi penalti.',
                textAlign: TextAlign.center,
                style: TextStyle(
                  fontSize: 12,
                  height: 1.5,
                  color: Colors.white.withValues(alpha: 0.85),
                  fontWeight: FontWeight.w400,
                ),
              ),
              const SizedBox(height: 24),

              // Automatic Timer Countdown Box (No Click Button!)
              Container(
                width: double.infinity,
                padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 20),
                decoration: BoxDecoration(
                  color: Colors.black.withValues(alpha: 0.35),
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: Colors.white.withValues(alpha: 0.3)),
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    const SizedBox(
                      width: 18,
                      height: 18,
                      child: CircularProgressIndicator(
                        strokeWidth: 2.5,
                        valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                      ),
                    ),
                    const SizedBox(width: 14),
                    Flexible(
                      child: Text(
                        'Layar ujian akan dibuka kembali otomatis dalam $_countdown detik...',
                        textAlign: TextAlign.center,
                        style: const TextStyle(
                          color: Colors.white,
                          fontWeight: FontWeight.w700,
                          fontSize: 13,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
