import 'dart:async';
import 'package:flutter/material.dart';
import 'package:secure_cbt_mobile/core/theme/theme.dart';

/// Displays an uncancelable full-screen transition dialog when an exam is being submitted.
///
/// Both [isAutoSubmit == true] and [isAutoSubmit == false] run a 10-second countdown
/// allowing students to clearly read the final session status before results open.
Future<void> showSubmissionTransitionDialog(
  BuildContext context, {
  required bool isAutoSubmit,
  int? warningCount,
  int? warningLimit,
  int? durationSeconds,
}) {
  final initialSeconds = durationSeconds ?? 10;

  return showDialog<void>(
    context: context,
    barrierDismissible: false,
    barrierColor: Colors.black.withValues(alpha: 0.8),
    builder: (ctx) => _SubmissionTransitionDialog(
      isAutoSubmit: isAutoSubmit,
      totalSeconds: initialSeconds,
      warningCount: warningCount,
      warningLimit: warningLimit,
    ),
  );
}

class _SubmissionTransitionDialog extends StatefulWidget {
  final bool isAutoSubmit;
  final int totalSeconds;
  final int? warningCount;
  final int? warningLimit;

  const _SubmissionTransitionDialog({
    required this.isAutoSubmit,
    required this.totalSeconds,
    this.warningCount,
    this.warningLimit,
  });

  @override
  State<_SubmissionTransitionDialog> createState() => _SubmissionTransitionDialogState();
}

class _SubmissionTransitionDialogState extends State<_SubmissionTransitionDialog> {
  late int _remainingSeconds;
  Timer? _timer;

  @override
  void initState() {
    super.initState();
    _remainingSeconds = widget.totalSeconds;
    _timer = Timer.periodic(const Duration(seconds: 1), (timer) {
      if (!mounted) {
        timer.cancel();
        return;
      }
      if (_remainingSeconds > 1) {
        setState(() {
          _remainingSeconds--;
        });
      } else {
        timer.cancel();
        if (mounted) {
          Navigator.of(context).pop();
        }
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
    final isAuto = widget.isAutoSubmit;

    return PopScope(
      canPop: false,
      child: Dialog(
        backgroundColor: Colors.transparent,
        surfaceTintColor: Colors.transparent,
        insetPadding: const EdgeInsets.symmetric(horizontal: 20),
        child: Material(
          type: MaterialType.transparency,
          child: DefaultTextStyle(
            style: const TextStyle(
              decoration: TextDecoration.none,
              fontFamily: 'Inter',
            ),
            child: Center(
              child: SingleChildScrollView(
                child: Container(
                  width: double.infinity,
                  padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 32),
                  decoration: BoxDecoration(
                    color: AppColors.surface,
                    borderRadius: BorderRadius.circular(24),
                    border: Border.all(
                      color: isAuto
                          ? AppColors.error.withValues(alpha: 0.4)
                          : AppColors.primary.withValues(alpha: 0.3),
                      width: 1.5,
                    ),
                    boxShadow: [
                      BoxShadow(
                        color: isAuto
                            ? AppColors.error.withValues(alpha: 0.2)
                            : AppColors.primary.withValues(alpha: 0.15),
                        blurRadius: 28,
                        offset: const Offset(0, 10),
                      ),
                    ],
                  ),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      // Animated Status Icon Emblem
                      Container(
                        width: 76,
                        height: 76,
                        decoration: BoxDecoration(
                          color: isAuto ? AppColors.errorContainer : AppColors.primaryContainer,
                          shape: BoxShape.circle,
                          border: Border.all(
                            color: isAuto
                                ? AppColors.error.withValues(alpha: 0.3)
                                : AppColors.primary.withValues(alpha: 0.3),
                            width: 2,
                          ),
                          boxShadow: [
                            BoxShadow(
                              color: isAuto
                                  ? AppColors.error.withValues(alpha: 0.15)
                                  : AppColors.primary.withValues(alpha: 0.15),
                              blurRadius: 16,
                              offset: const Offset(0, 6),
                            ),
                          ],
                        ),
                        child: Center(
                          child: Icon(
                            isAuto ? Icons.shield_rounded : Icons.check_circle_outline_rounded,
                            size: 40,
                            color: isAuto ? AppColors.error : AppColors.primary,
                          ),
                        ),
                      ),
                      const SizedBox(height: 20),

                      // Main Title (No Underlines!)
                      Text(
                        isAuto
                            ? 'Sesi Ujian Selesai'
                            : 'Lembar Ujian Berhasil Dikumpulkan',
                        textAlign: TextAlign.center,
                        style: const TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.w800,
                          letterSpacing: -0.4,
                          decoration: TextDecoration.none,
                          color: AppColors.textPrimary,
                        ),
                      ),
                      const SizedBox(height: 12),

                      // Detailed Informative Description (No Underlines!)
                      Text(
                        isAuto
                            ? 'Batas pelanggaran keamanan telah tercapai (${widget.warningCount ?? 3}/${widget.warningLimit ?? 3}). Sesi Anda telah tersimpan dan ditutup otomatis oleh sistem demi menjaga kejujuran ujian.'
                            : 'Terima kasih telah menyelesaikan ujian secara tertib dan jujur. Seluruh lembar jawaban Anda telah terverifikasi aman di server.',
                        textAlign: TextAlign.center,
                        style: const TextStyle(
                          fontSize: 13,
                          height: 1.55,
                          decoration: TextDecoration.none,
                          color: AppColors.textSecondary,
                        ),
                      ),
                      const SizedBox(height: 20),

                      // Violation Strike Badge (for Auto-Submit)
                      if (isAuto && widget.warningCount != null && widget.warningLimit != null) ...[
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
                          decoration: BoxDecoration(
                            color: AppColors.errorContainer,
                            borderRadius: BorderRadius.circular(20),
                            border: Border.all(color: AppColors.error.withValues(alpha: 0.3)),
                          ),
                          child: Text(
                            'Peringatan Pelanggaran: ${widget.warningCount}/${widget.warningLimit}',
                            style: const TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.w700,
                              decoration: TextDecoration.none,
                              color: AppColors.error,
                            ),
                          ),
                        ),
                        const SizedBox(height: 20),
                      ],

                      // Countdown Timer Box
                      Container(
                        width: double.infinity,
                        padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 16),
                        decoration: BoxDecoration(
                          color: AppColors.surfaceSubtle,
                          borderRadius: BorderRadius.circular(14),
                          border: Border.all(color: AppColors.border),
                        ),
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            SizedBox(
                              width: 18,
                              height: 18,
                              child: CircularProgressIndicator(
                                strokeWidth: 2.2,
                                color: isAuto ? AppColors.error : AppColors.primary,
                              ),
                            ),
                            const SizedBox(width: 12),
                            Flexible(
                              child: Text(
                                isAuto
                                    ? 'Membuka lembar pengumuman hasil dalam $_remainingSeconds detik...'
                                    : 'Memuat lembar hasil ujian dalam $_remainingSeconds detik...',
                                style: TextStyle(
                                  fontSize: 13,
                                  fontWeight: FontWeight.w700,
                                  decoration: TextDecoration.none,
                                  color: isAuto ? AppColors.error : AppColors.primary,
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
            ),
          ),
        ),
      ),
    );
  }
}
