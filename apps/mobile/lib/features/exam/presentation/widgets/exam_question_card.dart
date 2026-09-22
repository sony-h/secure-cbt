import 'dart:async';
import 'package:flutter/material.dart';
import 'package:secure_cbt_mobile/core/theme/theme.dart';
import 'package:secure_cbt_mobile/core/widgets/bouncing_button.dart';
import 'package:secure_cbt_mobile/features/exam/providers/exam_state.dart';

class ExamQuestionCard extends StatefulWidget {
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
  State<ExamQuestionCard> createState() => _ExamQuestionCardState();
}

class _ExamQuestionCardState extends State<ExamQuestionCard> {
  Timer? _debounce;

  @override
  void dispose() {
    _debounce?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final content = widget.question['question']?['content'] ?? widget.question['content'] ?? '';
    final options = (widget.question['question']?['options'] as List<dynamic>?) ??
        (widget.question['options'] as List<dynamic>?) ??
        [];
    final questionId = widget.question['question']?['id'] ?? widget.question['id'] ?? '';
    final type = widget.question['question']?['type'] ?? '';
    final isFlagged = widget.examState.flagged.contains(questionId);

    return SingleChildScrollView(
      padding: const EdgeInsets.fromLTRB(20, 16, 20, 24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // Question Header Bar
          Row(
            children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
                decoration: BoxDecoration(
                  color: AppColors.primaryContainer,
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Text(
                  'Soal ${widget.index + 1}',
                  style: const TextStyle(
                    color: AppColors.primary,
                    fontWeight: FontWeight.w700,
                    fontSize: 13,
                    letterSpacing: -0.2,
                  ),
                ),
              ),
              const SizedBox(width: 8),
              if (type == 'MULTI_SELECT')
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                  decoration: BoxDecoration(
                    color: AppColors.surfaceSubtle,
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: const Text(
                    'Pilihan Ganda Kompleks',
                    style: TextStyle(
                      color: AppColors.textSecondary,
                      fontSize: 11,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
              const Spacer(),

              // Flag / Ragu-ragu Toggle Button
              BouncingButton(
                onTap: () => widget.onToggleFlag(questionId),
                child: AnimatedContainer(
                  duration: const Duration(milliseconds: 200),
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                  decoration: BoxDecoration(
                    color: isFlagged ? AppColors.warningContainer : AppColors.surface,
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(
                      color: isFlagged ? AppColors.warning : AppColors.border,
                    ),
                    boxShadow: AppShadows.card,
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(
                        isFlagged ? Icons.flag_rounded : Icons.flag_outlined,
                        size: 16,
                        color: isFlagged ? AppColors.warning : AppColors.textMuted,
                      ),
                      const SizedBox(width: 4),
                      Text(
                        'Ragu-ragu',
                        style: TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.w600,
                          color: isFlagged ? AppColors.onWarningContainer : AppColors.textMuted,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),

          const SizedBox(height: 16),

          // Question Prompt Body Card
          Container(
            padding: const EdgeInsets.all(18),
            decoration: BoxDecoration(
              color: AppColors.surface,
              borderRadius: BorderRadius.circular(18),
              border: Border.all(color: AppColors.border),
              boxShadow: AppShadows.card,
            ),
            child: Text(
              content,
              style: const TextStyle(
                fontSize: 15,
                height: 1.68,
                fontWeight: FontWeight.w500,
                color: AppColors.textPrimary,
                letterSpacing: -0.2,
              ),
            ),
          ),

          const SizedBox(height: 20),

          // Options List or Essay Input
          if (type == 'ESSAY' || options.isEmpty)
            _buildEssayInput(questionId)
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
                  ? (widget.examState.answers[questionId]?.split(',').contains(optId) ?? false)
                  : widget.examState.answers[questionId] == optId;

              return Padding(
                padding: const EdgeInsets.only(bottom: 12),
                child: BouncingButton(
                  onTap: () {
                    if (isMultiSelect) {
                      final current = widget.examState.answers[questionId] ?? '';
                      final selected =
                          current.split(',').where((s) => s.isNotEmpty).toList();
                      if (selected.contains(optId)) {
                        selected.remove(optId);
                      } else {
                        selected.add(optId);
                      }
                      widget.onSaveAnswer(questionId, selected.join(','));
                    } else {
                      widget.onSaveAnswer(questionId, optId);
                    }
                  },
                  child: AnimatedContainer(
                    duration: const Duration(milliseconds: 200),
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                    decoration: BoxDecoration(
                      color: isSelected ? AppColors.primaryContainer : AppColors.surface,
                      borderRadius: BorderRadius.circular(14),
                      border: Border.all(
                        color: isSelected ? AppColors.primary : AppColors.border,
                        width: isSelected ? 1.5 : 1.0,
                      ),
                      boxShadow: isSelected
                          ? [
                              BoxShadow(
                                color: AppColors.primary.withValues(alpha: 0.12),
                                blurRadius: 8,
                                offset: const Offset(0, 3),
                              ),
                            ]
                          : AppShadows.card,
                    ),
                    child: Row(
                      crossAxisAlignment: CrossAxisAlignment.center,
                      children: [
                        // Option Letter Badge (A, B, C, D)
                        AnimatedContainer(
                          duration: const Duration(milliseconds: 200),
                          width: 32,
                          height: 32,
                          decoration: BoxDecoration(
                            shape: BoxShape.circle,
                            color: isSelected ? AppColors.primary : AppColors.surfaceSubtle,
                            border: Border.all(
                              color: isSelected ? AppColors.primary : AppColors.border,
                              width: 1,
                            ),
                          ),
                          child: Center(
                            child: Text(
                              label,
                              style: TextStyle(
                                color: isSelected ? Colors.white : AppColors.textSecondary,
                                fontWeight: FontWeight.w700,
                                fontSize: 13,
                              ),
                            ),
                          ),
                        ),
                        const SizedBox(width: 14),
                        Expanded(
                          child: Text(
                            optText,
                            style: TextStyle(
                              fontSize: 14,
                              height: 1.45,
                              fontWeight: isSelected ? FontWeight.w600 : FontWeight.w500,
                              color: isSelected ? AppColors.textPrimary : AppColors.textPrimary.withValues(alpha: 0.85),
                            ),
                          ),
                        ),
                        if (isSelected) ...[
                          const SizedBox(width: 8),
                          const Icon(
                            Icons.check_circle_rounded,
                            size: 20,
                            color: AppColors.primary,
                          ),
                        ],
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

  Widget _buildEssayInput(String questionId) {
    final essayAnswer = widget.examState.answers[questionId] ?? '';
    return Container(
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.border),
        boxShadow: AppShadows.card,
      ),
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Jawaban Esai Anda',
            style: TextStyle(
              fontSize: 13,
              fontWeight: FontWeight.w700,
              color: AppColors.textPrimary,
            ),
          ),
          const SizedBox(height: 10),
          TextFormField(
            key: ValueKey('essay_$questionId'),
            initialValue: essayAnswer,
            maxLines: 6,
            minLines: 4,
            style: const TextStyle(fontSize: 14, color: AppColors.textPrimary, height: 1.5),
            decoration: const InputDecoration(
              hintText: 'Ketik jawaban esai secara lengkap di sini...',
              border: OutlineInputBorder(),
              contentPadding: EdgeInsets.all(14),
            ),
            onChanged: (value) {
              _debounce?.cancel();
              _debounce = Timer(const Duration(milliseconds: 500), () {
                widget.onSaveAnswer(questionId, value);
              });
            },
          ),
        ],
      ),
    );
  }
}
