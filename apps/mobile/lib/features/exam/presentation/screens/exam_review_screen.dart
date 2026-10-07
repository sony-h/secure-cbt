import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:go_router/go_router.dart';
import 'package:secure_cbt_mobile/core/network/dio_client.dart';
import 'package:secure_cbt_mobile/core/theme/theme.dart';
import 'package:secure_cbt_mobile/core/utils/date_utils.dart';
import 'package:secure_cbt_mobile/core/widgets/bouncing_button.dart';
import 'package:secure_cbt_mobile/core/widgets/rich_exam_text.dart';
import 'package:secure_cbt_mobile/features/exam/providers/review_provider.dart';

class ExamReviewScreen extends ConsumerStatefulWidget {
  final String sessionId;

  const ExamReviewScreen({super.key, required this.sessionId});

  @override
  ConsumerState<ExamReviewScreen> createState() => _ExamReviewScreenState();
}

class _ExamReviewScreenState extends ConsumerState<ExamReviewScreen> {
  String _filter = 'all'; // 'all', 'correct', 'wrong'

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
    final reviewAsync = ref.watch(examReviewProvider(widget.sessionId));

    return Scaffold(
      backgroundColor: AppColors.canvas,
      appBar: AppBar(
        title: const Text('Pembahasan & Kunci Jawaban'),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new_rounded, size: 18),
          onPressed: () {
            if (context.canPop()) {
              context.pop();
            } else {
              context.pop();
            }
          },
        ),
      ),
      body: reviewAsync.when(
        loading: () => const Center(child: CircularProgressIndicator(color: AppColors.primary)),
        error: (err, _) => Center(
          child: Padding(
            padding: const EdgeInsets.all(28),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: AppColors.warningContainer,
                    shape: BoxShape.circle,
                    border: Border.all(color: AppColors.warning.withValues(alpha: 0.3)),
                  ),
                  child: const Icon(Icons.lock_clock_rounded, size: 48, color: AppColors.warning),
                ),
                const SizedBox(height: 16),
                const Text(
                  'Pembahasan Belum Dibuka',
                  style: TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.w800,
                    letterSpacing: -0.3,
                    color: AppColors.textPrimary,
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  err.toString().replaceAll('Exception: ', ''),
                  textAlign: TextAlign.center,
                  style: const TextStyle(
                    fontSize: 13,
                    height: 1.5,
                    color: AppColors.textSecondary,
                  ),
                ),
                const SizedBox(height: 24),
                BouncingButton(
                  onTap: () => context.pop(),
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 22, vertical: 12),
                    decoration: BoxDecoration(
                      color: AppColors.primary,
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: const Text('Kembali', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w700)),
                  ),
                ),
              ],
            ),
          ),
        ),
        data: (data) {
          final examTitle = data['exam_title']?.toString() ?? 'Ujian';
          final subjectName = data['subject_name']?.toString() ?? 'Mata Pelajaran';
          final totalScore = ((data['total_score'] ?? 0) as num).toDouble();
          final correctCount = data['correct_count'] as int? ?? 0;
          final wrongCount = data['wrong_count'] as int? ?? 0;
          final totalQuestions = data['total_questions'] as int? ?? 0;
          final submittedAt = data['submitted_at'] != null ? DateTime.tryParse(data['submitted_at']) : null;
          final dateStr = submittedAt != null ? formatDateTimeWIB(submittedAt) : '—';
          final allQuestions = (data['questions'] as List<dynamic>? ?? []).cast<Map<String, dynamic>>();

          final filteredQuestions = allQuestions.where((q) {
            final isCorrect = q['is_correct'] == true;
            if (_filter == 'correct') return isCorrect;
            if (_filter == 'wrong') return !isCorrect;
            return true;
          }).toList();

          return ListView(
            padding: const EdgeInsets.fromLTRB(20, 16, 20, 36),
            children: [
              // ── 1. Top Summary Banner Card ──────────────────────
              Container(
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(
                  color: AppColors.surface,
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(color: AppColors.border),
                  boxShadow: AppShadows.card,
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                examTitle,
                                style: const TextStyle(
                                  fontSize: 16,
                                  fontWeight: FontWeight.w800,
                                  letterSpacing: -0.3,
                                  color: AppColors.textPrimary,
                                ),
                              ),
                              const SizedBox(height: 3),
                              Text(
                                '$subjectName • Selesai: $dateStr',
                                style: const TextStyle(
                                  fontSize: 11.5,
                                  color: AppColors.textMuted,
                                  fontWeight: FontWeight.w500,
                                ),
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(width: 12),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                          decoration: BoxDecoration(
                            color: totalScore >= 60 ? AppColors.successContainer : AppColors.warningContainer,
                            borderRadius: BorderRadius.circular(14),
                            border: Border.all(
                              color: totalScore >= 60
                                  ? AppColors.success.withValues(alpha: 0.3)
                                  : AppColors.warning.withValues(alpha: 0.3),
                            ),
                          ),
                          child: Column(
                            children: [
                              Text(
                                totalScore.toStringAsFixed(0),
                                style: TextStyle(
                                  fontSize: 22,
                                  fontWeight: FontWeight.w900,
                                  letterSpacing: -0.5,
                                  color: totalScore >= 60 ? AppColors.success : AppColors.warning,
                                ),
                              ),
                              Text(
                                'Skor Akhir',
                                style: TextStyle(
                                  fontSize: 9.5,
                                  fontWeight: FontWeight.w700,
                                  color: totalScore >= 60 ? AppColors.onSuccessContainer : AppColors.onWarningContainer,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 14),
                    const Divider(height: 1, color: AppColors.border),
                    const SizedBox(height: 12),
                    Row(
                      children: [
                        _StatChip(
                          icon: Icons.check_circle_rounded,
                          color: AppColors.success,
                          label: '$correctCount Benar',
                        ),
                        const SizedBox(width: 8),
                        _StatChip(
                          icon: Icons.cancel_rounded,
                          color: AppColors.error,
                          label: '$wrongCount Salah',
                        ),
                        const SizedBox(width: 8),
                        _StatChip(
                          icon: Icons.format_list_numbered_rounded,
                          color: AppColors.primary,
                          label: '$totalQuestions Soal',
                        ),
                      ],
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 18),

              // ── 2. Filter Segmented Pills ───────────────────────
              Row(
                children: [
                  _FilterChip(
                    label: 'Semua (${allQuestions.length})',
                    isSelected: _filter == 'all',
                    onTap: () => setState(() => _filter = 'all'),
                  ),
                  const SizedBox(width: 8),
                  _FilterChip(
                    label: 'Benar ($correctCount)',
                    isSelected: _filter == 'correct',
                    color: AppColors.success,
                    onTap: () => setState(() => _filter = 'correct'),
                  ),
                  const SizedBox(width: 8),
                  _FilterChip(
                    label: 'Salah ($wrongCount)',
                    isSelected: _filter == 'wrong',
                    color: AppColors.error,
                    onTap: () => setState(() => _filter = 'wrong'),
                  ),
                ],
              ),

              const SizedBox(height: 16),

              // ── 3. Questions Review Cards ───────────────────────
              if (filteredQuestions.isEmpty)
                Padding(
                  padding: const EdgeInsets.symmetric(vertical: 40),
                  child: Center(
                    child: Text(
                      'Tidak ada butir soal dalam kategori filter ini.',
                      style: TextStyle(fontSize: 13, color: AppColors.textMuted.withValues(alpha: 0.8)),
                    ),
                  ),
                )
              else
                ...filteredQuestions.map((q) => _buildQuestionReviewCard(context, q)),
            ],
          );
        },
      ),
    );
  }

  Widget _buildQuestionReviewCard(BuildContext context, Map<String, dynamic> q) {
    final number = q['number'] ?? 1;
    final type = q['type']?.toString() ?? 'MULTIPLE_CHOICE';
    final content = q['content']?.toString() ?? '';
    final imageUrl = q['image_url']?.toString();
    final explanation = q['explanation']?.toString();
    final isCorrect = q['is_correct'] == true;
    final score = q['score'] as num? ?? 0;
    final studentAnswer = q['student_answer']?.toString();
    final options = (q['options'] as List<dynamic>? ?? []).cast<Map<String, dynamic>>();

    Color statusColor = isCorrect ? AppColors.success : AppColors.error;
    String statusLabel = isCorrect ? 'Benar (+100)' : 'Salah (0)';
    if (type == 'MATCHING' && score > 0 && score < 100) {
      statusColor = AppColors.warning;
      statusLabel = 'Sebagian (+$score)';
    } else if (type == 'ESSAY') {
      statusColor = AppColors.primary;
      statusLabel = score > 0 ? 'Nilai: $score' : 'Esai';
    }

    return Container(
      margin: const EdgeInsets.only(bottom: 18),
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(
          color: isCorrect ? AppColors.success.withValues(alpha: 0.4) : AppColors.border,
          width: isCorrect ? 1.5 : 1.0,
        ),
        boxShadow: AppShadows.card,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header: Number + Status Badge
          Row(
            children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: AppColors.surfaceSubtle,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(
                  'Soal No. $number',
                  style: const TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w700,
                    color: AppColors.textPrimary,
                  ),
                ),
              ),
              const Spacer(),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: statusColor.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: statusColor.withValues(alpha: 0.3)),
                ),
                child: Text(
                  statusLabel,
                  style: TextStyle(
                    fontSize: 11.5,
                    fontWeight: FontWeight.w800,
                    color: statusColor,
                  ),
                ),
              ),
            ],
          ),

          const SizedBox(height: 12),

          // Stimulus Diagram Image
          if (imageUrl != null && imageUrl.isNotEmpty) ...[
            GestureDetector(
              onTap: () => _showImageZoomDialog(context, imageUrl),
              child: Container(
                margin: const EdgeInsets.only(bottom: 12),
                constraints: const BoxConstraints(maxHeight: 220),
                width: double.infinity,
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(12),
                  color: AppColors.surfaceSubtle,
                  border: Border.all(color: AppColors.border),
                ),
                clipBehavior: Clip.antiAlias,
                child: CachedNetworkImage(
                  imageUrl: resolveMediaUrl(imageUrl),
                  fit: BoxFit.contain,
                ),
              ),
            ),
          ],

          // Question Prompt (KaTeX)
          RichExamText(
            text: content,
            style: const TextStyle(
              fontSize: 14.5,
              height: 1.6,
              fontWeight: FontWeight.w600,
              color: AppColors.textPrimary,
            ),
          ),

          const SizedBox(height: 16),

          // Options / Answer Breakdown by Type
          if (type == 'SHORT_ANSWER')
            _buildShortAnswerReview(q, studentAnswer, isCorrect)
          else if (type == 'MATCHING')
            _buildMatchingReview(q, studentAnswer, options)
          else if (type == 'ESSAY')
            _buildEssayReview(q, studentAnswer)
          else
            _buildObjectiveOptionsReview(context, options, studentAnswer, type),

          // Explanation Box (Teacher's Solution)
          const SizedBox(height: 16),
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: const Color(0xFFF5F3FF), // Soft Violet Wash
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: const Color(0xFFDDD6FE)),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Row(
                  children: [
                    Icon(Icons.lightbulb_rounded, size: 16, color: Color(0xFF7C3AED)),
                    SizedBox(width: 6),
                    Text(
                      'Pembahasan Guru:',
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w800,
                        color: Color(0xFF6D28D9),
                        letterSpacing: -0.2,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 6),
                if (explanation != null && explanation.trim().isNotEmpty)
                  RichExamText(
                    text: explanation,
                    style: const TextStyle(
                      fontSize: 13,
                      height: 1.55,
                      color: Color(0xFF374151),
                      fontWeight: FontWeight.w500,
                    ),
                  )
                else
                  const Text(
                    'Guru tidak menyertakan catatan pembahasan khusus untuk butir soal ini.',
                    style: TextStyle(fontSize: 12, fontStyle: FontStyle.italic, color: AppColors.textMuted),
                  ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildObjectiveOptionsReview(
    BuildContext context,
    List<Map<String, dynamic>> options,
    String? studentAnswer,
    String type,
  ) {
    final selectedIds = type == 'MULTI_SELECT'
        ? (studentAnswer?.split(',').where((s) => s.isNotEmpty).toSet() ?? {})
        : {if (studentAnswer != null) studentAnswer};

    return Column(
      children: List.generate(options.length, (idx) {
        final opt = options[idx];
        final optId = opt['id']?.toString() ?? '';
        final optContent = opt['content']?.toString() ?? '';
        final optImage = opt['image_url']?.toString();
        final isKey = opt['is_correct'] == true;
        final isStudentSelected = selectedIds.contains(optId);
        final label = String.fromCharCode(65 + idx);

        Color borderColor = AppColors.border;
        Color bg = AppColors.surface;
        Widget? badge;

        if (isKey) {
          borderColor = AppColors.success;
          bg = AppColors.successContainer.withValues(alpha: 0.5);
          badge = _OptionBadge(
            label: isStudentSelected ? 'Jawaban Anda (Benar) ✓' : 'Kunci Jawaban ✓',
            color: AppColors.success,
          );
        } else if (isStudentSelected) {
          borderColor = AppColors.error;
          bg = AppColors.errorContainer.withValues(alpha: 0.5);
          badge = const _OptionBadge(label: 'Pilihan Anda (Salah) ✗', color: AppColors.error);
        }

        return Container(
          margin: const EdgeInsets.only(bottom: 8),
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: bg,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: borderColor, width: (isKey || isStudentSelected) ? 1.5 : 1),
          ),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                width: 26,
                height: 26,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: isKey
                      ? AppColors.success
                      : isStudentSelected
                          ? AppColors.error
                          : AppColors.surfaceSubtle,
                ),
                child: Center(
                  child: Text(
                    label,
                    style: TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.w700,
                      color: (isKey || isStudentSelected) ? Colors.white : AppColors.textSecondary,
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    if (optImage != null && optImage.isNotEmpty) ...[
                      GestureDetector(
                        onTap: () => _showImageZoomDialog(context, optImage),
                        child: Container(
                          margin: const EdgeInsets.only(bottom: 6),
                          constraints: const BoxConstraints(maxHeight: 120),
                          decoration: BoxDecoration(
                            borderRadius: BorderRadius.circular(8),
                            color: AppColors.surfaceSubtle,
                          ),
                          clipBehavior: Clip.antiAlias,
                          child: CachedNetworkImage(
                            imageUrl: resolveMediaUrl(optImage),
                            fit: BoxFit.contain,
                          ),
                        ),
                      ),
                    ],
                    if (optContent.isNotEmpty)
                      RichExamText(
                        text: optContent,
                        style: TextStyle(
                          fontSize: 13.5,
                          fontWeight: (isKey || isStudentSelected) ? FontWeight.w700 : FontWeight.w500,
                          color: AppColors.textPrimary,
                        ),
                      ),
                  ],
                ),
              ),
              if (badge != null) ...[
                const SizedBox(width: 8),
                badge,
              ],
            ],
          ),
        );
      }),
    );
  }

  Widget _buildShortAnswerReview(Map<String, dynamic> q, String? studentAnswer, bool isCorrect) {
    final options = (q['options'] as List<dynamic>? ?? []).cast<Map<String, dynamic>>();
    final keys = options.map((o) => o['content']?.toString() ?? '').where((s) => s.isNotEmpty).toList();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Container(
          width: double.infinity,
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: isCorrect ? AppColors.successContainer : AppColors.errorContainer,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: isCorrect ? AppColors.success : AppColors.error),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Jawaban Anda:',
                style: TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.w700,
                  color: isCorrect ? AppColors.onSuccessContainer : AppColors.onErrorContainer,
                ),
              ),
              const SizedBox(height: 2),
              Text(
                (studentAnswer != null && studentAnswer.isNotEmpty) ? studentAnswer : '(Tidak dijawab)',
                style: TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w800,
                  color: isCorrect ? AppColors.success : AppColors.error,
                ),
              ),
            ],
          ),
        ),
        if (!isCorrect && keys.isNotEmpty) ...[
          const SizedBox(height: 8),
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: AppColors.surfaceSubtle,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: AppColors.border),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'Kunci Jawaban yang Diterima:',
                  style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: AppColors.textSecondary),
                ),
                const SizedBox(height: 4),
                Wrap(
                  spacing: 6,
                  children: keys
                      .map((k) => Chip(
                            label: Text(k, style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w700)),
                            backgroundColor: AppColors.successContainer,
                            visualDensity: VisualDensity.compact,
                            materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
                          ))
                      .toList(),
                ),
              ],
            ),
          ),
        ],
      ],
    );
  }

  Widget _buildMatchingReview(
    Map<String, dynamic> q,
    String? studentAnswer,
    List<Map<String, dynamic>> options,
  ) {
    Map<String, String> matches = {};
    try {
      if (studentAnswer != null && studentAnswer.isNotEmpty) {
        matches = Map<String, String>.from(jsonDecode(studentAnswer) as Map);
      }
    } catch (_) {
      matches = {};
    }

    return Column(
      children: List.generate(options.length, (idx) {
        final opt = options[idx];
        final id = opt['id']?.toString() ?? '';
        String left = '';
        String rightKey = '';
        try {
          final parsed = jsonDecode(opt['content']?.toString() ?? '{}');
          left = parsed['left']?.toString() ?? '';
          rightKey = parsed['right']?.toString() ?? '';
        } catch (_) {
          left = opt['content']?.toString() ?? '';
        }

        final studentChoiceId = matches[id];
        final matchedOpt = options.firstWhere(
          (o) => o['id']?.toString() == studentChoiceId,
          orElse: () => {},
        );
        String studentMatchedRight = '';
        try {
          final parsedStudent = jsonDecode(matchedOpt['content']?.toString() ?? '{}');
          studentMatchedRight = parsedStudent['right']?.toString() ?? '';
        } catch (_) {}

        final isPairCorrect = studentChoiceId == id;

        return Container(
          margin: const EdgeInsets.only(bottom: 8),
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: isPairCorrect
                ? AppColors.successContainer.withValues(alpha: 0.4)
                : AppColors.errorContainer.withValues(alpha: 0.4),
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: isPairCorrect ? AppColors.success : AppColors.error),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Icon(
                    isPairCorrect ? Icons.check_circle_rounded : Icons.cancel_rounded,
                    size: 16,
                    color: isPairCorrect ? AppColors.success : AppColors.error,
                  ),
                  const SizedBox(width: 6),
                  Expanded(
                    child: RichExamText(
                      text: left,
                      style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: AppColors.textPrimary),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 6),
              Padding(
                padding: const EdgeInsets.only(left: 22),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Pilihan Anda: ${studentMatchedRight.isNotEmpty ? studentMatchedRight : '(Belum dipasangkan)'}',
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                        color: isPairCorrect ? AppColors.success : AppColors.error,
                      ),
                    ),
                    if (!isPairCorrect) ...[
                      const SizedBox(height: 2),
                      Text(
                        'Kunci Seharusnya: $rightKey',
                        style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: AppColors.success),
                      ),
                    ],
                  ],
                ),
              ),
            ],
          ),
        );
      }),
    );
  }

  Widget _buildEssayReview(Map<String, dynamic> q, String? studentAnswer) {
    final feedback = q['feedback']?.toString();
    final score = q['score'];

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Container(
          width: double.infinity,
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: AppColors.surfaceSubtle,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: AppColors.border),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text('Jawaban Esai Siswa:', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: AppColors.textSecondary)),
              const SizedBox(height: 4),
              Text(
                (studentAnswer != null && studentAnswer.isNotEmpty) ? studentAnswer : '(Tidak dijawab)',
                style: const TextStyle(fontSize: 13, height: 1.5, color: AppColors.textPrimary),
              ),
            ],
          ),
        ),
        if (score != null) ...[
          const SizedBox(height: 8),
          Row(
            children: [
              const Icon(Icons.star_rounded, size: 16, color: AppColors.warning),
              const SizedBox(width: 4),
              Text('Nilai dari Guru: $score / 100', style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: AppColors.textPrimary)),
            ],
          ),
        ],
        if (feedback != null && feedback.isNotEmpty) ...[
          const SizedBox(height: 6),
          Text('Catatan Guru: "$feedback"', style: const TextStyle(fontSize: 12, fontStyle: FontStyle.italic, color: AppColors.textSecondary)),
        ],
      ],
    );
  }
}

class _StatChip extends StatelessWidget {
  final IconData icon;
  final Color color;
  final String label;

  const _StatChip({required this.icon, required this.color, required this.label});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(10),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 14, color: color),
          const SizedBox(width: 5),
          Text(
            label,
            style: TextStyle(fontSize: 11.5, fontWeight: FontWeight.w700, color: color),
          ),
        ],
      ),
    );
  }
}

class _FilterChip extends StatelessWidget {
  final String label;
  final bool isSelected;
  final Color? color;
  final VoidCallback onTap;

  const _FilterChip({
    required this.label,
    required this.isSelected,
    this.color,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final activeColor = color ?? AppColors.primary;
    return BouncingButton(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
        decoration: BoxDecoration(
          color: isSelected ? activeColor : AppColors.surface,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: isSelected ? activeColor : AppColors.border),
          boxShadow: isSelected
              ? [BoxShadow(color: activeColor.withValues(alpha: 0.2), blurRadius: 6, offset: const Offset(0, 2))]
              : AppShadows.card,
        ),
        child: Text(
          label,
          style: TextStyle(
            fontSize: 11.5,
            fontWeight: FontWeight.w700,
            color: isSelected ? Colors.white : AppColors.textSecondary,
          ),
        ),
      ),
    );
  }
}

class _OptionBadge extends StatelessWidget {
  final String label;
  final Color color;

  const _OptionBadge({required this.label, required this.color});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(6),
        border: Border.all(color: color.withValues(alpha: 0.3)),
      ),
      child: Text(
        label,
        style: TextStyle(fontSize: 10, fontWeight: FontWeight.w700, color: color),
      ),
    );
  }
}
