import 'package:flutter/material.dart';

class NavigationPanel extends StatelessWidget {
  final int totalQuestions;
  final int currentIndex;
  final Map<String, String> answeredQuestions;
  final ValueChanged<int> onPageChanged;
  final VoidCallback onSubmit;

  const NavigationPanel({
    super.key,
    required this.totalQuestions,
    required this.currentIndex,
    required this.answeredQuestions,
    required this.onPageChanged,
    required this.onSubmit,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surface,
        border: Border(top: BorderSide(color: Colors.grey.shade200)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.05),
            blurRadius: 10,
            offset: const Offset(0, -2),
          ),
        ],
      ),
      child: SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            // Question number grid
            SizedBox(
              height: 40,
              child: ListView.builder(
                scrollDirection: Axis.horizontal,
                itemCount: totalQuestions,
                itemBuilder: (context, index) {
                  final isCurrent = index == currentIndex;
                  final questionId = 'q_$index'; // Simplified; production uses actual IDs
                  final isAnswered = answeredQuestions.containsKey(questionId);

                  return GestureDetector(
                    onTap: () => onPageChanged(index),
                    child: Container(
                      width: 36,
                      height: 36,
                      margin: const EdgeInsets.only(right: 8),
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        color: isCurrent
                            ? Theme.of(context).colorScheme.primary
                            : isAnswered
                                ? Colors.green.shade100
                                : Colors.grey.shade100,
                        border: Border.all(
                          color: isCurrent
                              ? Theme.of(context).colorScheme.primary
                              : isAnswered
                                  ? Colors.green
                                  : Colors.grey.shade300,
                        ),
                      ),
                      child: Center(
                        child: Text(
                          '${index + 1}',
                          style: TextStyle(
                            fontSize: 13,
                            fontWeight: FontWeight.w600,
                            color: isCurrent
                                ? Colors.white
                                : isAnswered
                                    ? Colors.green.shade700
                                    : Colors.grey.shade600,
                          ),
                        ),
                      ),
                    ),
                  );
                },
              ),
            ),
            const SizedBox(height: 12),

            // Bottom row: progress + submit button
            Row(
              children: [
                // Progress indicator
                Text(
                  '${answeredQuestions.length}/$totalQuestions terjawab',
                  style: TextStyle(
                    color: Colors.grey.shade600,
                    fontSize: 13,
                  ),
                ),
                const Spacer(),

                // Submit button
                ElevatedButton(
                  onPressed: () {
                    showDialog(
                      context: context,
                      builder: (ctx) => AlertDialog(
                        title: const Text('Kumpulkan Ujian?'),
                        content: Text(
                          answeredQuestions.length < totalQuestions
                              ? 'Masih ada ${totalQuestions - answeredQuestions.length} soal belum terjawab. Yakin ingin mengumpulkan?'
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
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.green,
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
                  ),
                  child: const Text('KUMPULKAN'),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
