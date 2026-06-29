import 'package:flutter/material.dart';
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
      Future.delayed(Duration(milliseconds: i * 30), () {
        if (mounted) {
          setState(() => _visibleItems[i] = true);
        }
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final total = widget.questions.length;
    final answeredCount = widget.answers.length;
    final progress = total > 0 ? answeredCount / total : 0.0;
    final flaggedCount = widget.flagged.length;

    return Padding(
      padding: const EdgeInsets.fromLTRB(24, 12, 24, 24),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // Handle bar
          Center(
            child: Container(
              width: 40, height: 4,
              decoration: BoxDecoration(color: theme.colorScheme.onSurface.withValues(alpha: 0.15), borderRadius: BorderRadius.circular(2)),
            ),
          ),
          const SizedBox(height: 16),

          // Header
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text('Navigasi Soal', style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold, color: theme.colorScheme.onSurface)),
              IconButton(
                visualDensity: VisualDensity.compact,
                icon: Icon(Icons.close_rounded, size: 22, color: theme.colorScheme.outline),
                onPressed: () => Navigator.pop(context),
              ),
            ],
          ),
          const SizedBox(height: 12),

          // Progress
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text('Progress', style: TextStyle(fontSize: 13, color: theme.colorScheme.outline, fontWeight: FontWeight.w600)),
              Text('$answeredCount / $total Terjawab', style: TextStyle(fontSize: 13, color: theme.colorScheme.primary, fontWeight: FontWeight.bold)),
            ],
          ),
          const SizedBox(height: 8),
          ClipRRect(
            borderRadius: BorderRadius.circular(6),
            child: LinearProgressIndicator(
              value: progress,
              minHeight: 8,
              backgroundColor: theme.colorScheme.surfaceContainerHighest,
              valueColor: AlwaysStoppedAnimation(theme.colorScheme.primary),
            ),
          ),
          const SizedBox(height: 20),

          // Legend
          Wrap(
            spacing: 12, runSpacing: 8,
            alignment: WrapAlignment.center,
            children: [
              _LegendItem(color: theme.colorScheme.primary, text: 'Saat ini'),
              _LegendItem(color: theme.colorScheme.primary.withValues(alpha: 0.08), text: 'Terjawab', border: theme.colorScheme.primary.withValues(alpha: 0.3)),
              _LegendItem(color: theme.colorScheme.surface, text: 'Belum dijawab', border: theme.colorScheme.outlineVariant),
              if (flaggedCount > 0)
                _LegendItem(color: theme.colorScheme.tertiaryContainer, text: 'Ditandai ($flaggedCount)', border: theme.colorScheme.tertiary),
            ],
          ),
          const SizedBox(height: 20),

          // Question grid with stagger
          ConstrainedBox(
            constraints: BoxConstraints(maxHeight: MediaQuery.of(context).size.height * 0.4),
            child: GridView.builder(
              shrinkWrap: true,
              gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                crossAxisCount: 5,
                childAspectRatio: 1.0,
                crossAxisSpacing: 10,
                mainAxisSpacing: 10,
              ),
              itemCount: total,
              itemBuilder: (context, index) {
                final q = widget.questions[index];
                final qId = q['question']?['id'] ?? q['id'] ?? '';
                final isAnswered = widget.answers.containsKey(qId);
                final isCurrent = index == widget.currentIndex;
                final isFlagged = widget.flagged.contains(qId);

                Color cardColor = theme.colorScheme.surface;
                Color textColor = theme.colorScheme.outline;
                Border? border = Border.all(color: theme.colorScheme.outlineVariant);

                if (isCurrent) {
                  cardColor = theme.colorScheme.primary;
                  textColor = theme.colorScheme.onPrimary;
                  border = null;
                } else if (isAnswered) {
                  cardColor = theme.colorScheme.primary.withValues(alpha: 0.08);
                  textColor = theme.colorScheme.primary;
                  border = Border.all(color: theme.colorScheme.primary.withValues(alpha: 0.3), width: 1.5);
                } else if (isFlagged) {
                  cardColor = theme.colorScheme.tertiaryContainer;
                  border = Border.all(color: theme.colorScheme.tertiary, width: 1.5);
                }

                return AnimatedOpacity(
                  opacity: _visibleItems[index] ? 1.0 : 0.0,
                  duration: const Duration(milliseconds: 200),
                  child: Stack(
                    children: [
                      Material(
                        color: cardColor,
                        borderRadius: BorderRadius.circular(10),
                        child: InkWell(
                          onTap: () => widget.onPageChanged(index),
                          borderRadius: BorderRadius.circular(10),
                          child: Container(
                            decoration: BoxDecoration(borderRadius: BorderRadius.circular(10), border: border),
                            child: Center(child: Text('${index + 1}', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: textColor))),
                          ),
                        ),
                      ),
                      if (isFlagged && !isCurrent)
                        Positioned(
                          top: 2, right: 2,
                          child: Icon(Icons.flag_rounded, size: 12, color: theme.colorScheme.tertiary),
                        ),
                    ],
                  ),
                );
              },
            ),
          ),
          const SizedBox(height: 24),

          // Submit button
          SizedBox(
            width: double.infinity,
            height: 48,
            child: ElevatedButton.icon(
              onPressed: () async {
                final ok = await showSubmitDialog(context, answered: answeredCount, total: total);
                if (ok == true) widget.onSubmit();
              },
              icon: const Icon(Icons.assignment_turned_in_rounded, size: 20),
                label: Text(
                  answeredCount < total
                      ? 'Kumpulkan ($answeredCount/$total)'
                      : 'Kumpulkan Ujian',
                  style: const TextStyle(fontWeight: FontWeight.bold),
              ),
              style: ElevatedButton.styleFrom(
                backgroundColor: theme.colorScheme.error,
                foregroundColor: theme.colorScheme.onError,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
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
  final String text;
  const _LegendItem({required this.color, this.border, required this.text});

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          width: 14, height: 14,
          decoration: BoxDecoration(
            color: color, borderRadius: BorderRadius.circular(4),
            border: border != null ? Border.all(color: border!) : null,
          ),
        ),
        const SizedBox(width: 6),
        Text(text, style: TextStyle(fontSize: 12, color: Theme.of(context).colorScheme.outline)),
      ],
    );
  }
}
