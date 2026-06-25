import 'package:flutter/material.dart';

class QuestionPalette extends StatelessWidget {
  final List<Map<String, dynamic>> questions;
  final Map<String, String> answers;
  final int currentIndex;
  final void Function(int index) onPageChanged;
  final VoidCallback onSubmit;

  const QuestionPalette({
    super.key,
    required this.questions,
    required this.answers,
    required this.currentIndex,
    required this.onPageChanged,
    required this.onSubmit,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final total = questions.length;
    final answeredCount = answers.length;
    final progress = total > 0 ? answeredCount / total : 0.0;

    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 12, 20, 20),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          // Handle bar
          Container(
            width: 40,
            height: 4,
            decoration: BoxDecoration(
              color: theme.colorScheme.onSurface.withValues(alpha: 0.2),
              borderRadius: BorderRadius.circular(2),
            ),
          ),
          const SizedBox(height: 16),

          // Header
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text('Navigasi Soal', style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold)),
              IconButton(
                visualDensity: VisualDensity.compact,
                icon: const Icon(Icons.close, size: 20),
                onPressed: () => Navigator.pop(context),
              ),
            ],
          ),
          const SizedBox(height: 12),

          // Progress bar
          ClipRRect(
            borderRadius: BorderRadius.circular(6),
            child: LinearProgressIndicator(
              value: progress,
              minHeight: 8,
              backgroundColor: theme.colorScheme.surfaceContainerHighest,
              valueColor: AlwaysStoppedAnimation(theme.colorScheme.primary),
            ),
          ),
          const SizedBox(height: 6),
          Align(
            alignment: Alignment.centerRight,
            child: Text(
              '$answeredCount / $total terjawab',
              style: theme.textTheme.labelSmall?.copyWith(
                color: theme.colorScheme.onSurface.withValues(alpha: 0.6),
              ),
            ),
          ),
          const SizedBox(height: 16),

          // Question number grid (4 columns)
          SizedBox(
            height: ((total / 4).ceil() * 56.0).clamp(56, 300),
            child: GridView.builder(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                crossAxisCount: 4,
                childAspectRatio: 2.2,
                crossAxisSpacing: 8,
                mainAxisSpacing: 8,
              ),
              itemCount: total,
              itemBuilder: (context, index) {
                final q = questions[index];
                final qId = q['question']?['id'] ?? q['id'] ?? '';
                final isAnswered = answers.containsKey(qId);
                final isCurrent = index == currentIndex;

                return InkWell(
                  onTap: () => onPageChanged(index),
                  borderRadius: BorderRadius.circular(8),
                  child: Container(
                    decoration: BoxDecoration(
                      color: isCurrent
                          ? theme.colorScheme.primary
                          : isAnswered
                              ? theme.colorScheme.primaryContainer
                              : theme.colorScheme.surfaceContainerHighest.withValues(alpha: 0.5),
                      borderRadius: BorderRadius.circular(8),
                      border: isCurrent
                          ? null
                          : Border.all(
                              color: isAnswered
                                  ? theme.colorScheme.primary.withValues(alpha: 0.3)
                                  : theme.colorScheme.outline.withValues(alpha: 0.2),
                            ),
                    ),
                    child: Center(
                      child: Text(
                        '${index + 1}',
                        style: TextStyle(
                          fontWeight: isCurrent ? FontWeight.bold : FontWeight.w500,
                          fontSize: 14,
                          color: isCurrent
                              ? theme.colorScheme.onPrimary
                              : isAnswered
                                  ? theme.colorScheme.primary
                                  : theme.colorScheme.onSurface.withValues(alpha: 0.6),
                        ),
                      ),
                    ),
                  ),
                );
              },
            ),
          ),
          const SizedBox(height: 20),

          // Submit button
          SizedBox(
            width: double.infinity,
            height: 48,
            child: ElevatedButton.icon(
              onPressed: () {
                showDialog(
                  context: context,
                  builder: (ctx) => AlertDialog(
                    title: const Text('Kumpulkan Ujian?'),
                    content: Text(
                      answeredCount < total
                          ? 'Anda baru menjawab $answeredCount dari $total soal. Yakin ingin mengumpulkan?'
                          : 'Semua soal sudah terjawab. Yakin ingin mengumpulkan?',
                    ),
                    actions: [
                      TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('BATAL')),
                      TextButton(
                        onPressed: () {
                          Navigator.pop(ctx);
                          onSubmit();
                        },
                        child: const Text('KUMPULKAN', style: TextStyle(color: Colors.red)),
                      ),
                    ],
                  ),
                );
              },
              icon: const Icon(Icons.assignment_turned_in, size: 20),
              label: const Text('Kumpulkan Ujian', style: TextStyle(fontWeight: FontWeight.w600)),
              style: ElevatedButton.styleFrom(
                backgroundColor: Colors.red.shade600,
                foregroundColor: Colors.white,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
