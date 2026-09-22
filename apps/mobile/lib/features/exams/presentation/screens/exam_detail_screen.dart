import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:secure_cbt_mobile/app/route_names.dart';
import 'package:secure_cbt_mobile/core/theme/theme.dart';
import 'package:secure_cbt_mobile/core/utils/date_utils.dart';
import 'package:secure_cbt_mobile/core/widgets/app_card.dart';
import 'package:secure_cbt_mobile/core/widgets/bouncing_button.dart';

class ExamDetailScreen extends StatelessWidget {
  final Map<String, dynamic> exam;

  const ExamDetailScreen({super.key, required this.exam});

  @override
  Widget build(BuildContext context) {
    final title = exam['title'] as String? ?? 'Ujian';
    final subject = exam['subject'] as Map<String, dynamic>?;
    final subjectName = subject?['name'] as String? ?? 'Mata Pelajaran';
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
      backgroundColor: AppColors.canvas,
      appBar: AppBar(
        title: const Text('Detail Ujian'),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new_rounded, size: 18),
          onPressed: () => context.goNamed(RouteNames.exams),
        ),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.fromLTRB(20, 16, 20, 32),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Top Hero Card
            AppCard(
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 24),
              child: Column(
                children: [
                  Container(
                    width: 60,
                    height: 60,
                    decoration: BoxDecoration(
                      color: AppColors.primaryContainer,
                      borderRadius: BorderRadius.circular(18),
                    ),
                    child: const Icon(Icons.assignment_rounded, color: AppColors.primary, size: 30),
                  ),
                  const SizedBox(height: 14),
                  Text(
                    title,
                    textAlign: TextAlign.center,
                    style: const TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.w700,
                      letterSpacing: -0.4,
                      color: AppColors.textPrimary,
                    ),
                    maxLines: 3,
                    overflow: TextOverflow.ellipsis,
                  ),
                  const SizedBox(height: 8),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                    decoration: BoxDecoration(
                      color: AppColors.primaryContainer,
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Text(
                      subjectName,
                      style: const TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w700,
                        color: AppColors.primary,
                      ),
                    ),
                  ),
                ],
              ),
            ),

            const SizedBox(height: 16),

            // Metadata Specifications Card
            AppCard(
              padding: const EdgeInsets.all(18),
              child: Column(
                children: [
                  _SpecRow(
                    icon: Icons.timer_outlined,
                    label: 'Durasi Waktu',
                    value: formatDetailDuration(duration),
                  ),
                  const Padding(
                    padding: EdgeInsets.symmetric(vertical: 12),
                    child: Divider(height: 1, color: AppColors.border),
                  ),
                  _SpecRow(
                    icon: Icons.format_list_numbered_rounded,
                    label: 'Jumlah Soal',
                    value: '$questionDisplay Soal',
                  ),
                  const Padding(
                    padding: EdgeInsets.symmetric(vertical: 12),
                    child: Divider(height: 1, color: AppColors.border),
                  ),
                  _SpecRow(
                    icon: Icons.calendar_today_rounded,
                    label: 'Jadwal Mulai',
                    value: startLabel,
                  ),
                  const Padding(
                    padding: EdgeInsets.symmetric(vertical: 12),
                    child: Divider(height: 1, color: AppColors.border),
                  ),
                  _SpecRow(
                    icon: Icons.event_busy_rounded,
                    label: 'Jadwal Selesai',
                    value: endLabel,
                  ),
                ],
              ),
            ),

            if (description.isNotEmpty) ...[
              const SizedBox(height: 16),
              AppCard.section(
                title: 'Keterangan Ujian',
                children: [
                  Text(
                    description,
                    style: const TextStyle(
                      fontSize: 13,
                      height: 1.5,
                      color: AppColors.textSecondary,
                    ),
                  ),
                ],
              ),
            ],

            const SizedBox(height: 28),

            // Action Button
            BouncingButton(
              onTap: () => context.goNamed(RouteNames.token, extra: {
                'examId': exam['id'],
                'examTitle': title,
                'examDuration': duration,
              }),
              child: Container(
                height: 52,
                decoration: BoxDecoration(
                  gradient: const LinearGradient(
                    colors: [AppColors.primary, AppColors.primaryDark],
                    begin: Alignment.topCenter,
                    end: Alignment.bottomCenter,
                  ),
                  borderRadius: BorderRadius.circular(14),
                  boxShadow: AppShadows.primaryButton,
                ),
                child: const Center(
                  child: Text(
                    'Lanjutkan ke Masukkan Token',
                    style: TextStyle(
                      color: Colors.white,
                      fontSize: 15,
                      fontWeight: FontWeight.w700,
                      letterSpacing: 0.2,
                    ),
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _SpecRow extends StatelessWidget {
  final IconData icon;
  final String label;
  final String value;

  const _SpecRow({
    required this.icon,
    required this.label,
    required this.value,
  });

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Container(
          padding: const EdgeInsets.all(8),
          decoration: BoxDecoration(
            color: AppColors.surfaceSubtle,
            borderRadius: BorderRadius.circular(10),
          ),
          child: Icon(icon, size: 18, color: AppColors.primary),
        ),
        const SizedBox(width: 12),
        Text(
          label,
          style: const TextStyle(
            fontSize: 13,
            color: AppColors.textSecondary,
            fontWeight: FontWeight.w500,
          ),
        ),
        const Spacer(),
        Flexible(
          child: Text(
            value,
            textAlign: TextAlign.end,
            style: const TextStyle(
              fontSize: 13,
              fontWeight: FontWeight.w700,
              color: AppColors.textPrimary,
            ),
          ),
        ),
      ],
    );
  }
}
