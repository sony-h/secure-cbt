import 'package:flutter/material.dart';

class QuestionPalette extends StatelessWidget {
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
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final total = questions.length;
    final answeredCount = answers.length;
    final progress = total > 0 ? answeredCount / total : 0.0;
    final flaggedCount = flagged.length;

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

          // Question grid
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
                final q = questions[index];
                final qId = q['question']?['id'] ?? q['id'] ?? '';
                final isAnswered = answers.containsKey(qId);
                final isCurrent = index == currentIndex;
                final isFlagged = flagged.contains(qId);

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

                return Stack(
                  children: [
                    Material(
                      color: cardColor,
                      borderRadius: BorderRadius.circular(10),
                      child: InkWell(
                        onTap: () => onPageChanged(index),
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
              onPressed: () {
                showDialog(
                  context: context,
                  builder: (ctx) => AlertDialog(
                    title: const Text('Submit Exam?'),
                    content: Text(
                      answeredCount < total
                          ? 'You have answered $answeredCount of $total questions. Submit anyway?'
                          : 'All questions answered. Submit your exam?',
                    ),
                    actions: [
                      TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('CANCEL')),
                      TextButton(
                        onPressed: () { Navigator.pop(ctx); onSubmit(); },
                        child: Text('SUBMIT', style: TextStyle(color: theme.colorScheme.error)),
                      ),
                    ],
                  ),
                );
              },
              icon: const Icon(Icons.assignment_turned_in_rounded, size: 20),
              label: Text(
                answeredCount < total
                    ? 'Submit ($answeredCount/$total)'
                    : 'Submit Exam',
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
