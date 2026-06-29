import 'package:flutter/material.dart';
import 'package:secure_cbt_mobile/features/exam/providers/exam_provider.dart';

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
  Size get preferredSize => const Size.fromHeight(kToolbarHeight + 3);

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isWarning = (remainingSeconds > 0 && remainingSeconds < 300) || examState.remainingSeconds < 300;
    final seconds = examState.remainingSeconds > 0 ? examState.remainingSeconds : remainingSeconds;
    final minutes = seconds ~/ 60;
    final secs = seconds % 60;
    final answered = examState.answers.length;
    final total = examState.questions.length;
    final progress = total > 0 ? answered / total : 0.0;

    return AppBar(
      title: Text(
        title,
        style: TextStyle(
          fontSize: 15,
          fontWeight: FontWeight.bold,
          color: theme.colorScheme.onSurface,
        ),
        overflow: TextOverflow.ellipsis,
        maxLines: 1,
      ),
      automaticallyImplyLeading: false,
      bottom: PreferredSize(
        preferredSize: const Size.fromHeight(3),
        child: Container(
          height: 3,
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(1.5),
            color: theme.colorScheme.surfaceContainerHighest,
          ),
          child: FractionallySizedBox(
            alignment: Alignment.centerLeft,
            widthFactor: progress,
            child: Container(
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(1.5),
                gradient: LinearGradient(
                  colors: [theme.colorScheme.primary, theme.colorScheme.secondary],
                ),
              ),
            ),
          ),
        ),
      ),
      actions: [
        AnimatedContainer(
          duration: const Duration(milliseconds: 500),
          margin: const EdgeInsets.only(right: 8),
          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
          decoration: BoxDecoration(
            color: isWarning
                ? theme.colorScheme.errorContainer
                : Colors.transparent,
            borderRadius: BorderRadius.circular(8),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(
                Icons.timer_outlined,
                size: 16,
                color: isWarning ? theme.colorScheme.onErrorContainer : theme.colorScheme.primary,
              ),
              const SizedBox(width: 5),
              Text(
                '${minutes.toString().padLeft(2, '0')}:${secs.toString().padLeft(2, '0')}',
                style: TextStyle(
                  fontWeight: FontWeight.bold,
                  fontSize: 14,
                  fontFeatures: const [FontFeature.tabularFigures()],
                  color: isWarning ? theme.colorScheme.onErrorContainer : theme.colorScheme.primary,
                ),
              ),
            ],
          ),
        ),
        Padding(
          padding: const EdgeInsets.only(right: 8),
          child: Chip(
            avatar: Icon(
              Icons.warning_amber,
              size: 16,
              color: examState.warningCount > 0
                  ? theme.colorScheme.error
                  : theme.colorScheme.outline,
            ),
            label: Text(
              '${examState.warningCount}/${examState.warningLimit}',
              style: TextStyle(
                fontSize: 12,
                color: examState.warningCount > 0
                    ? theme.colorScheme.error
                    : theme.colorScheme.outline,
              ),
            ),
            backgroundColor: examState.warningCount > 0
                ? theme.colorScheme.errorContainer.withValues(alpha: 0.3)
                : theme.colorScheme.surfaceContainerHighest,
            side: BorderSide.none,
            visualDensity: VisualDensity.compact,
          ),
        ),
      ],
    );
  }
}
