import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:secure_cbt_mobile/app/route_names.dart';
import 'package:secure_cbt_mobile/core/theme/subject_theme.dart';
import 'package:secure_cbt_mobile/core/theme/theme.dart';
import 'package:secure_cbt_mobile/core/utils/date_utils.dart';
import 'package:secure_cbt_mobile/core/widgets/bouncing_button.dart';
import 'package:secure_cbt_mobile/core/widgets/empty_state.dart';
import 'package:secure_cbt_mobile/core/widgets/status_pill.dart';
import 'package:secure_cbt_mobile/features/exams/providers/exams_provider.dart';

class ExamsScreen extends ConsumerStatefulWidget {
  const ExamsScreen({super.key});

  @override
  ConsumerState<ExamsScreen> createState() => _ExamsScreenState();
}

class _ExamsScreenState extends ConsumerState<ExamsScreen> {
  String _selectedSubjectId = '';

  @override
  Widget build(BuildContext context) {
    final examsAsync = ref.watch(examsDataProvider);

    final isLoading = examsAsync.isLoading;
    final exams = examsAsync.valueOrNull?['exams']?.cast<Map<String, dynamic>>() ?? [];
    final subjects = examsAsync.valueOrNull?['subjects']?.cast<Map<String, dynamic>>() ?? [];

    final filteredExams = _selectedSubjectId.isEmpty
        ? exams
        : exams.where((e) => e['subject']?['id'] == _selectedSubjectId).toList();

    List<Map<String, dynamic>> section(String status) =>
        filteredExams.where((e) {
          if (e['status'] != status) return false;
          if (status == 'PUBLISHED') {
            final s = DateTime.tryParse(e['start_at'] ?? '');
            if (s != null && s.isAfter(DateTime.now())) return false;
          }
          return true;
        }).toList();

    List<Map<String, dynamic>> upcoming() =>
        filteredExams.where((e) {
          final s = DateTime.tryParse(e['start_at'] ?? '');
          return s != null && s.isAfter(DateTime.now()) && e['status'] == 'PUBLISHED';
        }).toList();

    final ongoing = section('ONGOING');
    final available = section('PUBLISHED');
    final upcomingExams = upcoming();

    return Scaffold(
      backgroundColor: AppColors.canvas,
      appBar: AppBar(
        title: const Text('Katalog Ujian'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh_rounded, size: 22),
            onPressed: () => ref.invalidate(examsDataProvider),
            tooltip: 'Segarkan',
          ),
          const SizedBox(width: 8),
        ],
      ),
      body: isLoading
          ? const Center(child: CircularProgressIndicator(color: AppColors.primary))
          : RefreshIndicator(
              onRefresh: () async { ref.invalidate(examsDataProvider); },
              color: AppColors.primary,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Filter Chips Carousel
                  Container(
                    height: 56,
                    padding: const EdgeInsets.symmetric(vertical: 8),
                    child: ListView(
                      scrollDirection: Axis.horizontal,
                      padding: const EdgeInsets.symmetric(horizontal: 20),
                      children: [
                        _buildFilterPill('Semua Mapel', '', null),
                        ...subjects.map((s) {
                          final name = s['name'] as String? ?? '';
                          final code = s['code'] as String? ?? '';
                          final sTheme = SubjectTheme.fromSubject(name: name, code: code);
                          return _buildFilterPill(name, s['id'] ?? '', sTheme);
                        }),
                      ],
                    ),
                  ),

                  const Divider(height: 1, color: AppColors.border),

                  Expanded(
                    child: filteredExams.isEmpty
                        ? const Padding(
                            padding: EdgeInsets.all(32),
                            child: EmptyState(
                              icon: Icons.assignment_outlined,
                              title: 'Tidak Ada Ujian',
                              subtitle: 'Belum ada jadwal ujian untuk mata pelajaran yang dipilih.',
                            ),
                          )
                        : ListView(
                            padding: const EdgeInsets.fromLTRB(20, 16, 20, 100),
                            children: [
                              if (ongoing.isNotEmpty) ...[
                                const _SectionHeader(
                                  title: 'Sedang Berlangsung',
                                  icon: Icons.bolt_rounded,
                                  count: 1,
                                  accentColor: AppColors.success,
                                ),
                                ...ongoing.map((e) => _SubjectExamCard(
                                  exam: e,
                                  isOngoing: true,
                                  onTap: () => _openDetail(context, e),
                                )),
                                const SizedBox(height: 16),
                              ],
                              if (available.isNotEmpty) ...[
                                _SectionHeader(
                                  title: 'Tersedia Dikerjakan',
                                  icon: Icons.play_circle_fill_rounded,
                                  count: available.length,
                                  accentColor: AppColors.primary,
                                ),
                                ...available.map((e) => _SubjectExamCard(
                                  exam: e,
                                  isOngoing: false,
                                  onTap: () => _openDetail(context, e),
                                )),
                                const SizedBox(height: 16),
                              ],
                              if (upcomingExams.isNotEmpty) ...[
                                _SectionHeader(
                                  title: 'Jadwal Akan Datang',
                                  icon: Icons.calendar_month_rounded,
                                  count: upcomingExams.length,
                                  accentColor: AppColors.warning,
                                ),
                                ...upcomingExams.map((e) => _SubjectExamCard(
                                  exam: e,
                                  isOngoing: false,
                                  onTap: () => _openDetail(context, e),
                                )),
                              ],
                            ],
                          ),
                  ),
                ],
              ),
            ),
    );
  }

  Widget _buildFilterPill(String label, String id, SubjectThemeData? sTheme) {
    final isSelected = _selectedSubjectId == id;
    final primaryColor = sTheme?.primary ?? AppColors.primary;

    return Padding(
      padding: const EdgeInsets.only(right: 8),
      child: BouncingButton(
        onTap: () => setState(() => _selectedSubjectId = id),
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 200),
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 7),
          decoration: BoxDecoration(
            gradient: isSelected
                ? LinearGradient(
                    colors: [
                      sTheme?.gradientStart ?? AppColors.primary,
                      sTheme?.gradientEnd ?? AppColors.primaryDark,
                    ],
                  )
                : null,
            color: isSelected ? null : AppColors.surface,
            borderRadius: BorderRadius.circular(20),
            border: Border.all(
              color: isSelected ? Colors.transparent : AppColors.border,
              width: 1,
            ),
            boxShadow: isSelected
                ? [
                    BoxShadow(
                      color: primaryColor.withValues(alpha: 0.3),
                      blurRadius: 8,
                      offset: const Offset(0, 3),
                    ),
                  ]
                : AppShadows.card,
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              if (sTheme != null) ...[
                Icon(
                  sTheme.icon,
                  size: 14,
                  color: isSelected ? Colors.white : primaryColor,
                ),
                const SizedBox(width: 6),
              ],
              Text(
                label,
                style: TextStyle(
                  fontSize: 12,
                  fontWeight: isSelected ? FontWeight.w800 : FontWeight.w600,
                  color: isSelected ? Colors.white : AppColors.textSecondary,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  void _openDetail(BuildContext context, Map<String, dynamic> exam) {
    context.goNamed(RouteNames.examDetail, extra: exam);
  }
}

class _SectionHeader extends StatelessWidget {
  final String title;
  final IconData icon;
  final int count;
  final Color accentColor;

  const _SectionHeader({
    required this.title,
    required this.icon,
    required this.count,
    required this.accentColor,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(5),
            decoration: BoxDecoration(
              color: accentColor.withValues(alpha: 0.12),
              borderRadius: BorderRadius.circular(6),
            ),
            child: Icon(icon, size: 14, color: accentColor),
          ),
          const SizedBox(width: 8),
          Text(
            title,
            style: const TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.w800,
              letterSpacing: -0.2,
              color: AppColors.textPrimary,
            ),
          ),
          const SizedBox(width: 8),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
            decoration: BoxDecoration(
              color: accentColor.withValues(alpha: 0.12),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Text(
              '$count',
              style: TextStyle(
                fontSize: 11,
                fontWeight: FontWeight.w800,
                color: accentColor,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _SubjectExamCard extends StatelessWidget {
  final Map<String, dynamic> exam;
  final bool isOngoing;
  final VoidCallback onTap;

  const _SubjectExamCard({
    required this.exam,
    required this.isOngoing,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final title = exam['title'] ?? 'Ujian';
    final subject = exam['subject']?['name'] ?? 'Mata Pelajaran';
    final duration = exam['duration_minutes'] ?? 0;
    final count = exam['_count']?['exam_questions'] ?? 0;
    final packageCount = exam['package_count'] ?? 1;
    final questionDisplay = packageCount > 1 ? (count / packageCount).round() : count;

    final sTheme = SubjectTheme.fromSubject(
      name: exam['subject']?['name'],
      code: exam['subject']?['code'],
    );

    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: BouncingButton(
        onTap: onTap,
        child: Container(
          decoration: BoxDecoration(
            color: AppColors.surface,
            borderRadius: BorderRadius.circular(18),
            border: Border.all(
              color: isOngoing ? AppColors.success.withValues(alpha: 0.5) : AppColors.border,
              width: isOngoing ? 1.5 : 1.0,
            ),
            boxShadow: isOngoing
                ? [
                    BoxShadow(
                      color: AppColors.success.withValues(alpha: 0.12),
                      blurRadius: 10,
                      offset: const Offset(0, 4),
                    ),
                  ]
                : AppShadows.card,
          ),
          clipBehavior: Clip.antiAlias,
          child: IntrinsicHeight(
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                // Left Color Stripe
                Container(
                  width: 6,
                  decoration: BoxDecoration(
                    gradient: LinearGradient(
                      colors: [sTheme.gradientStart, sTheme.gradientEnd],
                      begin: Alignment.topCenter,
                      end: Alignment.bottomCenter,
                    ),
                  ),
                ),
                Expanded(
                  child: Padding(
                    padding: const EdgeInsets.all(16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Container(
                              padding: const EdgeInsets.all(8),
                              decoration: BoxDecoration(
                                color: sTheme.backgroundWash,
                                borderRadius: BorderRadius.circular(10),
                              ),
                              child: Icon(sTheme.icon, size: 20, color: sTheme.primary),
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    title,
                                    style: const TextStyle(
                                      fontSize: 15,
                                      fontWeight: FontWeight.w700,
                                      letterSpacing: -0.3,
                                      color: AppColors.textPrimary,
                                    ),
                                    maxLines: 2,
                                    overflow: TextOverflow.ellipsis,
                                  ),
                                  const SizedBox(height: 3),
                                  Text(
                                    subject,
                                    style: TextStyle(
                                      fontSize: 12,
                                      fontWeight: FontWeight.w600,
                                      color: sTheme.primary,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                            const SizedBox(width: 8),
                            StatusPill.fromExamStatus(exam['status'] ?? 'PUBLISHED'),
                          ],
                        ),
                        const SizedBox(height: 12),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                          decoration: BoxDecoration(
                            color: AppColors.surfaceSubtle,
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: Row(
                            children: [
                              const Icon(Icons.timer_outlined, size: 14, color: AppColors.textSecondary),
                              const SizedBox(width: 4),
                              Text(
                                formatDuration(duration),
                                style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: AppColors.textSecondary),
                              ),
                              const SizedBox(width: 12),
                              const Icon(Icons.format_list_numbered_rounded, size: 14, color: AppColors.textSecondary),
                              const SizedBox(width: 4),
                              Text(
                                '$questionDisplay Soal',
                                style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: AppColors.textSecondary),
                              ),
                              const Spacer(),
                              const Icon(Icons.arrow_forward_ios_rounded, size: 12, color: AppColors.textMuted),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
