import 'package:flutter/material.dart';
import 'package:secure_cbt_mobile/features/exam/providers/exam_provider.dart';

class ExamQuestionCard extends StatelessWidget {
  final Map<String, dynamic> question;
  final ExamState examState;
  final int index;
  final void Function(String questionId, String answer) onSaveAnswer;
  final void Function(String questionId) onToggleFlag;

  const ExamQuestionCard({
    super.key,
    required this.question,
    required this.examState,
    required this.index,
    required this.onSaveAnswer,
    required this.onToggleFlag,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final content = question['question']?['content'] ?? question['content'] ?? '';
    final options = (question['question']?['options'] as List<dynamic>?) ??
        (question['options'] as List<dynamic>?) ??
        [];
    final questionId = question['question']?['id'] ?? question['id'] ?? '';
    final type = question['question']?['type'] ?? '';
    final isFlagged = examState.flagged.contains(questionId);

    return SingleChildScrollView(
      padding: const EdgeInsets.fromLTRB(20, 16, 20, 8),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                decoration: BoxDecoration(
                  color: theme.colorScheme.primaryContainer,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(
                  'Soal ${index + 1}',
                  style: theme.textTheme.labelLarge?.copyWith(
                    color: theme.colorScheme.onPrimaryContainer,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
              const Spacer(),
              IconButton(
                onPressed: () => onToggleFlag(questionId),
                icon: Icon(
                  isFlagged ? Icons.flag_rounded : Icons.flag_outlined,
                  size: 22,
                  color: isFlagged ? Colors.orange : const Color(0xFF94A3B8),
                ),
                visualDensity: VisualDensity.compact,
                tooltip: isFlagged ? 'Hapus tanda' : 'Tandai soal',
              ),
            ],
          ),
          const SizedBox(height: 16),
          Text(
            content,
            style: theme.textTheme.bodyLarge?.copyWith(
              height: 1.7,
              fontWeight: FontWeight.w500,
            ),
          ),
          const SizedBox(height: 20),
          if (type == 'ESSAY' || options.isEmpty)
            _buildEssayInput(theme, questionId)
          else
            ...List.generate(options.length, (index) {
              final option = options[index] is Map
                  ? options[index] as Map<String, dynamic>
                  : {};
              final optId = option['id']?.toString() ?? '';
              final optText =
                  option['content']?.toString() ?? option['label']?.toString() ?? '';
              final label = String.fromCharCode(65 + index);
              final isMultiSelect = type == 'MULTI_SELECT';
              final isSelected = isMultiSelect
                  ? (examState.answers[questionId]?.split(',').contains(optId) ?? false)
                  : examState.answers[questionId] == optId;

              return Padding(
                padding: const EdgeInsets.only(bottom: 10),
                child: InkWell(
                  onTap: () {
                    if (isMultiSelect) {
                      final current = examState.answers[questionId] ?? '';
                      final selected =
                          current.split(',').where((s) => s.isNotEmpty).toList();
                      if (selected.contains(optId)) {
                        selected.remove(optId);
                      } else {
                        selected.add(optId);
                      }
                      onSaveAnswer(questionId, selected.join(','));
                    } else {
                      onSaveAnswer(questionId, optId);
                    }
                  },
                  borderRadius: BorderRadius.circular(12),
                  child: AnimatedContainer(
                    duration: const Duration(milliseconds: 200),
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                    decoration: BoxDecoration(
                      color: isSelected
                          ? theme.colorScheme.primary.withValues(alpha: 0.06)
                          : theme.colorScheme.surface,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(
                        color: isSelected
                            ? theme.colorScheme.primary
                            : theme.colorScheme.outline.withValues(alpha: 0.3),
                        width: isSelected ? 2 : 1,
                      ),
                    ),
                    child: Row(
                      children: [
                        Container(
                          width: 32,
                          height: 32,
                          decoration: BoxDecoration(
                            shape: BoxShape.circle,
                            color: isSelected
                                ? theme.colorScheme.primary
                                : Colors.transparent,
                            border: Border.all(
                              color: isSelected
                                  ? theme.colorScheme.primary
                                  : theme.colorScheme.outline.withValues(alpha: 0.4),
                              width: isSelected ? 0 : 1.5,
                            ),
                          ),
                          child: Center(
                            child: isSelected
                                ? Text(
                                    label,
                                    style: TextStyle(
                                      color: theme.colorScheme.onPrimary,
                                      fontWeight: FontWeight.bold,
                                      fontSize: 14,
                                    ),
                                  )
                                : Text(
                                    label,
                                    style: TextStyle(
                                      color: theme.colorScheme.onSurface
                                          .withValues(alpha: 0.6),
                                      fontSize: 14,
                                    ),
                                  ),
                          ),
                        ),
                        const SizedBox(width: 14),
                        Expanded(
                          child: Text(
                            optText,
                            style: theme.textTheme.bodyMedium?.copyWith(
                              fontWeight: isSelected ? FontWeight.w600 : FontWeight.w400,
                              color: isSelected
                                  ? theme.colorScheme.primary
                                  : theme.colorScheme.onSurface,
                            ),
                          ),
                        ),
                        if (isSelected)
                          Icon(
                            Icons.check_circle,
                            size: 22,
                            color: theme.colorScheme.primary,
                          ),
                      ],
                    ),
                  ),
                ),
              );
            }),
        ],
      ),
    );
  }

  Widget _buildEssayInput(ThemeData theme, String questionId) {
    final essayAnswer = examState.answers[questionId] ?? '';
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: TextFormField(
        key: ValueKey('essay_$questionId'),
        initialValue: essayAnswer,
        maxLines: 5,
        minLines: 3,
        style: theme.textTheme.bodyMedium,
        decoration: InputDecoration(
          hintText: 'Tulis jawaban Anda di sini...',
          hintStyle:
              TextStyle(color: theme.colorScheme.onSurface.withValues(alpha: 0.4)),
          border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
          filled: true,
          fillColor: theme.colorScheme.surfaceContainerHighest.withValues(alpha: 0.3),
          contentPadding: const EdgeInsets.all(14),
        ),
        onChanged: (value) => onSaveAnswer(questionId, value),
      ),
    );
  }
}
