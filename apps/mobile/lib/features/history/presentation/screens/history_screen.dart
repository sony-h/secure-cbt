import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:secure_cbt_mobile/core/network/dio_client.dart';
import 'package:secure_cbt_mobile/features/auth/providers/auth_provider.dart';

class HistoryScreen extends ConsumerStatefulWidget {
  const HistoryScreen({super.key});

  @override
  ConsumerState<HistoryScreen> createState() => _HistoryScreenState();
}

class _HistoryScreenState extends ConsumerState<HistoryScreen> {
  bool _isLoading = true;
  List<Map<String, dynamic>> _history = [];

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _loadHistory());
  }

  Future<void> _loadHistory() async {
    try {
      final dio = ref.read(dioProvider);
      final res = await dio.get('/sessions/history');
      setState(() {
        _history = List<Map<String, dynamic>>.from(res.data['data'] ?? []);
        _isLoading = false;
      });
    } catch (_) {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    ref.listen(authProvider, (prev, next) {
      if (prev != null && !prev.isAuthenticated && next.isAuthenticated) {
        WidgetsBinding.instance.addPostFrameCallback((_) => _loadHistory());
      }
    });

    final theme = Theme.of(context);

    return Scaffold(
      backgroundColor: theme.scaffoldBackgroundColor,
      appBar: AppBar(title: const Text('Riwayat', style: TextStyle(fontWeight: FontWeight.bold))),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: _loadHistory,
              child: _history.isEmpty
                  ? ListView(
                      children: [
                        SizedBox(
                          height: MediaQuery.of(context).size.height * 0.6,
                          child: Center(
                            child: Column(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                Icon(Icons.history_rounded, size: 64, color: Colors.grey.shade400),
                                const SizedBox(height: 16),
                                const Text('Belum ada riwayat ujian', style: TextStyle(fontWeight: FontWeight.bold)),
                                const SizedBox(height: 8),
                                Text('Hasil ujian yang sudah selesai akan muncul di sini.', textAlign: TextAlign.center, style: TextStyle(color: Colors.grey.shade500, fontSize: 13)),
                              ],
                            ),
                          ),
                        ),
                      ],
                    )
                  : ListView.builder(
                      padding: const EdgeInsets.fromLTRB(16, 12, 16, 24),
                      itemCount: _history.length,
                      itemBuilder: (context, index) {
                        final h = _history[index];
                        final totalScore = (h['total_score'] as num).toDouble();
                        final passed = totalScore >= 60;

                        return Card(
                          margin: const EdgeInsets.only(bottom: 10),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14), side: const BorderSide(color: Color(0xFFE2E8F0))),
                          child: Padding(
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
                          ),
                        );
                      },
                    ),
            ),
    );
  }
}