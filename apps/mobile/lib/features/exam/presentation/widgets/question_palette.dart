import 'package:flutter/material.dart';
import 'package:secure_cbt_mobile/core/theme/theme.dart';
import 'package:secure_cbt_mobile/core/widgets/bouncing_button.dart';
import 'package:secure_cbt_mobile/features/exam/presentation/widgets/submit_dialog.dart';

class QuestionPalette extends StatefulWidget {
  final List<Map<String, dynamic>> questions;
  final Map<String, String> answers;
  final int currentIndex;
  final Set<String> flagged;
  final void Function(int index) onPageChanged;
  final VoidCallback onSubmit;

  const QuestionPalette({
    super.key,
    required this.questions,
    required this.answers,
    required this.currentIndex,
    this.flagged = const {},
    required this.onPageChanged,
    required this.onSubmit,
  });

  @override
  State<QuestionPalette> createState() => _QuestionPaletteState();
}

class _QuestionPaletteState extends State<QuestionPalette> {
  late List<bool> _visibleItems;

  @override
  void initState() {
    super.initState();
    _visibleItems = List.filled(widget.questions.length, false);
    for (var i = 0; i < widget.questions.length; i++) {
      Future.delayed(Duration(milliseconds: i * 20), () {
        if (mounted) {
          setState(() => _visibleItems[i] = true);
        }
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final total = widget.questions.length;
    final answeredCount = widget.answers.length;
    final progress = total > 0 ? answeredCount / total : 0.0;
    final flaggedCount = widget.flagged.length;

    return Container(
      decoration: const BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      padding: const EdgeInsets.fromLTRB(20, 12, 20, 24),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // Drag Handle bar
          Center(
            child: Container(
              width: 36,
              height: 4,
              decoration: BoxDecoration(
                color: AppColors.border,
                borderRadius: BorderRadius.circular(2),
              ),
            ),
          ),
          const SizedBox(height: 14),

          // Title & Close
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text(
                'Daftar Nomor Soal',
                style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w700,
                  letterSpacing: -0.3,
                  color: AppColors.textPrimary,
                ),
              ),
              IconButton(
                visualDensity: VisualDensity.compact,
                icon: const Icon(Icons.close_rounded, size: 20, color: AppColors.textMuted),
                onPressed: () => Navigator.pop(context),
              ),
            ],
          ),
          const SizedBox(height: 10),

          // Progress Gauge
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text(
                'Progres Pengerjaan',
                style: TextStyle(
                  fontSize: 12,
                  color: AppColors.textSecondary,
                  fontWeight: FontWeight.w600,
                ),
              ),
              Text(
                '$answeredCount dari $total Terjawab',
                style: const TextStyle(
                  fontSize: 12,
                  color: AppColors.primary,
                  fontWeight: FontWeight.w700,
                  fontFeatures: [FontFeature.tabularFigures()],
                ),
              ),
            ],
          ),
          const SizedBox(height: 6),
          ClipRRect(
            borderRadius: BorderRadius.circular(4),
            child: LinearProgressIndicator(
              value: progress,
              minHeight: 6,
              backgroundColor: AppColors.surfaceSubtle,
              valueColor: const AlwaysStoppedAnimation(AppColors.primary),
            ),
          ),
          const SizedBox(height: 16),

          // Legend Chips
          Wrap(
            spacing: 8,
            runSpacing: 6,
            alignment: WrapAlignment.center,
            children: [
              const _LegendItem(color: AppColors.primary, text: 'Saat ini', textColor: Colors.white),
              _LegendItem(color: AppColors.primaryContainer, text: 'Terjawab', border: AppColors.primaryLight.withValues(alpha: 0.4)),
              const _LegendItem(color: AppColors.surfaceSubtle, text: 'Belum', border: AppColors.border),
              if (flaggedCount > 0)
                _LegendItem(color: AppColors.warningContainer, text: 'Ragu ($flaggedCount)', border: AppColors.warning),
            ],
          ),
          const SizedBox(height: 16),

          // Question Grid
          ConstrainedBox(
            constraints: BoxConstraints(maxHeight: MediaQuery.of(context).size.height * 0.42),
            child: GridView.builder(
              shrinkWrap: true,
              physics: const BouncingScrollPhysics(),
              gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                crossAxisCount: 5,
                childAspectRatio: 1.1,
                crossAxisSpacing: 8,
                mainAxisSpacing: 8,
              ),
              itemCount: total,
              itemBuilder: (context, index) {
                final q = widget.questions[index];
                final qId = q['question']?['id'] ?? q['id'] ?? '';
                final isAnswered = widget.answers.containsKey(qId);
                final isCurrent = index == widget.currentIndex;
                final isFlagged = widget.flagged.contains(qId);

                Color cardColor = AppColors.surfaceSubtle;
                Color textColor = AppColors.textSecondary;
                Border? border = Border.all(color: AppColors.border);

                if (isCurrent) {
                  cardColor = AppColors.primary;
                  textColor = Colors.white;
                  border = null;
                } else if (isAnswered) {
                  cardColor = AppColors.primaryContainer;
                  textColor = AppColors.primary;
                  border = Border.all(color: AppColors.primaryLight.withValues(alpha: 0.5), width: 1);
                } else if (isFlagged) {
                  cardColor = AppColors.warningContainer;
                  textColor = AppColors.onWarningContainer;
                  border = Border.all(color: AppColors.warning, width: 1);
                }

                return AnimatedOpacity(
                  opacity: _visibleItems[index] ? 1.0 : 0.0,
                  duration: const Duration(milliseconds: 150),
                  child: BouncingButton(
                    onTap: () => widget.onPageChanged(index),
                    child: Container(
                      decoration: BoxDecoration(
                        color: cardColor,
                        borderRadius: BorderRadius.circular(10),
                        border: border,
                        boxShadow: isCurrent ? AppShadows.primaryButton : null,
                      ),
                      child: Stack(
                        alignment: Alignment.center,
                        children: [
                          Text(
                            '${index + 1}',
                            style: TextStyle(
                              fontWeight: FontWeight.w700,
                              fontSize: 13,
                              color: textColor,
                              fontFeatures: const [FontFeature.tabularFigures()],
                            ),
                          ),
                          if (isFlagged && !isCurrent)
                            const Positioned(
                              top: 4,
                              right: 4,
                              child: Icon(Icons.flag_rounded, size: 10, color: AppColors.warning),
                            ),
                        ],
                      ),
                    ),
                  ),
                );
              },
            ),
          ),
          const SizedBox(height: 20),

          // Submit button from palette
          BouncingButton(
            onTap: () async {
              final ok = await showSubmitDialog(context, answered: answeredCount, total: total);
              if (ok == true) widget.onSubmit();
            },
            child: Container(
              height: 48,
              decoration: BoxDecoration(
                color: AppColors.error,
                borderRadius: BorderRadius.circular(12),
                boxShadow: [
                  BoxShadow(
                    color: AppColors.error.withValues(alpha: 0.25),
                    blurRadius: 8,
                    offset: const Offset(0, 3),
                  ),
                ],
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Icon(Icons.assignment_turned_in_rounded, size: 18, color: Colors.white),
                  const SizedBox(width: 8),
                  Text(
                    answeredCount < total
                        ? 'Kumpulkan ($answeredCount/$total Terjawab)'
                        : 'Kumpulkan Ujian Sekarang',
                    style: const TextStyle(
                      color: Colors.white,
                      fontWeight: FontWeight.w700,
                      fontSize: 13,
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _LegendItem extends StatelessWidget {
  final Color color;
  final Color? border;
  final Color? textColor;
  final String text;

  const _LegendItem({
    required this.color,
    this.border,
    this.textColor,
    required this.text,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: color,
        borderRadius: BorderRadius.circular(6),
        border: border != null ? Border.all(color: border!) : null,
      ),
      child: Text(
        text,
        style: TextStyle(
          fontSize: 11,
          fontWeight: FontWeight.w600,
          color: textColor ?? AppColors.textSecondary,
        ),
      ),
    );
  }
}
