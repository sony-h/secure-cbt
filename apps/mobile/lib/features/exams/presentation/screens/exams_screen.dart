import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:secure_cbt_mobile/app/route_names.dart';
import 'package:secure_cbt_mobile/core/theme/theme.dart';
import 'package:secure_cbt_mobile/core/utils/date_utils.dart';
import 'package:secure_cbt_mobile/core/widgets/app_card.dart';
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
        title: const Text('Daftar Ujian'),
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
                    height: 52,
                    padding: const EdgeInsets.symmetric(vertical: 8),
                    child: ListView(
                      scrollDirection: Axis.horizontal,
                      padding: const EdgeInsets.symmetric(horizontal: 20),
                      children: [
                        _buildFilterPill('Semua Mapel', ''),
                        ...subjects.map((s) => _buildFilterPill(s['name'] ?? '', s['id'] ?? '')),
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
                              subtitle: 'Belum ada ujian yang ditugaskan untuk kelas Anda saat ini.',
                            ),
                          )
                        : ListView(
                            padding: const EdgeInsets.fromLTRB(20, 16, 20, 100),
                            children: [
                              if (ongoing.isNotEmpty) ...[
                                _SectionHeader(title: 'Sedang Berlangsung', count: ongoing.length, color: AppColors.success),
                                ...ongoing.map((e) => _ExamCard(
                                  exam: e,
                                  isOngoing: true,
                                  onTap: () => _openDetail(context, e),
                                )),
                                const SizedBox(height: 16),
                              ],
                              if (available.isNotEmpty) ...[
                                _SectionHeader(title: 'Tersedia Dikerjakan', count: available.length, color: AppColors.primary),
                                ...available.map((e) => _ExamCard(
                                  exam: e,
                                  isOngoing: false,
                                  onTap: () => _openDetail(context, e),
                                )),
                                const SizedBox(height: 16),
                              ],
                              if (upcomingExams.isNotEmpty) ...[
                                _SectionHeader(title: 'Akan Datang', count: upcomingExams.length, color: AppColors.textMuted),
                                ...upcomingExams.map((e) => _ExamCard(
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

  Widget _buildFilterPill(String label, String id) {
    final isSelected = _selectedSubjectId == id;
    return Padding(
      padding: const EdgeInsets.only(right: 8),
      child: BouncingButton(
        onTap: () => setState(() => _selectedSubjectId = id),
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 200),
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
          decoration: BoxDecoration(
            color: isSelected ? AppColors.primary : AppColors.surface,
            borderRadius: BorderRadius.circular(20),
            border: Border.all(
              color: isSelected ? AppColors.primary : AppColors.border,
              width: 1,
            ),
            boxShadow: isSelected ? AppShadows.primaryButton : AppShadows.card,
          ),
          child: Text(
            label,
            style: TextStyle(
              fontSize: 12,
              fontWeight: isSelected ? FontWeight.w700 : FontWeight.w500,
              color: isSelected ? Colors.white : AppColors.textSecondary,
            ),
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
  final int count;
  final Color color;

  const _SectionHeader({required this.title, required this.count, required this.color});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Row(
        children: [
          Container(
            width: 4,
            height: 16,
            decoration: BoxDecoration(color: color, borderRadius: BorderRadius.circular(2)),
          ),
          const SizedBox(width: 8),
          Text(
            title,
            style: const TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.w700,
              letterSpacing: -0.2,
              color: AppColors.textPrimary,
            ),
          ),
          const SizedBox(width: 8),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
            decoration: BoxDecoration(
              color: color.withValues(alpha: 0.12),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Text(
              '$count',
              style: TextStyle(
                fontSize: 11,
                fontWeight: FontWeight.w700,
                color: color,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _ExamCard extends StatelessWidget {
  final Map<String, dynamic> exam;
  final bool isOngoing;
  final VoidCallback onTap;

  const _ExamCard({
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

    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: AppCard(
        onTap: onTap,
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
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
                      const SizedBox(height: 4),
                      Text(
                        subject,
                        style: const TextStyle(
                          fontSize: 13,
                          fontWeight: FontWeight.w500,
                          color: AppColors.primary,
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: 8),
                StatusPill.fromExamStatus(exam['status'] ?? 'PUBLISHED'),
              ],
            ),
            const SizedBox(height: 14),
            const Divider(height: 1, color: AppColors.border),
            const SizedBox(height: 12),
            Row(
              children: [
                _InfoBadge(icon: Icons.timer_outlined, label: formatDuration(duration)),
                const SizedBox(width: 14),
                _InfoBadge(icon: Icons.format_list_numbered_rounded, label: '$questionDisplay Soal'),
                const Spacer(),
                const Icon(Icons.arrow_forward_ios_rounded, size: 13, color: AppColors.textMuted),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _InfoBadge extends StatelessWidget {
  final IconData icon;
  final String label;
  const _InfoBadge({required this.icon, required this.label});

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(icon, size: 14, color: AppColors.textSecondary),
        const SizedBox(width: 5),
        Text(
          label,
          style: const TextStyle(
            fontSize: 12,
            fontWeight: FontWeight.w500,
            color: AppColors.textSecondary,
          ),
        ),
      ],
    );
  }
}
