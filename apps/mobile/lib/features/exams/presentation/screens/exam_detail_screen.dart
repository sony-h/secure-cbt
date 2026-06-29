import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:secure_cbt_mobile/app/route_names.dart';
import 'package:secure_cbt_mobile/core/utils/date_utils.dart';
import 'package:secure_cbt_mobile/core/widgets/app_card.dart';
import 'package:secure_cbt_mobile/core/widgets/app_icon_box.dart';

class ExamDetailScreen extends StatelessWidget {
  final Map<String, dynamic> exam;

  const ExamDetailScreen({super.key, required this.exam});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final title = exam['title'] as String? ?? '';
    final subject = exam['subject'] as Map<String, dynamic>?;
    final subjectName = subject?['name'] as String? ?? '';
    final duration = exam['duration_minutes'] as int? ?? 0;
    final startAt = exam['start_at'] as String? ?? '';
    final endAt = exam['end_at'] as String? ?? '';
    final description = exam['description'] as String? ?? '';
    final count = exam['_count'] as Map<String, dynamic>?;
    final questionCount = count?['exam_questions'] as int? ?? 0;
    final packageCount = exam['package_count'] as int? ?? 1;
    final questionDisplay = packageCount > 1 ? (questionCount / packageCount).round() : questionCount;

    final startLabel = (() {
      try { return formatDateTimeWIB(DateTime.parse(startAt)); } catch (_) { return '-'; }
    })();
    final endLabel = (() {
      try { return formatDateTimeWIB(DateTime.parse(endAt)); } catch (_) { return '-'; }
    })();

    return Scaffold(
      backgroundColor: theme.scaffoldBackgroundColor,
      appBar: AppBar(
        title: const Text('Detail Ujian', style: TextStyle(fontWeight: FontWeight.bold)),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new_rounded, size: 20),
          onPressed: () => context.goNamed(RouteNames.exams),
        ),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            AppCard(
              padding: const EdgeInsets.all(24),
              child: Column(
                children: [
                  AppIconBox(
                    icon: Icons.assignment_rounded,
                    color: theme.colorScheme.primary,
                    size: 64,
                    iconSize: 32,
                  ),
                  const SizedBox(height: 16),
                  Text(title, textAlign: TextAlign.center, style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: theme.colorScheme.onSurface), maxLines: 3, overflow: TextOverflow.ellipsis),
                  const SizedBox(height: 6),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                    decoration: BoxDecoration(color: theme.colorScheme.primary.withValues(alpha: 0.08), borderRadius: BorderRadius.circular(12)),
                    child: Text(subjectName, style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: theme.colorScheme.primary)),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),
            AppCard(
              padding: const EdgeInsets.all(20),
              child: Column(
                  children: [
                    _InfoRow(icon: Icons.timer_outlined, label: 'Durasi', value: formatDetailDuration(duration)),
                    const SizedBox(height: 24),
                    _InfoRow(icon: Icons.help_outline_rounded, label: 'Jumlah Soal', value: '$questionDisplay soal'),
                    const SizedBox(height: 24),
                    _InfoRow(icon: Icons.play_circle_outline_rounded, label: 'Mulai', value: startLabel),
                    const SizedBox(height: 12),
                    _InfoRow(icon: Icons.stop_circle_outlined, label: 'Selesai', value: endLabel),
                ],
              ),
            ),
            if (description.isNotEmpty) ...[
              const SizedBox(height: 16),
              AppCard(
                padding: const EdgeInsets.all(20),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('Deskripsi', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: Color(0xFF0F172A))),
                    const SizedBox(height: 8),
                    Text(description, style: const TextStyle(fontSize: 13, height: 1.5, color: Color(0xFF475569))),
                  ],
                ),
              ),
            ],
            const SizedBox(height: 32),
            ElevatedButton(
              onPressed: () => context.goNamed(RouteNames.token, extra: {
                'examId': exam['id'],
                'examTitle': title,
                'examDuration': duration,
              }),
              style: ElevatedButton.styleFrom(
                backgroundColor: theme.colorScheme.primary,
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(vertical: 16),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              ),
              child: const Text('LANJUTKAN', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
            ),
          ],
        ),
      ),
    );
  }
}

class _InfoRow extends StatelessWidget {
  final IconData icon;
  final String label;
  final String value;
  const _InfoRow({required this.icon, required this.label, required this.value});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Row(
      crossAxisAlignment: CrossAxisAlignment.center,
      children: [
        Icon(icon, size: 20, color: theme.colorScheme.onSurfaceVariant),
        const SizedBox(width: 12),
        Text(label, style: TextStyle(fontSize: 13, color: theme.colorScheme.onSurfaceVariant)),
        const Spacer(),
        Flexible(
          child: Text(
            value,
            textAlign: TextAlign.end,
            style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: theme.colorScheme.onSurface),
          ),
        ),
      ],
    );
  }
}
