import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:secure_cbt_mobile/core/widgets/app_card.dart';
import 'package:secure_cbt_mobile/core/widgets/empty_state.dart';
import 'package:secure_cbt_mobile/features/auth/providers/auth_provider.dart';
import 'package:secure_cbt_mobile/features/history/providers/history_provider.dart';

class HistoryScreen extends ConsumerStatefulWidget {
  const HistoryScreen({super.key});

  @override
  ConsumerState<HistoryScreen> createState() => _HistoryScreenState();
}

class _HistoryScreenState extends ConsumerState<HistoryScreen> {
  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final historyAsync = ref.watch(historyDataProvider);

    ref.listen(authProvider, (prev, next) {
      if (prev != null && !prev.isAuthenticated && next.isAuthenticated) {
        ref.invalidate(historyDataProvider);
      }
    });

    final history = historyAsync.valueOrNull ?? [];
    final isLoading = historyAsync.isLoading;

    return Scaffold(
      backgroundColor: theme.scaffoldBackgroundColor,
      appBar: AppBar(title: const Text('Riwayat', style: TextStyle(fontWeight: FontWeight.bold))),
      body: isLoading
          ? const Center(child: CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: () async { ref.invalidate(historyDataProvider); },
              child: history.isEmpty
                  ? ListView(
                      children: [
                        SizedBox(
                          height: MediaQuery.of(context).size.height * 0.6,
                          child: const EmptyState(
                            icon: Icons.history_rounded,
                            title: 'Belum ada riwayat ujian',
                            subtitle: 'Hasil ujian yang sudah selesai akan muncul di sini.',
                          ),
                        ),
                      ],
                    )
                  : ListView.builder(
                      padding: const EdgeInsets.fromLTRB(16, 12, 16, 24),
                      itemCount: history.length,
                      itemBuilder: (context, index) {
                        final h = history[index];
                        final totalScore = (h['total_score'] as num).toDouble();
                        final passed = totalScore >= 60;

                        return AppCard(
                          margin: const EdgeInsets.only(bottom: 10),
                          borderRadius: 14,
                          padding: const EdgeInsets.all(16),
                          child: Row(
                            children: [
                              Container(
                                width: 44, height: 44,
                                decoration: BoxDecoration(
                                  color: passed ? Colors.green.shade50 : Colors.red.shade50,
                                  borderRadius: BorderRadius.circular(12),
                                ),
                                child: Icon(passed ? Icons.check_circle_outline_rounded : Icons.cancel_outlined, color: passed ? Colors.green.shade600 : Colors.red.shade600, size: 24),
                              ),
                              const SizedBox(width: 14),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(h['exam_title'] ?? '', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: Color(0xFF0F172A)), maxLines: 2, overflow: TextOverflow.ellipsis),
                                    const SizedBox(height: 4),
                                    Row(
                                      children: [
                                        Icon(Icons.check_circle_rounded, size: 12, color: Colors.green.shade600),
                                        const SizedBox(width: 3),
                                        Text('${h['correct_count'] ?? 0}', style: TextStyle(fontSize: 12, color: Colors.green.shade600)),
                                        const SizedBox(width: 10),
                                        Icon(Icons.cancel_rounded, size: 12, color: Colors.red.shade600),
                                        const SizedBox(width: 3),
                                        Text('${h['wrong_count'] ?? 0}', style: TextStyle(fontSize: 12, color: Colors.red.shade600)),
                                      ],
                                    ),
                                  ],
                                ),
                              ),
                              Column(
                                crossAxisAlignment: CrossAxisAlignment.end,
                                children: [
                                  Text(totalScore.toStringAsFixed(0), style: TextStyle(fontWeight: FontWeight.bold, fontSize: 20, color: passed ? Colors.green.shade700 : Colors.red.shade700)),
                                  const SizedBox(height: 2),
                                  Text(passed ? 'Lulus' : 'Remedial', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: passed ? Colors.green.shade600 : Colors.red.shade600)),
                                ],
                              ),
                            ],
                          ),
                        );
                      },
                    ),
            ),
    );
  }
}
