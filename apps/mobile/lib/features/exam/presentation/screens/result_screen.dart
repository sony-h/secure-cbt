import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:secure_cbt_mobile/app/route_names.dart';
import 'package:secure_cbt_mobile/features/exam/providers/result_provider.dart';
import 'package:secure_cbt_mobile/features/home/providers/home_provider.dart';
import 'package:secure_cbt_mobile/features/exams/providers/exams_provider.dart';
import 'package:secure_cbt_mobile/features/history/providers/history_provider.dart';

class ResultScreen extends ConsumerStatefulWidget {
  final String sessionId;

  const ResultScreen({super.key, required this.sessionId});

  @override
  ConsumerState<ResultScreen> createState() => _ResultScreenState();
}

class _ResultScreenState extends ConsumerState<ResultScreen> {
  bool _showContent = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) setState(() => _showContent = true);
    });
  }

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
                              onPressed: () {
                                ref.invalidate(homeDataProvider);
                                ref.invalidate(examsDataProvider);
                                ref.invalidate(historyDataProvider);
                                context.goNamed(RouteNames.home);
                              },
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
                          AnimatedOpacity(
                            opacity: _showContent ? 1.0 : 0.0,
                            duration: const Duration(milliseconds: 400),
                            child: Column(
                              children: [
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
                                    color: theme.colorScheme.onSurface,
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
                              ],
                            ),
                          ),
                          const SizedBox(height: 32),
                          Center(
                            child: TweenAnimationBuilder<double>(
                              tween: Tween(begin: 0, end: ((resultAsync.value?['total_score'] ?? 0.0) as num).toDouble() / 100.0),
                              duration: const Duration(seconds: 1),
                              curve: Curves.easeOutCubic,
                              builder: (context, value, child) {
                                return SizedBox(
                                  width: 160,
                                  height: 160,
                                  child: Stack(
                                    fit: StackFit.expand,
                                    children: [
                                      CircularProgressIndicator(
                                        value: value,
                                        strokeWidth: 12,
                                        backgroundColor: theme.colorScheme.surfaceContainerHighest,
                                        valueColor: AlwaysStoppedAnimation(value >= 0.6 ? Colors.green : theme.colorScheme.error),
                                      ),
                                      Center(
                                        child: Column(
                                          mainAxisAlignment: MainAxisAlignment.center,
                                          children: [
                                            Text(
                                              '${(value * 100).round()}%',
                                              style: theme.textTheme.headlineMedium?.copyWith(
                                                fontWeight: FontWeight.bold,
                                                color: theme.colorScheme.onSurface,
                                              ),
                                            ),
                                            const SizedBox(height: 4),
                                            Text(
                                              'Nilai Akhir',
                                              style: theme.textTheme.bodySmall?.copyWith(
                                                color: theme.colorScheme.onSurfaceVariant,
                                                fontWeight: FontWeight.w500,
                                              ),
                                            ),
                                          ],
                                        ),
                                      ),
                                    ],
                                  ),
                                );
                              },
                            ),
                          ),
                          const SizedBox(height: 40),
                          Text(
                            'Ringkasan Penilaian',
                            style: theme.textTheme.titleSmall?.copyWith(
                              fontWeight: FontWeight.bold,
                              color: theme.colorScheme.onSurfaceVariant,
                            ),
                          ),
                          const SizedBox(height: 10),
                          Card(
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(16),
                              side: BorderSide(color: theme.colorScheme.outlineVariant),
                            ),
                            child: Padding(
                              padding: const EdgeInsets.all(20),
                              child: Column(
                                children: [
                                  _buildMetricRow(
                                    index: 0,
                                    icon: Icons.check_circle_rounded,
                                    iconColor: Colors.green.shade600,
                                    label: 'Jawaban Benar',
                                    value: '${resultAsync.value?['correct_count'] ?? 0}',
                                    theme: theme,
                                  ),
                                  Divider(height: 24, color: theme.colorScheme.outlineVariant.withValues(alpha: 0.5)),
                                  _buildMetricRow(
                                    index: 1,
                                    icon: Icons.cancel_rounded,
                                    iconColor: Colors.red.shade600,
                                    label: 'Jawaban Salah',
                                    value: '${resultAsync.value?['wrong_count'] ?? 0}',
                                    theme: theme,
                                  ),
                                  if (resultAsync.value?['essay_score'] != null) ...[
                                    Divider(height: 24, color: theme.colorScheme.outlineVariant.withValues(alpha: 0.5)),
                                    _buildMetricRow(
                                      index: 2,
                                      icon: Icons.edit_note_rounded,
                                      iconColor: theme.colorScheme.primary,
                                      label: 'Nilai Esai',
                                      value: ((resultAsync.value?['essay_score'] ?? 0.0) as num).toStringAsFixed(1),
                                      theme: theme,
                                    ),
                                  ],
                                ],
                              ),
                            ),
                          ),
                          const SizedBox(height: 36),
                          ElevatedButton.icon(
                            onPressed: () {
                              ref.invalidate(homeDataProvider);
                              ref.invalidate(examsDataProvider);
                              ref.invalidate(historyDataProvider);
                              context.goNamed(RouteNames.home);
                            },
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

  Widget _buildMetricRow({
    required int index,
    required IconData icon,
    required Color iconColor,
    required String label,
    required String value,
    required ThemeData theme,
  }) {
    return TweenAnimationBuilder<double>(
      tween: Tween(begin: 0, end: 1),
      duration: const Duration(milliseconds: 300),
      onEnd: null,
      builder: (context, animValue, child) =>
          Opacity(opacity: animValue, child: Transform.translate(offset: Offset(0, 20 * (1 - animValue)), child: child)),
      child: _MetricRow(
        icon: icon,
        iconColor: iconColor,
        label: label,
        value: value,
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
    final theme = Theme.of(context);
    return Row(
      children: [
        Icon(icon, color: iconColor, size: 20),
        const SizedBox(width: 12),
        Text(
          label,
          style: TextStyle(fontWeight: FontWeight.w500, color: theme.colorScheme.onSurfaceVariant, fontSize: 14),
        ),
        const Spacer(),
        Text(
          value,
          style: TextStyle(fontWeight: FontWeight.bold, color: theme.colorScheme.onSurface, fontSize: 16),
        ),
      ],
    );
  }
}
