import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:secure_cbt_mobile/app/route_names.dart';
import 'package:secure_cbt_mobile/core/theme/theme.dart';
import 'package:secure_cbt_mobile/core/widgets/app_card.dart';
import 'package:secure_cbt_mobile/core/widgets/bouncing_button.dart';
import 'package:secure_cbt_mobile/core/widgets/confetti_celebration.dart';
import 'package:secure_cbt_mobile/core/widgets/count_up_text.dart';
import 'package:secure_cbt_mobile/core/widgets/status_pill.dart';
import 'package:secure_cbt_mobile/features/exam/providers/result_provider.dart';
import 'package:secure_cbt_mobile/features/exams/providers/exams_provider.dart';
import 'package:secure_cbt_mobile/features/history/providers/history_provider.dart';
import 'package:secure_cbt_mobile/features/home/providers/home_provider.dart';

class ResultScreen extends ConsumerStatefulWidget {
  final String sessionId;

  const ResultScreen({super.key, required this.sessionId});

  @override
  ConsumerState<ResultScreen> createState() => _ResultScreenState();
}

class _ResultScreenState extends ConsumerState<ResultScreen> {
  bool _showContent = false;

  @override
  void initState() {
    super.initState();
    Future.delayed(const Duration(milliseconds: 150), () {
      if (mounted) setState(() => _showContent = true);
    });
  }

  void _backToHome() {
    ref.invalidate(homeDataProvider);
    ref.invalidate(examsDataProvider);
    ref.invalidate(historyDataProvider);
    context.goNamed(RouteNames.home);
  }

  @override
  Widget build(BuildContext context) {
    final resultAsync = ref.watch(examResultProvider(widget.sessionId));

    return PopScope(
      canPop: false,
      onPopInvokedWithResult: (didPop, result) {
        if (!didPop) _backToHome();
      },
      child: Scaffold(
        backgroundColor: AppColors.canvas,
        appBar: AppBar(
          title: const Text('Lembar Hasil Ujian'),
          automaticallyImplyLeading: false,
        ),
        body: SafeArea(
          child: resultAsync.isLoading
              ? const Center(child: CircularProgressIndicator(color: AppColors.primary))
              : resultAsync.hasError
                  ? Center(
                      child: Padding(
                        padding: const EdgeInsets.all(28),
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Container(
                              padding: const EdgeInsets.all(16),
                              decoration: const BoxDecoration(
                                color: AppColors.errorContainer,
                                shape: BoxShape.circle,
                              ),
                              child: const Icon(Icons.error_outline_rounded, size: 48, color: AppColors.error),
                            ),
                            const SizedBox(height: 16),
                            const Text(
                              'Gagal Memuat Hasil',
                              style: TextStyle(
                                fontSize: 18,
                                fontWeight: FontWeight.w700,
                                color: AppColors.textPrimary,
                              ),
                            ),
                            const SizedBox(height: 8),
                            Text(
                              resultAsync.error?.toString() ?? 'Terjadi kesalahan sistem saat memuat hasil ujian.',
                              textAlign: TextAlign.center,
                              style: const TextStyle(color: AppColors.textSecondary, fontSize: 13),
                            ),
                            const SizedBox(height: 24),
                            BouncingButton(
                              onTap: _backToHome,
                              child: Container(
                                padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
                                decoration: BoxDecoration(
                                  color: AppColors.primary,
                                  borderRadius: BorderRadius.circular(12),
                                ),
                                child: const Text('Kembali ke Beranda', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w700)),
                              ),
                            ),
                          ],
                        ),
                      ),
                    )
                  : Builder(
                      builder: (context) {
                        final totalScore = ((resultAsync.value?['total_score'] ?? 0.0) as num).toDouble();
                        final passed = totalScore >= 60.0;
                        final normalized = (totalScore / 100.0).clamp(0.0, 1.0);

                        return ConfettiCelebration(
                          play: passed,
                          child: SingleChildScrollView(
                            physics: const AlwaysScrollableScrollPhysics(),
                            padding: const EdgeInsets.fromLTRB(20, 16, 20, 36),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.stretch,
                              children: [
                                AnimatedOpacity(
                                  opacity: _showContent ? 1.0 : 0.0,
                                  duration: const Duration(milliseconds: 400),
                                  child: Column(
                                    children: [
                                      // Celebratory Hero Badge
                                      Container(
                                        width: 84,
                                        height: 84,
                                        decoration: BoxDecoration(
                                          gradient: LinearGradient(
                                            colors: passed
                                                ? [const Color(0xFF10B981), const Color(0xFF059669)]
                                                : [const Color(0xFFF59E0B), const Color(0xFFD97706)],
                                            begin: Alignment.topLeft,
                                            end: Alignment.bottomRight,
                                          ),
                                          shape: BoxShape.circle,
                                          boxShadow: [
                                            BoxShadow(
                                              color: (passed ? AppColors.success : AppColors.warning).withValues(alpha: 0.3),
                                              blurRadius: 16,
                                              offset: const Offset(0, 6),
                                            ),
                                          ],
                                        ),
                                        child: Center(
                                          child: Icon(
                                            passed ? Icons.emoji_events_rounded : Icons.military_tech_rounded,
                                            size: 46,
                                            color: Colors.white,
                                          ),
                                        ),
                                      ),
                                      const SizedBox(height: 16),
                                      Text(
                                        passed ? 'Selamat, Ujian Selesai!' : 'Ujian Telah Terkumpul!',
                                        textAlign: TextAlign.center,
                                        style: const TextStyle(
                                          fontSize: 22,
                                          fontWeight: FontWeight.w900,
                                          letterSpacing: -0.5,
                                          color: AppColors.textPrimary,
                                        ),
                                      ),
                                      const SizedBox(height: 4),
                                      Text(
                                        resultAsync.value?['exam_title'] ?? 'Ujian Selesai',
                                        textAlign: TextAlign.center,
                                        style: const TextStyle(
                                          fontSize: 14,
                                          fontWeight: FontWeight.w600,
                                          color: AppColors.primary,
                                        ),
                                      ),
                                    ],
                                  ),
                                ),

                                const SizedBox(height: 28),

                                // Radial Score Ring Card with Soft Glow
                                AppCard(
                                  padding: const EdgeInsets.symmetric(vertical: 32, horizontal: 20),
                                  child: Column(
                                    children: [
                                      SizedBox(
                                        width: 160,
                                        height: 160,
                                        child: Stack(
                                          fit: StackFit.expand,
                                          children: [
                                            // Soft ambient glow ring behind gauge
                                            Container(
                                              decoration: BoxDecoration(
                                                shape: BoxShape.circle,
                                                boxShadow: [
                                                  BoxShadow(
                                                    color: (passed ? AppColors.success : AppColors.warning).withValues(alpha: 0.12),
                                                    blurRadius: 20,
                                                    spreadRadius: 2,
                                                  ),
                                                ],
                                              ),
                                            ),
                                            const CircularProgressIndicator(
                                              value: 1.0,
                                              strokeWidth: 12,
                                              backgroundColor: Colors.transparent,
                                              valueColor: AlwaysStoppedAnimation(AppColors.surfaceSubtle),
                                            ),
                                            TweenAnimationBuilder<double>(
                                              tween: Tween<double>(begin: 0, end: normalized),
                                              duration: const Duration(milliseconds: 1200),
                                              curve: Curves.easeOutCubic,
                                              builder: (context, val, child) {
                                                return CircularProgressIndicator(
                                                  value: val,
                                                  strokeWidth: 12,
                                                  strokeCap: StrokeCap.round,
                                                  backgroundColor: Colors.transparent,
                                                  valueColor: AlwaysStoppedAnimation(
                                                    passed ? AppColors.success : AppColors.warning,
                                                  ),
                                                );
                                              },
                                            ),
                                            Center(
                                              child: Column(
                                                mainAxisAlignment: MainAxisAlignment.center,
                                                children: [
                                                  CountUpText(
                                                    end: totalScore,
                                                    style: TextStyle(
                                                      fontSize: 36,
                                                      fontWeight: FontWeight.w900,
                                                      letterSpacing: -1,
                                                      color: passed ? AppColors.success : AppColors.warning,
                                                    ),
                                                  ),
                                                  const SizedBox(height: 2),
                                                  const Text(
                                                    'Skor Akhir',
                                                    style: TextStyle(
                                                      fontSize: 11.5,
                                                      fontWeight: FontWeight.w600,
                                                      color: AppColors.textMuted,
                                                    ),
                                                  ),
                                                ],
                                              ),
                                            ),
                                          ],
                                        ),
                                      ),
                                      const SizedBox(height: 22),
                                      StatusPill.passOrFail(passed: passed),
                                    ],
                                  ),
                                ),

                                const SizedBox(height: 22),

                                // Summary Breakdown Section
                                const Text(
                                  'Statistik Pengerjaan',
                                  style: TextStyle(
                                    fontSize: 14,
                                    fontWeight: FontWeight.w700,
                                    letterSpacing: -0.2,
                                    color: AppColors.textPrimary,
                                  ),
                                ),
                                const SizedBox(height: 10),
                                AppCard(
                                  padding: const EdgeInsets.all(18),
                                  child: Column(
                                    children: [
                                      _SummaryRow(
                                        icon: Icons.check_circle_rounded,
                                        iconColor: AppColors.success,
                                        label: 'Jawaban Benar',
                                        value: '${resultAsync.value?['correct_count'] ?? 0}',
                                      ),
                                      const Padding(
                                        padding: EdgeInsets.symmetric(vertical: 12),
                                        child: Divider(height: 1, color: AppColors.border),
                                      ),
                                      _SummaryRow(
                                        icon: Icons.cancel_rounded,
                                        iconColor: AppColors.error,
                                        label: 'Jawaban Salah',
                                        value: '${resultAsync.value?['wrong_count'] ?? 0}',
                                      ),
                                      if (resultAsync.value?['essay_score'] != null) ...[
                                        const Padding(
                                          padding: EdgeInsets.symmetric(vertical: 12),
                                          child: Divider(height: 1, color: AppColors.border),
                                        ),
                                        _SummaryRow(
                                          icon: Icons.edit_note_rounded,
                                          iconColor: AppColors.primary,
                                          label: 'Nilai Esai Guru',
                                          value: ((resultAsync.value?['essay_score'] ?? 0.0) as num).toStringAsFixed(1),
                                        ),
                                      ],
                                    ],
                                  ),
                                ),

                                const SizedBox(height: 32),

                                // Back to Home Button
                                BouncingButton(
                                  onTap: _backToHome,
                                  child: Container(
                                    height: 52,
                                    decoration: BoxDecoration(
                                      gradient: const LinearGradient(
                                        colors: [AppColors.primary, AppColors.primaryDark],
                                        begin: Alignment.topCenter,
                                        end: Alignment.bottomCenter,
                                      ),
                                      borderRadius: BorderRadius.circular(14),
                                      boxShadow: AppShadows.primaryButton,
                                    ),
                                    child: const Center(
                                      child: Text(
                                        'Kembali ke Beranda',
                                        style: TextStyle(
                                          color: Colors.white,
                                          fontSize: 15,
                                          fontWeight: FontWeight.w700,
                                          letterSpacing: 0.2,
                                        ),
                                      ),
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          ),
                        );
                      },
                    ),
        ),
      ),
    );
  }
}

class _SummaryRow extends StatelessWidget {
  final IconData icon;
  final Color iconColor;
  final String label;
  final String value;

  const _SummaryRow({
    required this.icon,
    required this.iconColor,
    required this.label,
    required this.value,
  });

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Container(
          padding: const EdgeInsets.all(7),
          decoration: BoxDecoration(
            color: iconColor.withValues(alpha: 0.12),
            borderRadius: BorderRadius.circular(8),
          ),
          child: Icon(icon, color: iconColor, size: 18),
        ),
        const SizedBox(width: 12),
        Text(
          label,
          style: const TextStyle(
            fontWeight: FontWeight.w600,
            color: AppColors.textSecondary,
            fontSize: 13,
          ),
        ),
        const Spacer(),
        Text(
          value,
          style: const TextStyle(
            fontWeight: FontWeight.w800,
            color: AppColors.textPrimary,
            fontSize: 15,
            fontFeatures: [FontFeature.tabularFigures()],
          ),
        ),
      ],
    );
  }
}
