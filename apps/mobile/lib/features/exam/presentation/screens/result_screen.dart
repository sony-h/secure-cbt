import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:secure_cbt_mobile/app/route_names.dart';
import 'package:secure_cbt_mobile/features/exam/providers/result_provider.dart';

class ResultScreen extends ConsumerStatefulWidget {
  final String sessionId;

  const ResultScreen({super.key, required this.sessionId});

  @override
  ConsumerState<ResultScreen> createState() => _ResultScreenState();
}

class _ResultScreenState extends ConsumerState<ResultScreen> {
  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final resultAsync = ref.watch(examResultProvider(widget.sessionId));

    return PopScope(
      canPop: false,
      child: Scaffold(
        backgroundColor: theme.scaffoldBackgroundColor,
        body: SafeArea(
          child: resultAsync.isLoading
              ? const Center(child: CircularProgressIndicator())
              : resultAsync.hasError
                  ? Center(
                      child: Padding(
                        padding: const EdgeInsets.all(32),
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(Icons.error_outline_rounded, size: 64, color: theme.colorScheme.error),
                            const SizedBox(height: 16),
                            Text(
                              'Gagal Memuat Hasil',
                              style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold),
                            ),
                            const SizedBox(height: 8),
                            Text(
                              resultAsync.error?.toString() ?? 'Gagal memuat hasil ujian',
                              textAlign: TextAlign.center,
                              style: TextStyle(color: Colors.grey.shade500),
                            ),
                            const SizedBox(height: 32),
                            ElevatedButton.icon(
                              onPressed: () => context.goNamed(RouteNames.home),
                              icon: const Icon(Icons.arrow_back_ios_new_rounded, size: 16),
                              label: const Text('KEMBALI KE BERANDA'),
                            ),
                          ],
                        ),
                      ),
                    )
                  : SingleChildScrollView(
                      padding: const EdgeInsets.all(28),
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          const SizedBox(height: 20),
                          Center(
                            child: Container(
                              padding: const EdgeInsets.all(16),
                              decoration: BoxDecoration(
                                color: Colors.green.shade50,
                                shape: BoxShape.circle,
                              ),
                              child: Icon(
                                Icons.check_circle_outline_rounded,
                                size: 64,
                                color: Colors.green.shade600,
                              ),
                            ),
                          ),
                          const SizedBox(height: 24),
                          Text(
                            'Ujian Selesai!',
                            textAlign: TextAlign.center,
                            style: theme.textTheme.headlineSmall?.copyWith(
                              fontWeight: FontWeight.bold,
                              color: const Color(0xFF0F172A),
                            ),
                          ),
                          const SizedBox(height: 8),
                          Text(
                            resultAsync.value?['exam_title'] ?? 'Ujian',
                            textAlign: TextAlign.center,
                            style: theme.textTheme.bodyMedium?.copyWith(
                              color: theme.colorScheme.primary,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                          const SizedBox(height: 32),
                          Center(
                            child: SizedBox(
                              width: 160,
                              height: 160,
                              child: Stack(
                                fit: StackFit.expand,
                                children: [
                                  CircularProgressIndicator(
                                    value: ((resultAsync.value?['total_score'] ?? 0.0) as num).toDouble() / 100.0,
                                    strokeWidth: 12,
                                    backgroundColor: const Color(0xFFF1F5F9),
                                    valueColor: AlwaysStoppedAnimation(theme.colorScheme.primary),
                                  ),
                                  Center(
                                    child: Column(
                                      mainAxisAlignment: MainAxisAlignment.center,
                                      children: [
                                        Text(
                                          '${((resultAsync.value?['total_score'] ?? 0.0) as num).toStringAsFixed(0)}%',
                                          style: theme.textTheme.headlineMedium?.copyWith(
                                            fontWeight: FontWeight.bold,
                                            color: const Color(0xFF0F172A),
                                          ),
                                        ),
                                        Text(
                                          'Nilai Akhir',
                                          style: theme.textTheme.bodySmall?.copyWith(
                                            color: const Color(0xFF64748B),
                                            fontWeight: FontWeight.w500,
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ),
                          const SizedBox(height: 40),
                          Text(
                            'Ringkasan Penilaian',
                            style: theme.textTheme.titleSmall?.copyWith(
                              fontWeight: FontWeight.bold,
                              color: const Color(0xFF334155),
                            ),
                          ),
                          const SizedBox(height: 10),
                          Card(
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(16),
                              side: const BorderSide(color: Color(0xFFE2E8F0)),
                            ),
                            child: Padding(
                              padding: const EdgeInsets.all(20),
                              child: Column(
                                children: [
                                  _MetricRow(
                                    icon: Icons.check_circle_rounded,
                                    iconColor: Colors.green.shade600,
                                    label: 'Jawaban Benar',
                                    value: '${resultAsync.value?['correct_count'] ?? 0}',
                                  ),
                                  const Divider(height: 24, color: Color(0xFFF1F5F9)),
                                  _MetricRow(
                                    icon: Icons.cancel_rounded,
                                    iconColor: Colors.red.shade600,
                                    label: 'Jawaban Salah',
                                    value: '${resultAsync.value?['wrong_count'] ?? 0}',
                                  ),
                                  if (resultAsync.value?['essay_score'] != null) ...[
                                    const Divider(height: 24, color: Color(0xFFF1F5F9)),
                                    _MetricRow(
                                      icon: Icons.edit_note_rounded,
                                      iconColor: theme.colorScheme.primary,
                                      label: 'Nilai Esai',
                                      value: ((resultAsync.value?['essay_score'] ?? 0.0) as num).toStringAsFixed(1),
                                    ),
                                  ],
                                ],
                              ),
                            ),
                          ),
                          const SizedBox(height: 36),
                          ElevatedButton.icon(
                            onPressed: () => context.goNamed(RouteNames.home),
                            icon: const Icon(Icons.arrow_back_ios_new_rounded, size: 16),
                            label: const Text('KEMBALI KE BERANDA'),
                          ),
                          const SizedBox(height: 20),
                        ],
                      ),
                    ),
        ),
      ),
    );
  }
}

class _MetricRow extends StatelessWidget {
  final IconData icon;
  final Color iconColor;
  final String label;
  final String value;

  const _MetricRow({
    required this.icon,
    required this.iconColor,
    required this.label,
    required this.value,
  });

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Icon(icon, color: iconColor, size: 20),
        const SizedBox(width: 12),
        Text(
          label,
          style: const TextStyle(fontWeight: FontWeight.w500, color: Color(0xFF475569), fontSize: 14),
        ),
        const Spacer(),
        Text(
          value,
          style: const TextStyle(fontWeight: FontWeight.bold, color: Color(0xFF0F172A), fontSize: 16),
        ),
      ],
    );
  }
}
