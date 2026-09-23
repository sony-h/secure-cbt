import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:secure_cbt_mobile/app/route_names.dart';
import 'package:secure_cbt_mobile/core/theme/subject_theme.dart';
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
    final subjectCode = subject?['code'] as String?;
    final duration = exam['duration_minutes'] as int? ?? 0;
    final startAt = exam['start_at'] as String? ?? '';
    final endAt = exam['end_at'] as String? ?? '';
    final description = exam['description'] as String? ?? '';
    final count = exam['_count'] as Map<String, dynamic>?;
    final questionCount = count?['exam_questions'] as int? ?? 0;
    final packageCount = exam['package_count'] as int? ?? 1;
    final questionDisplay = packageCount > 1 ? (questionCount / packageCount).round() : questionCount;

    final sTheme = SubjectTheme.fromSubject(name: subjectName, code: subjectCode);

    final startLabel = (() {
      try { return formatDateTimeWIB(DateTime.parse(startAt)); } catch (_) { return '-'; }
    })();
    final endLabel = (() {
      try { return formatDateTimeWIB(DateTime.parse(endAt)); } catch (_) { return '-'; }
    })();

    return Scaffold(
      backgroundColor: AppColors.canvas,
      appBar: AppBar(
        title: const Text('Rincian Ujian'),
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
            // Top Subject Hero Card
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 26),
              decoration: BoxDecoration(
                color: AppColors.surface,
                borderRadius: BorderRadius.circular(22),
                border: Border.all(color: AppColors.border),
                boxShadow: AppShadows.cardElevated,
              ),
              child: Column(
                children: [
                  Container(
                    width: 64,
                    height: 64,
                    decoration: BoxDecoration(
                      gradient: LinearGradient(
                        colors: [sTheme.gradientStart, sTheme.gradientEnd],
                        begin: Alignment.topLeft,
                        end: Alignment.bottomRight,
                      ),
                      borderRadius: BorderRadius.circular(20),
                      boxShadow: [
                        BoxShadow(
                          color: sTheme.primary.withValues(alpha: 0.35),
                          blurRadius: 12,
                          offset: const Offset(0, 4),
                        ),
                      ],
                    ),
                    child: Icon(sTheme.icon, color: Colors.white, size: 32),
                  ),
                  const SizedBox(height: 16),
                  Text(
                    title,
                    textAlign: TextAlign.center,
                    style: const TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.w800,
                      letterSpacing: -0.4,
                      color: AppColors.textPrimary,
                    ),
                    maxLines: 3,
                    overflow: TextOverflow.ellipsis,
                  ),
                  const SizedBox(height: 8),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 5),
                    decoration: BoxDecoration(
                      color: sTheme.backgroundWash,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: sTheme.border),
                    ),
                    child: Text(
                      subjectName,
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w700,
                        color: sTheme.primary,
                      ),
                    ),
                  ),
                ],
              ),
            ),

            const SizedBox(height: 18),

            // Metadata Specifications Card
            Container(
              padding: const EdgeInsets.all(18),
              decoration: BoxDecoration(
                color: AppColors.surface,
                borderRadius: BorderRadius.circular(18),
                border: Border.all(color: AppColors.border),
                boxShadow: AppShadows.card,
              ),
              child: Column(
                children: [
                  _SpecRow(
                    icon: Icons.timer_outlined,
                    label: 'Alokasi Waktu',
                    value: formatDetailDuration(duration),
                    iconColor: sTheme.primary,
                    iconBg: sTheme.backgroundWash,
                  ),
                  const Padding(
                    padding: EdgeInsets.symmetric(vertical: 12),
                    child: Divider(height: 1, color: AppColors.border),
                  ),
                  _SpecRow(
                    icon: Icons.format_list_numbered_rounded,
                    label: 'Total Soal',
                    value: '$questionDisplay Soal',
                    iconColor: sTheme.primary,
                    iconBg: sTheme.backgroundWash,
                  ),
                  const Padding(
                    padding: EdgeInsets.symmetric(vertical: 12),
                    child: Divider(height: 1, color: AppColors.border),
                  ),
                  _SpecRow(
                    icon: Icons.calendar_today_rounded,
                    label: 'Jadwal Mulai',
                    value: startLabel,
                    iconColor: AppColors.primary,
                    iconBg: AppColors.primaryContainer,
                  ),
                  const Padding(
                    padding: EdgeInsets.symmetric(vertical: 12),
                    child: Divider(height: 1, color: AppColors.border),
                  ),
                  _SpecRow(
                    icon: Icons.event_busy_rounded,
                    label: 'Batas Selesai',
                    value: endLabel,
                    iconColor: AppColors.error,
                    iconBg: AppColors.errorContainer,
                  ),
                ],
              ),
            ),

            if (description.isNotEmpty) ...[
              const SizedBox(height: 18),
              AppCard.section(
                title: 'Petunjuk & Keterangan',
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

            // Continue CTA Button with Subject Themed Gradient
            BouncingButton(
              onTap: () => context.goNamed(RouteNames.token, extra: {
                'examId': exam['id'],
                'examTitle': title,
                'examDuration': duration,
              }),
              child: Container(
                height: 52,
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    colors: [sTheme.gradientStart, sTheme.gradientEnd],
                    begin: Alignment.topCenter,
                    end: Alignment.bottomCenter,
                  ),
                  borderRadius: BorderRadius.circular(14),
                  boxShadow: [
                    BoxShadow(
                      color: sTheme.primary.withValues(alpha: 0.35),
                      blurRadius: 14,
                      offset: const Offset(0, 5),
                    ),
                  ],
                ),
                child: const Center(
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Text(
                        'Lanjutkan ke Masukkan Token',
                        style: TextStyle(
                          color: Colors.white,
                          fontSize: 15,
                          fontWeight: FontWeight.w700,
                          letterSpacing: 0.2,
                        ),
                      ),
                      SizedBox(width: 8),
                      Icon(Icons.arrow_forward_rounded, size: 18, color: Colors.white),
                    ],
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
  final Color iconColor;
  final Color iconBg;

  const _SpecRow({
    required this.icon,
    required this.label,
    required this.value,
    required this.iconColor,
    required this.iconBg,
  });

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Container(
          padding: const EdgeInsets.all(8),
          decoration: BoxDecoration(
            color: iconBg,
            borderRadius: BorderRadius.circular(10),
          ),
          child: Icon(icon, size: 18, color: iconColor),
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
