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

    final startParsed = DateTime.tryParse(startAt);
    final startDateStr = startParsed != null ? formatDateShortWIB(startParsed) : '—';
    final startTimeStr = startParsed != null ? formatTimeWIB(startParsed) : '—';

    final endParsed = DateTime.tryParse(endAt);
    final endDateStr = endParsed != null ? formatDateShortWIB(endParsed) : '—';
    final endTimeStr = endParsed != null ? formatTimeWIB(endParsed) : '—';

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

            const SizedBox(height: 16),

            // Bento Grid 2x2: Vertically Aligned & Centered
            Row(
              children: [
                Expanded(
                  child: _BentoSpecCell(
                    icon: Icons.timer_outlined,
                    iconColor: sTheme.primary,
                    iconBg: sTheme.backgroundWash,
                    label: 'Alokasi Waktu',
                    value: formatDetailDuration(duration),
                    subValue: '$duration Menit',
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: _BentoSpecCell(
                    icon: Icons.format_list_numbered_rounded,
                    iconColor: sTheme.primary,
                    iconBg: sTheme.backgroundWash,
                    label: 'Total Soal',
                    value: '$questionDisplay Soal',
                    subValue: packageCount > 1 ? 'Paket Acak' : 'Semua Soal',
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(
                  child: _BentoSpecCell(
                    icon: Icons.calendar_today_rounded,
                    iconColor: AppColors.primary,
                    iconBg: AppColors.primaryContainer,
                    label: 'Jadwal Mulai',
                    value: startDateStr,
                    subValue: startTimeStr,
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: _BentoSpecCell(
                    icon: Icons.event_busy_rounded,
                    iconColor: AppColors.error,
                    iconBg: AppColors.errorContainer,
                    label: 'Batas Selesai',
                    value: endDateStr,
                    subValue: endTimeStr,
                  ),
                ),
              ],
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

class _BentoSpecCell extends StatelessWidget {
  final IconData icon;
  final Color iconColor;
  final Color iconBg;
  final String label;
  final String value;
  final String? subValue;

  const _BentoSpecCell({
    required this.icon,
    required this.iconColor,
    required this.iconBg,
    required this.label,
    required this.value,
    this.subValue,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 16),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: AppColors.border),
        boxShadow: AppShadows.card,
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        mainAxisAlignment: MainAxisAlignment.center,
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          Container(
            padding: const EdgeInsets.all(9),
            decoration: BoxDecoration(
              color: iconBg,
              shape: BoxShape.circle,
            ),
            child: Icon(icon, size: 20, color: iconColor),
          ),
          const SizedBox(height: 10),
          Text(
            label.toUpperCase(),
            textAlign: TextAlign.center,
            style: const TextStyle(
              fontSize: 10.5,
              fontWeight: FontWeight.w700,
              letterSpacing: 0.6,
              color: AppColors.textMuted,
            ),
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
          ),
          const SizedBox(height: 4),
          Text(
            value,
            textAlign: TextAlign.center,
            style: const TextStyle(
              fontSize: 15,
              fontWeight: FontWeight.w800,
              letterSpacing: -0.3,
              color: AppColors.textPrimary,
            ),
            maxLines: 2,
            overflow: TextOverflow.ellipsis,
          ),
          if (subValue != null && subValue!.isNotEmpty) ...[
            const SizedBox(height: 6),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2.5),
              decoration: BoxDecoration(
                color: iconBg,
                borderRadius: BorderRadius.circular(8),
              ),
              child: Text(
                subValue!,
                textAlign: TextAlign.center,
                style: TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.w700,
                  color: iconColor,
                ),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
            ),
          ],
        ],
      ),
    );
  }
}
