import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:secure_cbt_mobile/core/network/dio_client.dart';
import 'package:secure_cbt_mobile/features/auth/providers/auth_provider.dart';

class ExamsScreen extends ConsumerStatefulWidget {
  const ExamsScreen({super.key});

  @override
  ConsumerState<ExamsScreen> createState() => _ExamsScreenState();
}

class _ExamsScreenState extends ConsumerState<ExamsScreen> {
  bool _isLoading = true;
  List<Map<String, dynamic>> _exams = [];
  List<Map<String, dynamic>> _subjects = [];
  String _selectedSubjectId = '';

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _loadData());
  }

  Future<void> _loadData() async {
    try {
      final dio = ref.read(dioProvider);
      final examsRes = await dio.get('/exams/student');
      final subjectsRes = await dio.get('/academic/subjects');
      setState(() {
        _exams = List<Map<String, dynamic>>.from(examsRes.data['data'] ?? []);
        _subjects = List<Map<String, dynamic>>.from(subjectsRes.data['data'] ?? []);
        _isLoading = false;
      });
    } catch (_) {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  List<Map<String, dynamic>> get _filteredExams {
    if (_selectedSubjectId.isEmpty) return _exams;
    return _exams.where((e) => e['subject']?['id'] == _selectedSubjectId).toList();
  }

  List<Map<String, dynamic>> _section(String status) =>
      _filteredExams.where((e) {
        if (e['status'] != status) return false;
        if (status == 'PUBLISHED') {
          final s = DateTime.tryParse(e['start_at'] ?? '');
          if (s != null && s.isAfter(DateTime.now())) return false;
        }
        return true;
      }).toList();

  List<Map<String, dynamic>> _upcoming() =>
      _filteredExams.where((e) {
        final s = DateTime.tryParse(e['start_at'] ?? '');
        return s != null && s.isAfter(DateTime.now()) && e['status'] == 'PUBLISHED';
      }).toList();

  String _formatDuration(int minutes) {
    if (minutes >= 60) {
      final h = minutes ~/ 60;
      final m = minutes % 60;
      return m > 0 ? '$h jam $m mnt' : '$h jam';
    }
    return '$minutes mnt';
  }

  DateTime _toWIB(DateTime utc) => utc.add(const Duration(hours: 7));

  String _formatDate(String iso) {
    try {
      final dt = _toWIB(DateTime.parse(iso));
      final months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
      return '${dt.day} ${months[dt.month - 1]} ${dt.year}';
    } catch (_) {
      return iso;
    }
  }

  @override
  Widget build(BuildContext context) {
    ref.listen(authProvider, (prev, next) {
      if (prev != null && !prev.isAuthenticated && next.isAuthenticated) {
        WidgetsBinding.instance.addPostFrameCallback((_) => _loadData());
      }
    });

    final theme = Theme.of(context);

    final ongoing = _section('ONGOING');
    final available = _section('PUBLISHED');
    final upcoming = _upcoming();

    return Scaffold(
      backgroundColor: theme.scaffoldBackgroundColor,
      appBar: AppBar(title: const Text('Ujian', style: TextStyle(fontWeight: FontWeight.bold))),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: _loadData,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Subject Filter Chips (dynamic from API)
                  SizedBox(
                    height: 48,
                    child: ListView(
                      scrollDirection: Axis.horizontal,
                      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                      children: [
                        _buildFilterChip('Semua', '', theme),
                        ..._subjects.map((s) => _buildFilterChip(s['name'], s['id'], theme)),
                      ],
                    ),
                  ),
                  const Divider(height: 1, color: Color(0xFFF1F5F9)),
                  // Exam List
                  Expanded(
                    child: _exams.isEmpty
                        ? Center(
                            child: Padding(
                              padding: const EdgeInsets.all(32),
                              child: Column(
                                mainAxisAlignment: MainAxisAlignment.center,
                                children: [
                                  Icon(Icons.assignment_outlined, size: 64, color: Colors.grey.shade400),
                                  const SizedBox(height: 16),
                                  const Text('Tidak ada ujian tersedia', style: TextStyle(fontWeight: FontWeight.bold)),
                                  const SizedBox(height: 8),
                                  Text('Ujian yang diterbitkan guru akan muncul di sini.', textAlign: TextAlign.center, style: TextStyle(color: Colors.grey.shade500, fontSize: 13)),
                                ],
                              ),
                            ),
                          )
                        : ListView(
                            padding: const EdgeInsets.fromLTRB(16, 12, 16, 24),
                            children: [
                              if (ongoing.isNotEmpty) ...[
                                _SectionHeader(title: 'Aktif', count: ongoing.length, color: Colors.green.shade600),
                                ...ongoing.map((e) => _ExamCard(
                                  exam: e, theme: theme, isOngoing: true, duration: _formatDuration, date: _formatDate,
                                  onTap: () => _startOrResume(context, e),
                                )),
                                const SizedBox(height: 12),
                              ],
                              if (available.isNotEmpty) ...[
                                _SectionHeader(title: 'Tersedia', count: available.length, color: theme.colorScheme.primary),
                                ...available.map((e) => _ExamCard(
                                  exam: e, theme: theme, isOngoing: false, duration: _formatDuration, date: _formatDate,
                                  onTap: () => _startOrResume(context, e),
                                )),
                                const SizedBox(height: 12),
                              ],
                              if (upcoming.isNotEmpty) ...[
                                _SectionHeader(title: 'Akan Datang', count: upcoming.length, color: Colors.orange.shade600),
                                ...upcoming.map((e) => _ExamCard(
                                  exam: e, theme: theme, isOngoing: false, duration: _formatDuration, date: _formatDate,
                                  isUpcoming: true, onTap: () {},
                                )),
                              ],
                              if (ongoing.isEmpty && available.isEmpty && upcoming.isEmpty && _filteredExams.isNotEmpty)
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
    context.goNamed('exam-detail', extra: exam);
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
  final String Function(int) duration;
  final String Function(String) date;
  final VoidCallback onTap;

  const _ExamCard({
    required this.exam,
    required this.theme,
    required this.isOngoing,
    this.isUpcoming = false,
    required this.duration,
    required this.date,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final Color accentColor = isOngoing
        ? Colors.green
        : isUpcoming
            ? Colors.orange
            : theme.colorScheme.primary;
    final Color accentLight = isOngoing
        ? Colors.green.shade50
        : isUpcoming
            ? Colors.orange.shade50
            : theme.colorScheme.primary.withValues(alpha: 0.08);
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
              // Left accent bar
              Container(width: 5, color: accentColor),
              // Main content
              Expanded(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(14, 14, 14, 14),
                  child: Row(
                    children: [
                      // Icon
                      Container(
                        width: 44, height: 44,
                        decoration: BoxDecoration(color: accentLight, borderRadius: BorderRadius.circular(12)),
                        child: Icon(cardIcon, color: accentColor, size: 22),
                      ),
                      const SizedBox(width: 14),
                      // Text content
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
                                Text(duration(exam['duration_minutes'] ?? 0), style: TextStyle(fontSize: 12, color: isUpcoming ? Colors.orange.shade300 : Colors.grey.shade600)),
                                if (isUpcoming) ...[
                                  const SizedBox(width: 14),
                                  Icon(Icons.calendar_today_outlined, size: 13, color: Colors.orange.shade300),
                                  const SizedBox(width: 4),
                                  Text(date(exam['start_at'] ?? ''), style: TextStyle(fontSize: 12, color: Colors.orange.shade300)),
                                ],
                              ],
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(width: 8),
                      // Right side action
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
                          child: Text(date(exam['start_at'] ?? ''), style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Colors.orange.shade700)),
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