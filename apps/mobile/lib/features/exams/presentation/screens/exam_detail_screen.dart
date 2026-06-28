import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

class ExamDetailScreen extends StatelessWidget {
  final Map<String, dynamic> exam;

  const ExamDetailScreen({super.key, required this.exam});

  String _formatDuration(int minutes) {
    if (minutes >= 60) {
      final h = minutes ~/ 60;
      final m = minutes % 60;
      return m > 0 ? '$h jam $m menit' : '$h jam';
    }
    return '$minutes menit';
  }

  DateTime _toWIB(DateTime utc) => utc.add(const Duration(hours: 7));

  String _formatDateTime(DateTime d) {
    final wib = _toWIB(d);
    final months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
    return '${wib.day} ${months[wib.month - 1]} ${wib.year}, ${wib.hour.toString().padLeft(2, '0')}:${wib.minute.toString().padLeft(2, '0')} WIB';
  }

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

    // Safe date formatters
    final startLabel = (() {
      try { return _formatDateTime(DateTime.parse(startAt)); } catch (_) { return '-'; }
    })();
    final endLabel = (() {
      try { return _formatDateTime(DateTime.parse(endAt)); } catch (_) { return '-'; }
    })();

    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        title: const Text('Detail Ujian', style: TextStyle(fontWeight: FontWeight.bold)),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new_rounded, size: 20),
          onPressed: () => context.goNamed('exams'),
        ),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Header card
            Card(
              elevation: 0,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16), side: const BorderSide(color: Color(0xFFE2E8F0))),
              child: Padding(
                padding: const EdgeInsets.all(24),
                child: Column(
                  children: [
                    Container(
                      width: 64, height: 64,
                      decoration: BoxDecoration(color: theme.colorScheme.primary.withValues(alpha: 0.08), borderRadius: BorderRadius.circular(16)),
                      child: Icon(Icons.assignment_rounded, size: 32, color: theme.colorScheme.primary),
                    ),
                    const SizedBox(height: 16),
                    Text(title, textAlign: TextAlign.center, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Color(0xFF0F172A)), maxLines: 3, overflow: TextOverflow.ellipsis),
                    const SizedBox(height: 6),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                      decoration: BoxDecoration(color: theme.colorScheme.primary.withValues(alpha: 0.08), borderRadius: BorderRadius.circular(12)),
                      child: Text(subjectName, style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: theme.colorScheme.primary)),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 16),

            // Info card
            Card(
              elevation: 0,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16), side: const BorderSide(color: Color(0xFFE2E8F0))),
              child: Padding(
                padding: const EdgeInsets.all(20),
                child: Column(
                  children: [
                    _InfoRow(icon: Icons.timer_outlined, label: 'Durasi', value: _formatDuration(duration)),
                    const Divider(height: 24),
                    _InfoRow(icon: Icons.help_outline_rounded, label: 'Jumlah Soal', value: '$questionCount soal'),
                    const Divider(height: 24),
                    // Date row - custom two-line layout
                    Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Icon(Icons.calendar_today_rounded, size: 20, color: Color(0xFF64748B)),
                        const SizedBox(width: 12),
                        const Text('Waktu Pelaksanaan', style: TextStyle(fontSize: 13, color: Color(0xFF64748B))),
                        const Spacer(),
                        Flexible(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.end,
                            children: [
                              Text(startLabel, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: Color(0xFF0F172A))),
                              const Text('sampai', style: TextStyle(fontSize: 11, color: Color(0xFF94A3B8))),
                              Text(endLabel, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: Color(0xFF0F172A))),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),

            // Description section
            if (description.isNotEmpty) ...[
              const SizedBox(height: 16),
              Card(
                elevation: 0,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16), side: const BorderSide(color: Color(0xFFE2E8F0))),
                child: Padding(
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
              ),
            ],

            const SizedBox(height: 32),

            // Continue button
            ElevatedButton(
              onPressed: () => context.goNamed('token', extra: {
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
  final bool multiline;

  const _InfoRow({required this.icon, required this.label, required this.value, this.multiline = false});

  @override
  Widget build(BuildContext context) {
    return Row(
      crossAxisAlignment: multiline ? CrossAxisAlignment.start : CrossAxisAlignment.center,
      children: [
        Icon(icon, size: 20, color: const Color(0xFF64748B)),
        const SizedBox(width: 12),
        Text(label, style: const TextStyle(fontSize: 13, color: Color(0xFF64748B))),
        const Spacer(),
        Flexible(
          child: Text(
            value,
            textAlign: TextAlign.end,
            style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: Color(0xFF0F172A)),
          ),
        ),
      ],
    );
  }
}
