import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:secure_cbt_mobile/core/network/dio_client.dart';
import 'package:secure_cbt_mobile/features/auth/providers/auth_provider.dart';

class ExamSelectScreen extends ConsumerStatefulWidget {
  const ExamSelectScreen({super.key});

  @override
  ConsumerState<ExamSelectScreen> createState() => _ExamSelectScreenState();
}

class _ExamSelectScreenState extends ConsumerState<ExamSelectScreen> {
  bool _isLoading = true;
  List<Map<String, dynamic>> _exams = [];

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _fetchExams();
    });
  }

  Future<void> _fetchExams() async {
    try {
      final dio = ref.read(dioProvider);
      final response = await dio.get('/exams/student');
      final data = response.data;
      if (data['success'] == true && data['data'] != null) {
        setState(() => _exams = List<Map<String, dynamic>>.from(data['data']));
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Gagal memuat daftar ujian')),
        );
      }
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  String _formatDuration(int minutes) {
    if (minutes >= 60) {
      final h = minutes ~/ 60;
      final m = minutes % 60;
      return m > 0 ? '$h jam $m menit' : '$h jam';
    }
    return '$minutes menit';
  }

  String _formatDate(String iso) {
    try {
      final dt = DateTime.parse(iso);
      final months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
      return '${dt.day} ${months[dt.month - 1]} ${dt.year}';
    } catch (_) {
      return iso;
    }
  }

  @override
  Widget build(BuildContext context) {
    final auth = ref.watch(authProvider);
    final theme = Theme.of(context);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Ujian'),
        actions: [
          IconButton(
            icon: const Icon(Icons.logout),
            onPressed: () async {
              await ref.read(authProvider.notifier).logout();
              if (context.mounted) context.goNamed('login');
            },
          ),
        ],
      ),
      body: SafeArea(
        child: Column(
          children: [
            // ── Student Identity Card ────────────────────────────
            Container(
              width: double.infinity,
              margin: const EdgeInsets.all(16),
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: theme.colorScheme.primaryContainer.withValues(alpha: 0.3),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: theme.colorScheme.primaryContainer),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      CircleAvatar(
                        backgroundColor: theme.colorScheme.primary,
                        child: Text(
                          (auth.fullName ?? '?')[0].toUpperCase(),
                          style: TextStyle(color: theme.colorScheme.onPrimary, fontWeight: FontWeight.bold),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              auth.fullName ?? '—',
                              style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold),
                            ),
                            if (auth.nis != null)
                              Text('NIS: ${auth.nis}', style: theme.textTheme.bodySmall),
                            if (auth.className != null)
                              Text('Kelas: ${auth.className}', style: theme.textTheme.bodySmall),
                          ],
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),

            // ── Section Header ──────────────────────────────────
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: Row(
                children: [
                  Text('Ujian Tersedia', style: theme.textTheme.titleSmall?.copyWith(color: theme.colorScheme.primary)),
                  const SizedBox(width: 8),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                    decoration: BoxDecoration(
                      color: theme.colorScheme.primary,
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: Text('${_exams.length}', style: TextStyle(color: theme.colorScheme.onPrimary, fontSize: 12, fontWeight: FontWeight.bold)),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 8),

            // ── Exam List ────────────────────────────────────────
            Expanded(
              child: _isLoading
                  ? const Center(child: CircularProgressIndicator())
                  : _exams.isEmpty
                      ? Center(
                          child: Padding(
                            padding: const EdgeInsets.all(32),
                            child: Column(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                Icon(Icons.assignment_outlined, size: 64, color: Colors.grey.shade400),
                                const SizedBox(height: 16),
                                Text('Tidak ada ujian tersedia', style: theme.textTheme.bodyLarge),
                                const SizedBox(height: 8),
                                Text(
                                  'Ujian akan muncul di sini jika sudah dipublikasikan oleh guru.',
                                  textAlign: TextAlign.center,
                                  style: theme.textTheme.bodySmall?.copyWith(color: Colors.grey),
                                ),
                              ],
                            ),
                          ),
                        )
                      : RefreshIndicator(
                          onRefresh: _fetchExams,
                          child: ListView.builder(
                            padding: const EdgeInsets.fromLTRB(16, 12, 16, 16),
                            itemCount: _exams.length,
                            itemBuilder: (context, index) {
                              final exam = _exams[index];
                              return Card(
                                margin: const EdgeInsets.only(bottom: 12),
                                child: InkWell(
                                  onTap: () {
                                    context.goNamed('token', extra: {
                                      'examId': exam['id'],
                                      'examTitle': exam['title'],
                                      'examDuration': exam['duration_minutes'],
                                    });
                                  },
                                  borderRadius: BorderRadius.circular(12),
                                  child: Padding(
                                    padding: const EdgeInsets.all(16),
                                    child: Row(
                                      children: [
                                        Container(
                                          width: 48,
                                          height: 48,
                                          decoration: BoxDecoration(
                                            color: theme.colorScheme.primaryContainer,
                                            borderRadius: BorderRadius.circular(10),
                                          ),
                                          child: Icon(Icons.quiz_outlined, color: theme.colorScheme.primary),
                                        ),
                                        const SizedBox(width: 14),
                                        Expanded(
                                          child: Column(
                                            crossAxisAlignment: CrossAxisAlignment.start,
                                            children: [
                                              Text(
                                                exam['title'] ?? 'Tanpa Judul',
                                                style: theme.textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w600),
                                                maxLines: 2,
                                                overflow: TextOverflow.ellipsis,
                                              ),
                                              const SizedBox(height: 4),
                                              Text(
                                                exam['subject']?['name'] ?? '',
                                                style: theme.textTheme.bodySmall?.copyWith(color: theme.colorScheme.primary),
                                              ),
                                              const SizedBox(height: 6),
                                              Row(
                                                children: [
                                                  Icon(Icons.timer_outlined, size: 14, color: Colors.grey.shade600),
                                                  const SizedBox(width: 4),
                                                  Text(
                                                    _formatDuration(exam['duration_minutes'] ?? 0),
                                                    style: theme.textTheme.bodySmall?.copyWith(color: Colors.grey.shade600),
                                                  ),
                                                  const SizedBox(width: 16),
                                                  Icon(Icons.calendar_today_outlined, size: 14, color: Colors.grey.shade600),
                                                  const SizedBox(width: 4),
                                                  Text(
                                                    '${_formatDate(exam['start_at'] ?? '')} — ${_formatDate(exam['end_at'] ?? '')}',
                                                    style: theme.textTheme.bodySmall?.copyWith(color: Colors.grey.shade600),
                                                  ),
                                                ],
                                              ),
                                            ],
                                          ),
                                        ),
                                        Icon(Icons.chevron_right, color: Colors.grey.shade400),
                                      ],
                                    ),
                                  ),
                                ),
                              );
                            },
                          ),
                        ),
            ),
          ],
        ),
      ),
    );
  }
}
