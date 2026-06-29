import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:secure_cbt_mobile/app/route_names.dart';
import 'package:secure_cbt_mobile/core/utils/date_utils.dart';
import 'package:secure_cbt_mobile/core/widgets/app_icon_box.dart';
import 'package:secure_cbt_mobile/core/widgets/empty_state.dart';
import 'package:secure_cbt_mobile/features/exams/providers/exams_provider.dart';
import 'package:secure_cbt_mobile/features/shared/providers/refresh_trigger.dart';

class ExamsScreen extends ConsumerStatefulWidget {
  const ExamsScreen({super.key});

  @override
  ConsumerState<ExamsScreen> createState() => _ExamsScreenState();
}

class _ExamsScreenState extends ConsumerState<ExamsScreen> {
  String _selectedSubjectId = '';

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final examsAsync = ref.watch(examsDataProvider);

    ref.listen(refreshTriggerProvider, (prev, next) {
      if (prev != next) ref.invalidate(examsDataProvider);
    });

    final isLoading = examsAsync.isLoading;
    final exams = (examsAsync.valueOrNull?['exams'] as List?)?.cast<Map<String, dynamic>>() ?? [];
    final subjects = (examsAsync.valueOrNull?['subjects'] as List?)?.cast<Map<String, dynamic>>() ?? [];

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
      backgroundColor: theme.scaffoldBackgroundColor,
      appBar: AppBar(title: const Text('Ujian', style: TextStyle(fontWeight: FontWeight.bold))),
      body: isLoading
          ? const Center(child: CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: () async { ref.invalidate(examsDataProvider); },
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  SizedBox(
                    height: 48,
                    child: ListView(
                      scrollDirection: Axis.horizontal,
                      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                      children: [
                        _buildFilterChip('Semua', '', theme),
                        ...subjects.map((s) => _buildFilterChip(s['name'], s['id'], theme)),
                      ],
                    ),
                  ),
                  const Divider(height: 1, color: Color(0xFFF1F5F9)),
                  Expanded(
                    child: exams.isEmpty
                        ? const Padding(
                            padding: EdgeInsets.all(32),
                            child: EmptyState(
                              icon: Icons.assignment_outlined,
                              title: 'Tidak ada ujian tersedia',
                              subtitle: 'Ujian yang diterbitkan guru akan muncul di sini.',
                            ),
                          )
                        : ListView(
                            padding: const EdgeInsets.fromLTRB(16, 12, 16, 24),
                            children: [
                              if (ongoing.isNotEmpty) ...[
                                _SectionHeader(title: 'Aktif', count: ongoing.length, color: Colors.green.shade600),
                                ...ongoing.map((e) => _ExamCard(
                                  exam: e, theme: theme, isOngoing: true,
                                  onTap: () => _startOrResume(context, e),
                                )),
                                const SizedBox(height: 12),
                              ],
                              if (available.isNotEmpty) ...[
                                _SectionHeader(title: 'Tersedia', count: available.length, color: theme.colorScheme.primary),
                                ...available.map((e) => _ExamCard(
                                  exam: e, theme: theme, isOngoing: false,
                                  onTap: () => _startOrResume(context, e),
                                )),
                                const SizedBox(height: 12),
                              ],
                              if (upcomingExams.isNotEmpty) ...[
                                _SectionHeader(title: 'Akan Datang', count: upcomingExams.length, color: Colors.orange.shade600),
                                ...upcomingExams.map((e) => _ExamCard(
                                  exam: e, theme: theme, isOngoing: false, isUpcoming: true, onTap: () {},
                                )),
                              ],
                              if (ongoing.isEmpty && available.isEmpty && upcomingExams.isEmpty && filteredExams.isNotEmpty)
                                const Padding(padding: EdgeInsets.all(40), child: Center(child: Text('Tidak ada ujian dengan filter ini', style: TextStyle(color: Color(0xFF64748B))))),
                            ],
                          ),
                  ),
                ],
              ),
            ),
    );
  }

  Widget _buildFilterChip(String label, String id, ThemeData theme) {
    final selected = _selectedSubjectId == id;
    return Padding(
      padding: const EdgeInsets.only(right: 8),
      child: FilterChip(
        label: Text(label, style: TextStyle(fontSize: 13, fontWeight: selected ? FontWeight.bold : FontWeight.w500, color: selected ? Colors.white : const Color(0xFF475569))),
        selected: selected,
        onSelected: (_) => setState(() => _selectedSubjectId = id),
        selectedColor: theme.colorScheme.primary,
        backgroundColor: const Color(0xFFF1F5F9),
        checkmarkColor: Colors.white,
        side: BorderSide.none,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
        visualDensity: VisualDensity.compact,
      ),
    );
  }

  void _startOrResume(BuildContext context, Map<String, dynamic> exam) {
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
      padding: const EdgeInsets.only(bottom: 10),
      child: Row(
        children: [
          Container(width: 4, height: 16, decoration: BoxDecoration(color: color, borderRadius: BorderRadius.circular(2))),
          const SizedBox(width: 8),
          Text(title, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15, color: Color(0xFF0F172A))),
          const SizedBox(width: 6),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
            decoration: BoxDecoration(color: color.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(10)),
            child: Text('$count', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: color)),
          ),
        ],
      ),
    );
  }
}

class _ExamCard extends StatelessWidget {
  final Map<String, dynamic> exam;
  final ThemeData theme;
  final bool isOngoing;
  final bool isUpcoming;
  final VoidCallback onTap;

  const _ExamCard({
    required this.exam,
    required this.theme,
    required this.isOngoing,
    this.isUpcoming = false,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final Color accentColor = isOngoing
        ? Colors.green
        : isUpcoming ? Colors.orange : theme.colorScheme.primary;
    final Color accentLight = isOngoing
        ? Colors.green.shade50
        : isUpcoming ? Colors.orange.shade50 : theme.colorScheme.primary.withValues(alpha: 0.08);
    final Color borderColor = isOngoing ? Colors.green.shade200 : const Color(0xFFE2E8F0);
    final Color titleColor = isUpcoming ? const Color(0xFF94A3B8) : const Color(0xFF0F172A);
    final IconData cardIcon = isUpcoming ? Icons.calendar_month_outlined : Icons.description_outlined;

    return Card(
      margin: const EdgeInsets.only(bottom: 10),
      clipBehavior: Clip.antiAlias,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14), side: BorderSide(color: borderColor)),
      child: InkWell(
        onTap: onTap,
        child: IntrinsicHeight(
          child: Row(
            children: [
              Container(width: 5, color: accentColor),
              Expanded(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(14, 14, 14, 14),
                  child: Row(
                    children: [
                      AppIconBox(icon: cardIcon, color: accentColor, backgroundColor: accentLight),
                      const SizedBox(width: 14),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Text(exam['title'] ?? '', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: titleColor), maxLines: 2, overflow: TextOverflow.ellipsis),
                            const SizedBox(height: 4),
                            Text(exam['subject']?['name'] ?? '', style: TextStyle(fontSize: 12, color: accentColor, fontWeight: FontWeight.w600)),
                            const SizedBox(height: 6),
                            Row(
                              children: [
                                Icon(Icons.timer_outlined, size: 13, color: isUpcoming ? Colors.orange.shade300 : Colors.grey.shade500),
                                const SizedBox(width: 4),
                                Text(formatDuration(exam['duration_minutes'] ?? 0), style: TextStyle(fontSize: 12, color: isUpcoming ? Colors.orange.shade300 : Colors.grey.shade600)),
                                if (isUpcoming) ...[
                                  const SizedBox(width: 14),
                                  Icon(Icons.calendar_today_outlined, size: 13, color: Colors.orange.shade300),
                                  const SizedBox(width: 4),
                                  Text(formatDateShortWIB(DateTime.parse(exam['start_at'] ?? '')), style: TextStyle(fontSize: 12, color: Colors.orange.shade300)),
                                ],
                              ],
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(width: 8),
                      if (isOngoing)
                        ElevatedButton(
                          onPressed: onTap,
                          style: ElevatedButton.styleFrom(
                            backgroundColor: Colors.green.shade600,
                            foregroundColor: Colors.white,
                            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                            minimumSize: Size.zero,
                          ),
                          child: const Text('Lanjutkan', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold)),
                        )
                      else if (isUpcoming)
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                          decoration: BoxDecoration(color: Colors.orange.shade50, borderRadius: BorderRadius.circular(6)),
                          child: Text(formatDateShortWIB(DateTime.parse(exam['start_at'] ?? '')), style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Colors.orange.shade700)),
                        )
                      else
                        Icon(Icons.chevron_right_rounded, color: Colors.grey.shade400),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
