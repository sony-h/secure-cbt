import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:secure_cbt_mobile/core/theme/subject_theme.dart';
import 'package:secure_cbt_mobile/core/theme/theme.dart';
import 'package:secure_cbt_mobile/core/utils/date_utils.dart';
import 'package:secure_cbt_mobile/core/widgets/app_card.dart';
import 'package:secure_cbt_mobile/core/widgets/empty_state.dart';
import 'package:secure_cbt_mobile/core/widgets/status_pill.dart';
import 'package:secure_cbt_mobile/features/history/providers/history_provider.dart';

class HistoryScreen extends ConsumerStatefulWidget {
  const HistoryScreen({super.key});

  @override
  ConsumerState<HistoryScreen> createState() => _HistoryScreenState();
}

class _HistoryScreenState extends ConsumerState<HistoryScreen> {
  @override
  Widget build(BuildContext context) {
    final historyAsync = ref.watch(historyDataProvider);

    final history = historyAsync.valueOrNull ?? [];
    final isLoading = historyAsync.isLoading;

    return Scaffold(
      backgroundColor: AppColors.canvas,
      appBar: AppBar(
        title: const Text('Riwayat Ujian'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh_rounded, size: 22),
            onPressed: () => ref.invalidate(historyDataProvider),
            tooltip: 'Segarkan',
          ),
          const SizedBox(width: 8),
        ],
      ),
      body: isLoading
          ? const Center(child: CircularProgressIndicator(color: AppColors.primary))
          : RefreshIndicator(
              onRefresh: () async { ref.invalidate(historyDataProvider); },
              color: AppColors.primary,
              child: history.isEmpty
                  ? ListView(
                      children: [
                        SizedBox(
                          height: MediaQuery.of(context).size.height * 0.65,
                          child: const EmptyState(
                            icon: Icons.history_rounded,
                            title: 'Belum Ada Riwayat Ujian',
                            subtitle: 'Hasil dan skor ujian yang telah Anda selesaikan akan dicatat di sini.',
                          ),
                        ),
                      ],
                    )
                  : ListView.builder(
                      padding: const EdgeInsets.fromLTRB(20, 16, 20, 100),
                      itemCount: history.length,
                      itemBuilder: (context, index) {
                        final h = history[index];
                        final totalScore = ((h['total_score'] ?? 0) as num).toDouble();
                        final passed = totalScore >= 60.0;
                        final submittedAt = h['submitted_at'] as String?;
                        final examTitle = h['exam_title'] as String? ?? 'Ujian';
                        final subjectName = h['subject_name'] as String? ?? '';

                        final sTheme = SubjectTheme.fromSubject(name: subjectName, code: examTitle);

                        final dateStr = submittedAt != null
                            ? (() {
                                try {
                                  return formatDateTimeWIB(DateTime.parse(submittedAt));
                                } catch (_) {
                                  return '-';
                                }
                              })()
                            : '-';

                        return Padding(
                          padding: const EdgeInsets.only(bottom: 12),
                          child: AppCard(
                            padding: const EdgeInsets.all(16),
                            child: Row(
                              crossAxisAlignment: CrossAxisAlignment.center,
                              children: [
                                // Themed Subject Icon Box
                                Container(
                                  width: 46,
                                  height: 46,
                                  decoration: BoxDecoration(
                                    color: sTheme.backgroundWash,
                                    borderRadius: BorderRadius.circular(12),
                                    border: Border.all(color: sTheme.border),
                                  ),
                                  child: Icon(
                                    sTheme.icon,
                                    color: sTheme.primary,
                                    size: 22,
                                  ),
                                ),
                                const SizedBox(width: 14),

                                // Title and Detail Breakdown
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        examTitle,
                                        style: const TextStyle(
                                          fontWeight: FontWeight.w700,
                                          fontSize: 14,
                                          letterSpacing: -0.2,
                                          color: AppColors.textPrimary,
                                        ),
                                        maxLines: 1,
                                        overflow: TextOverflow.ellipsis,
                                      ),
                                      const SizedBox(height: 3),
                                      Text(
                                        dateStr,
                                        style: const TextStyle(
                                          fontSize: 11,
                                          color: AppColors.textMuted,
                                          fontWeight: FontWeight.w500,
                                        ),
                                      ),
                                      const SizedBox(height: 6),
                                      Row(
                                        children: [
                                          const Icon(Icons.check_rounded, size: 13, color: AppColors.success),
                                          const SizedBox(width: 3),
                                          Text(
                                            '${h['correct_count'] ?? 0} Benar',
                                            style: const TextStyle(
                                              fontSize: 11,
                                              fontWeight: FontWeight.w600,
                                              color: AppColors.success,
                                              fontFeatures: [FontFeature.tabularFigures()],
                                            ),
                                          ),
                                          const SizedBox(width: 10),
                                          const Icon(Icons.close_rounded, size: 13, color: AppColors.error),
                                          const SizedBox(width: 3),
                                          Text(
                                            '${h['wrong_count'] ?? 0} Salah',
                                            style: const TextStyle(
                                              fontSize: 11,
                                              fontWeight: FontWeight.w600,
                                              color: AppColors.error,
                                              fontFeatures: [FontFeature.tabularFigures()],
                                            ),
                                          ),
                                        ],
                                      ),
                                    ],
                                  ),
                                ),

                                const SizedBox(width: 10),

                                // Score and Status Pill
                                Column(
                                  crossAxisAlignment: CrossAxisAlignment.end,
                                  children: [
                                    Text(
                                      totalScore.toStringAsFixed(0),
                                      style: TextStyle(
                                        fontWeight: FontWeight.w900,
                                        fontSize: 22,
                                        letterSpacing: -0.5,
                                        fontFeatures: const [FontFeature.tabularFigures()],
                                        color: passed ? AppColors.success : AppColors.warning,
                                      ),
                                    ),
                                    const SizedBox(height: 4),
                                    StatusPill.passOrFail(passed: passed, compact: true),
                                  ],
                                ),
                              ],
                            ),
                          ),
                        );
                      },
                    ),
            ),
    );
  }
}
