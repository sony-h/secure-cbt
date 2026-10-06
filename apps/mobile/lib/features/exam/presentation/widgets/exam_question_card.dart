import 'dart:async';
import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:secure_cbt_mobile/core/network/dio_client.dart';
import 'package:secure_cbt_mobile/core/theme/theme.dart';
import 'package:secure_cbt_mobile/core/widgets/bouncing_button.dart';
import 'package:secure_cbt_mobile/core/widgets/rich_exam_text.dart';
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

  void _showImageZoomDialog(BuildContext context, String imageUrl) {
    showDialog(
      context: context,
      builder: (ctx) => Dialog(
        backgroundColor: Colors.transparent,
        insetPadding: const EdgeInsets.all(12),
        child: Stack(
          alignment: Alignment.topRight,
          children: [
            Container(
              decoration: BoxDecoration(
                color: Colors.black.withValues(alpha: 0.92),
                borderRadius: BorderRadius.circular(16),
              ),
              clipBehavior: Clip.antiAlias,
              child: InteractiveViewer(
                minScale: 0.8,
                maxScale: 4.0,
                child: Center(
                  child: CachedNetworkImage(
                    imageUrl: resolveMediaUrl(imageUrl),
                    fit: BoxFit.contain,
                    placeholder: (context, url) => const Center(
                      child: CircularProgressIndicator(color: Colors.white),
                    ),
                    errorWidget: (context, url, error) => const Icon(
                      Icons.broken_image_rounded,
                      color: Colors.white54,
                      size: 48,
                    ),
                  ),
                ),
              ),
            ),
            Positioned(
              top: 8,
              right: 8,
              child: IconButton(
                icon: const Icon(Icons.close_rounded, color: Colors.white, size: 28),
                onPressed: () => Navigator.of(ctx).pop(),
              ),
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final content = widget.question['question']?['content'] ?? widget.question['content'] ?? '';
    final imageUrl = widget.question['question']?['image_url'] ?? widget.question['image_url'];
    final options = (widget.question['question']?['options'] as List<dynamic>?) ??
        (widget.question['options'] as List<dynamic>?) ??
        [];
    final questionId = widget.question['question']?['id'] ?? widget.question['id'] ?? '';
    final type = widget.question['question']?['type'] ?? widget.question['type'] ?? '';
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
                Flexible(
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 6),
                    decoration: BoxDecoration(
                      color: AppColors.surfaceSubtle,
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: const Text(
                      'Ganda Kompleks',
                      style: TextStyle(
                        color: AppColors.textSecondary,
                        fontSize: 11,
                        fontWeight: FontWeight.w600,
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
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
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                if (imageUrl != null && imageUrl.toString().isNotEmpty) ...[
                  GestureDetector(
                    onTap: () => _showImageZoomDialog(context, imageUrl.toString()),
                    child: Container(
                      margin: const EdgeInsets.only(bottom: 14),
                      constraints: const BoxConstraints(maxHeight: 240),
                      width: double.infinity,
                      decoration: BoxDecoration(
                        color: AppColors.surfaceSubtle,
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: AppColors.border),
                      ),
                      clipBehavior: Clip.antiAlias,
                      child: Stack(
                        alignment: Alignment.bottomRight,
                        children: [
                          Center(
                            child: CachedNetworkImage(
                              imageUrl: resolveMediaUrl(imageUrl?.toString()),
                              fit: BoxFit.contain,
                              placeholder: (context, url) => const SizedBox(
                                height: 120,
                                child: Center(child: CircularProgressIndicator(strokeWidth: 2)),
                              ),
                              errorWidget: (context, url, error) => const SizedBox(
                                height: 80,
                                child: Center(
                                  child: Icon(Icons.broken_image_rounded, color: AppColors.textMuted),
                                ),
                              ),
                            ),
                          ),
                          Container(
                            margin: const EdgeInsets.all(8),
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                            decoration: BoxDecoration(
                              color: Colors.black.withValues(alpha: 0.6),
                              borderRadius: BorderRadius.circular(6),
                            ),
                            child: const Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Icon(Icons.zoom_in_rounded, size: 14, color: Colors.white),
                                SizedBox(width: 4),
                                Text(
                                  'Perbesar',
                                  style: TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.w600),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ],
                RichExamText(
                  text: content,
                  style: const TextStyle(
                    fontSize: 15,
                    height: 1.68,
                    fontWeight: FontWeight.w500,
                    color: AppColors.textPrimary,
                    letterSpacing: -0.2,
                  ),
                ),
              ],
            ),
          ),

          const SizedBox(height: 20),

          // Options List or Specialized Inputs
          if (type == 'ESSAY')
            _buildEssayInput(questionId)
          else if (type == 'SHORT_ANSWER')
            _buildShortAnswerInput(questionId)
          else if (type == 'MATCHING')
            _buildMatchingInput(questionId, options)
          else if (options.isEmpty)
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
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              if (option['image_url'] != null && option['image_url'].toString().isNotEmpty) ...[
                                GestureDetector(
                                  onTap: () => _showImageZoomDialog(context, option['image_url'].toString()),
                                  child: Container(
                                    margin: const EdgeInsets.only(bottom: 8),
                                    constraints: const BoxConstraints(maxHeight: 140),
                                    decoration: BoxDecoration(
                                      borderRadius: BorderRadius.circular(8),
                                      color: AppColors.surfaceSubtle,
                                      border: Border.all(color: AppColors.border),
                                    ),
                                    clipBehavior: Clip.antiAlias,
                                    child: CachedNetworkImage(
                                      imageUrl: resolveMediaUrl(option['image_url']?.toString()),
                                      fit: BoxFit.contain,
                                    ),
                                  ),
                                ),
                              ],
                              if (optText.isNotEmpty)
                                RichExamText(
                                  text: optText,
                                  style: TextStyle(
                                    fontSize: 14,
                                    height: 1.45,
                                    fontWeight: isSelected ? FontWeight.w600 : FontWeight.w500,
                                    color: isSelected ? AppColors.textPrimary : AppColors.textPrimary.withValues(alpha: 0.85),
                                  ),
                                ),
                            ],
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

  Widget _buildShortAnswerInput(String questionId) {
    final currentAnswer = widget.examState.answers[questionId] ?? '';
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
          Row(
            children: [
              const Icon(Icons.edit_note_rounded, size: 20, color: AppColors.primary),
              const SizedBox(width: 8),
              const Expanded(
                child: Text(
                  'Jawaban Singkat Anda',
                  style: TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w700,
                    color: AppColors.textPrimary,
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ),
              const SizedBox(width: 8),
              if (currentAnswer.isNotEmpty)
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                  decoration: BoxDecoration(
                    color: AppColors.primaryContainer,
                    borderRadius: BorderRadius.circular(6),
                  ),
                  child: const Text(
                    'Tersimpan',
                    style: TextStyle(
                      fontSize: 10,
                      fontWeight: FontWeight.w700,
                      color: AppColors.primary,
                    ),
                  ),
                ),
            ],
          ),
          const SizedBox(height: 12),
          TextFormField(
            key: ValueKey('short_$questionId'),
            initialValue: currentAnswer,
            maxLines: 1,
            textInputAction: TextInputAction.done,
            style: const TextStyle(
              fontSize: 15,
              fontWeight: FontWeight.w600,
              color: AppColors.textPrimary,
              letterSpacing: -0.2,
            ),
            decoration: InputDecoration(
              hintText: 'Ketik jawaban singkat di sini...',
              hintStyle: TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.normal,
                color: AppColors.textMuted.withValues(alpha: 0.8),
              ),
              filled: true,
              fillColor: AppColors.surfaceSubtle,
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: const BorderSide(color: AppColors.border),
              ),
              enabledBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: const BorderSide(color: AppColors.border),
              ),
              focusedBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: const BorderSide(color: AppColors.primary, width: 1.5),
              ),
              contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
            ),
            onChanged: (value) {
              _debounce?.cancel();
              _debounce = Timer(const Duration(milliseconds: 500), () {
                widget.onSaveAnswer(questionId, value.trim());
              });
            },
          ),
        ],
      ),
    );
  }

  Widget _buildMatchingInput(String questionId, List<dynamic> options) {
    Map<String, String> currentMatches = {};
    try {
      final raw = widget.examState.answers[questionId];
      if (raw != null && raw.isNotEmpty) {
        currentMatches = Map<String, String>.from(jsonDecode(raw) as Map);
      }
    } catch (_) {
      currentMatches = {};
    }

    final parsedOptions = <Map<String, dynamic>>[];
    for (final opt in options) {
      if (opt is Map) {
        final id = opt['id']?.toString() ?? '';
        final contentStr = opt['content']?.toString() ?? '';
        String left = '';
        String right = '';
        try {
          final json = jsonDecode(contentStr);
          if (json is Map) {
            left = json['left']?.toString() ?? '';
            right = json['right']?.toString() ?? '';
          }
        } catch (_) {
          left = contentStr;
        }
        parsedOptions.add({
          'id': id,
          'left': left,
          'right': right,
        });
      }
    }

    final totalPairs = parsedOptions.length;
    final matchedCount = currentMatches.values.where((v) => v.isNotEmpty).length;

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
          Row(
            children: [
              const Icon(Icons.compare_arrows_rounded, size: 20, color: AppColors.primary),
              const SizedBox(width: 8),
              const Expanded(
                child: Text(
                  'Pasangkan Jawaban',
                  style: TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w700,
                    color: AppColors.textPrimary,
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ),
              const SizedBox(width: 8),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(
                  color: matchedCount == totalPairs && totalPairs > 0
                      ? AppColors.primaryContainer
                      : AppColors.surfaceSubtle,
                  borderRadius: BorderRadius.circular(6),
                ),
                child: Text(
                  '$matchedCount/$totalPairs Terpasang',
                  style: TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.w700,
                    color: matchedCount == totalPairs && totalPairs > 0
                        ? AppColors.primary
                        : AppColors.textSecondary,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 14),

          ...List.generate(parsedOptions.length, (idx) {
            final item = parsedOptions[idx];
            final optId = item['id'] as String;
            final leftText = item['left'] as String;
            final selectedRightId = currentMatches[optId];

            return Container(
              margin: const EdgeInsets.only(bottom: 12),
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: selectedRightId != null
                    ? AppColors.primaryContainer.withValues(alpha: 0.25)
                    : AppColors.surfaceSubtle,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(
                  color: selectedRightId != null
                      ? AppColors.primary.withValues(alpha: 0.5)
                      : AppColors.border,
                ),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Container(
                        width: 22,
                        height: 22,
                        decoration: const BoxDecoration(
                          shape: BoxShape.circle,
                          color: AppColors.primary,
                        ),
                        child: Center(
                          child: Text(
                            '${idx + 1}',
                            style: const TextStyle(
                              color: Colors.white,
                              fontSize: 11,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: RichExamText(
                          text: leftText,
                          style: const TextStyle(
                            fontSize: 13.5,
                            fontWeight: FontWeight.w600,
                            color: AppColors.textPrimary,
                            height: 1.4,
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 10),

                  // Dropdown Selector for Right Target
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 12),
                    decoration: BoxDecoration(
                      color: AppColors.surface,
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(color: AppColors.border),
                    ),
                    child: DropdownButtonHideUnderline(
                      child: DropdownButton<String>(
                        isExpanded: true,
                        value: selectedRightId,
                        hint: const Text(
                          '-- Pilih Pasangan Jawaban --',
                          style: TextStyle(fontSize: 12, color: AppColors.textMuted),
                        ),
                        icon: const Icon(Icons.arrow_drop_down_rounded, color: AppColors.primary),
                        items: parsedOptions.map((target) {
                          final targetId = target['id'] as String;
                          final targetText = target['right'] as String;
                          return DropdownMenuItem<String>(
                            value: targetId,
                            child: RichExamText(
                              text: targetText,
                              style: const TextStyle(fontSize: 12.5, fontWeight: FontWeight.w500),
                            ),
                          );
                        }).toList(),
                        onChanged: (newTargetId) {
                          final updated = Map<String, String>.from(currentMatches);
                          if (newTargetId != null) {
                            updated[optId] = newTargetId;
                          } else {
                            updated.remove(optId);
                          }
                          widget.onSaveAnswer(questionId, jsonEncode(updated));
                        },
                      ),
                    ),
                  ),
                ],
              ),
            );
          }),
        ],
      ),
    );
  }
}
