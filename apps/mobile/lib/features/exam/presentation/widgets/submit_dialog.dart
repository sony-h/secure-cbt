import 'package:flutter/material.dart';
import 'package:secure_cbt_mobile/core/theme/theme.dart';
import 'package:secure_cbt_mobile/core/widgets/bouncing_button.dart';

Future<bool?> showSubmitDialog(
  BuildContext context, {
  required int answered,
  required int total,
  bool isWarning = false,
}) {
  final String body;
  final bool hasUnanswered = answered < total;

  if (isWarning) {
    body = 'Meninggalkan layar ujian akan mengumpulkan lembar jawaban Anda secara otomatis. Apakah Anda yakin?';
  } else if (hasUnanswered) {
    body = 'Anda baru menjawab $answered dari $total soal. Masih ada ${total - answered} soal yang belum terisi. Tetap kumpulkan?';
  } else {
    body = 'Seluruh $total soal telah dijawab lengkap. Apakah Anda yakin ingin menyelesaikan dan mengumpulkan ujian?';
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
      contentPadding: const EdgeInsets.fromLTRB(24, 20, 24, 16),
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
      content: Text(
        body,
        style: const TextStyle(
          fontSize: 13,
          height: 1.5,
          color: AppColors.textSecondary,
        ),
      ),
      actionsPadding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
      actions: [
        Row(
          children: [
            Expanded(
              child: OutlinedButton(
                onPressed: () => Navigator.pop(ctx, false),
                style: OutlinedButton.styleFrom(
                  minimumSize: const Size(0, 44),
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
            const SizedBox(width: 10),
            Expanded(
              child: BouncingButton(
                onTap: () => Navigator.pop(ctx, true),
                child: Container(
                  height: 44,
                  decoration: BoxDecoration(
                    color: (isWarning || hasUnanswered) ? AppColors.warning : AppColors.primary,
                    borderRadius: BorderRadius.circular(10),
                    boxShadow: [
                      BoxShadow(
                        color: ((isWarning || hasUnanswered) ? AppColors.warning : AppColors.primary).withValues(alpha: 0.25),
                        blurRadius: 8,
                        offset: const Offset(0, 2),
                      ),
                    ],
                  ),
                  child: const Center(
                    child: Text(
                      'Ya, Kumpulkan',
                      style: TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w700,
                        color: Colors.white,
                      ),
                    ),
                  ),
                ),
              ),
            ),
          ],
        ),
      ],
    ),
  );
}
