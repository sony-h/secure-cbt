import 'package:flutter/material.dart';
import 'package:secure_cbt_mobile/core/theme/theme.dart';
import 'package:secure_cbt_mobile/features/exam/presentation/widgets/slide_to_submit.dart';

Future<bool?> showSubmitDialog(
  BuildContext context, {
  required int answered,
  required int total,
  bool isWarning = false,
  List<int> unansweredQuestions = const [],
}) {
  final String body;
  final bool hasUnanswered = answered < total || unansweredQuestions.isNotEmpty;

  if (isWarning) {
    body = 'Meninggalkan layar ujian akan mengumpulkan lembar jawaban Anda secara otomatis. Geser penggeser di bawah untuk mengonfirmasi.';
  } else if (hasUnanswered) {
    body = 'Anda baru menjawab $answered dari $total soal. Geser penggeser di bawah jika Anda yakin ingin mengumpulkan lembar ujian.';
  } else {
    body = 'Seluruh $total soal telah dijawab lengkap. Geser penggeser di bawah untuk menyelesaikan dan mengumpulkan ujian.';
  }

  return showDialog<bool>(
    context: context,
    barrierDismissible: false,
    builder: (ctx) => AlertDialog(
      backgroundColor: AppColors.surface,
      surfaceTintColor: Colors.transparent,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(20),
        side: const BorderSide(color: AppColors.border),
      ),
      contentPadding: const EdgeInsets.fromLTRB(20, 20, 20, 16),
      title: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: (isWarning || hasUnanswered) ? AppColors.warningContainer : AppColors.primaryContainer,
              borderRadius: BorderRadius.circular(10),
            ),
            child: Icon(
              (isWarning || hasUnanswered) ? Icons.warning_amber_rounded : Icons.check_circle_outline_rounded,
              size: 20,
              color: (isWarning || hasUnanswered) ? AppColors.warning : AppColors.primary,
            ),
          ),
          const SizedBox(width: 12),
          const Expanded(
            child: Text(
              'Kumpulkan Ujian?',
              style: TextStyle(
                fontSize: 17,
                fontWeight: FontWeight.w700,
                letterSpacing: -0.3,
                color: AppColors.textPrimary,
              ),
            ),
          ),
        ],
      ),
      content: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text(
              body,
              style: const TextStyle(
                fontSize: 13,
                height: 1.5,
                color: AppColors.textSecondary,
              ),
            ),
            const SizedBox(height: 16),
            SlideToSubmit(
              totalQuestions: total,
              unansweredQuestions: unansweredQuestions,
              onSubmitted: () {
                Navigator.pop(ctx, true);
              },
            ),
          ],
        ),
      ),
      actionsPadding: const EdgeInsets.fromLTRB(20, 0, 20, 16),
      actions: [
        SizedBox(
          width: double.infinity,
          child: OutlinedButton(
            onPressed: () => Navigator.pop(ctx, false),
            style: OutlinedButton.styleFrom(
              minimumSize: const Size(0, 42),
              padding: EdgeInsets.zero,
              side: const BorderSide(color: AppColors.border),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
            ),
            child: const Text(
              'Periksa Lagi',
              style: TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w600,
                color: AppColors.textPrimary,
              ),
            ),
          ),
        ),
      ],
    ),
  );
}
