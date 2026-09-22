import 'package:flutter/material.dart';
import 'package:secure_cbt_mobile/core/theme/theme.dart';
import 'package:secure_cbt_mobile/features/exam/providers/exam_state.dart';

class ExamAppBar extends StatelessWidget implements PreferredSizeWidget {
  final String title;
  final ExamState examState;
  final int remainingSeconds;

  const ExamAppBar({
    super.key,
    required this.title,
    required this.examState,
    this.remainingSeconds = 0,
  });

  @override
  Size get preferredSize => const Size.fromHeight(kToolbarHeight + 4);

  @override
  Widget build(BuildContext context) {
    final isWarning = (remainingSeconds > 0 && remainingSeconds < 300) || examState.remainingSeconds < 300;
    final seconds = examState.remainingSeconds > 0 ? examState.remainingSeconds : remainingSeconds;
    final minutes = seconds ~/ 60;
    final secs = seconds % 60;
    final answered = examState.answers.length;
    final total = examState.questions.length;
    final progress = total > 0 ? answered / total : 0.0;

    return AppBar(
      backgroundColor: AppColors.surface,
      surfaceTintColor: Colors.transparent,
      elevation: 0,
      scrolledUnderElevation: 1,
      automaticallyImplyLeading: false,
      title: Text(
        title,
        style: const TextStyle(
          fontSize: 15,
          fontWeight: FontWeight.w700,
          letterSpacing: -0.2,
          color: AppColors.textPrimary,
        ),
        overflow: TextOverflow.ellipsis,
        maxLines: 1,
      ),
      bottom: PreferredSize(
        preferredSize: const Size.fromHeight(4),
        child: Container(
          height: 4,
          color: AppColors.surfaceSubtle,
          child: TweenAnimationBuilder<double>(
            tween: Tween<double>(begin: 0, end: progress),
            duration: const Duration(milliseconds: 300),
            curve: Curves.easeOutCubic,
            builder: (context, value, child) {
              return FractionallySizedBox(
                alignment: Alignment.centerLeft,
                widthFactor: value.clamp(0.0, 1.0),
                child: Container(
                  decoration: const BoxDecoration(
                    gradient: LinearGradient(
                      colors: [AppColors.primary, Color(0xFF06B6D4)],
                    ),
                  ),
                ),
              );
            },
          ),
        ),
      ),
      actions: [
        // Countdown Timer Pill
        AnimatedContainer(
          duration: const Duration(milliseconds: 300),
          margin: const EdgeInsets.only(right: 8),
          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
          decoration: BoxDecoration(
            color: isWarning ? AppColors.errorContainer : AppColors.surfaceSubtle,
            borderRadius: BorderRadius.circular(10),
            border: Border.all(
              color: isWarning ? AppColors.error : AppColors.border,
              width: 1,
            ),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(
                Icons.timer_outlined,
                size: 15,
                color: isWarning ? AppColors.error : AppColors.primary,
              ),
              const SizedBox(width: 5),
              Text(
                '${minutes.toString().padLeft(2, '0')}:${secs.toString().padLeft(2, '0')}',
                style: TextStyle(
                  fontWeight: FontWeight.w700,
                  fontSize: 13,
                  letterSpacing: 0.5,
                  fontFeatures: const [FontFeature.tabularFigures()],
                  color: isWarning ? AppColors.onErrorContainer : AppColors.textPrimary,
                ),
              ),
            ],
          ),
        ),

        // Security Warning Shield Badge
        Container(
          margin: const EdgeInsets.only(right: 12),
          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 5),
          decoration: BoxDecoration(
            color: examState.warningCount > 0 ? AppColors.errorContainer : AppColors.surfaceSubtle,
            borderRadius: BorderRadius.circular(10),
            border: Border.all(
              color: examState.warningCount > 0 ? AppColors.error : AppColors.border,
            ),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(
                Icons.shield_outlined,
                size: 14,
                color: examState.warningCount > 0 ? AppColors.error : AppColors.textMuted,
              ),
              const SizedBox(width: 4),
              Text(
                '${examState.warningCount}/${examState.warningLimit}',
                style: TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w700,
                  fontFeatures: const [FontFeature.tabularFigures()],
                  color: examState.warningCount > 0 ? AppColors.error : AppColors.textSecondary,
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}
