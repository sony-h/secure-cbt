import 'dart:math';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:secure_cbt_mobile/core/network/dio_client.dart';
import 'package:secure_cbt_mobile/features/auth/providers/auth_provider.dart';

const _quotes = [
  'Belajar adalah investasi paling menguntungkan.',
  'Kegagalan adalah guru terbaik, jangan pernah menyerah.',
  'Sukses dimulai dari satu langkah kecil hari ini.',
  'The secret of getting ahead is getting started. — Mark Twain',
  'Pendidikan adalah senjata paling ampuh. — Nelson Mandela',
  'Jangan pernah berhenti belajar, karena hidup tak pernah berhenti mengajar.',
  'Ilmu tanpa amal bagaikan pohon tanpa buah.',
  'Sesungguhnya sesudah kesulitan itu ada kemudahan. — QS Al-Insyirah: 6',
  'Pendidikan adalah paspor untuk masa depan. — Malcolm X',
  'Belajarlah dari kesalahan orang lain. — Eleanor Roosevelt',
  'Pekerjaan hebat tidak dilakukan dengan kekuatan, tapi dengan ketekunan. — Samuel Johnson',
  'Pengetahuan adalah kekuatan. — Francis Bacon',
  'Persiapan yang baik adalah setengah dari kemenangan.',
  'Score bukan segalanya, yang terpenting adalah proses belajar.',
  'Setiap soal yang kau jawab adalah langkah menuju impianmu.',
];

class HomeScreen extends ConsumerStatefulWidget {
  const HomeScreen({super.key});

  @override
  ConsumerState<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends ConsumerState<HomeScreen> {
  String _greeting = '';
  String _quote = '';
  int _totalExams = 0;
  double _averageScore = 0.0;
  List<Map<String, dynamic>> _upcomingExams = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    final hour = DateTime.now().hour;
    if (hour < 12) _greeting = 'Selamat Pagi';
    else if (hour < 15) _greeting = 'Selamat Siang';
    else if (hour < 18) _greeting = 'Selamat Sore';
    else _greeting = 'Selamat Malam';

    _quote = _quotes[Random().nextInt(_quotes.length)];
    WidgetsBinding.instance.addPostFrameCallback((_) => _loadData());
  }

  Future<void> _loadData() async {
    try {
      final dio = ref.read(dioProvider);

      final historyRes = await dio.get('/sessions/history');
      final history = historyRes.data['data'] as List? ?? [];
      final examsRes = await dio.get('/exams/student');
      final exams = examsRes.data['data'] as List? ?? [];

      final scores = history.map((h) => (h['total_score'] as num).toDouble()).toList();

      setState(() {
        _totalExams = history.length;
        _averageScore = scores.isEmpty ? 0 : scores.reduce((a, b) => a + b) / scores.length;
        _upcomingExams = exams
            .where((e) {
              final startAt = DateTime.tryParse(e['start_at'] ?? '');
              return startAt != null && startAt.isAfter(DateTime.now());
            })
            .take(2)
            .map((e) => e as Map<String, dynamic>)
            .toList();
        _isLoading = false;
      });
    } catch (_) {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    ref.listen(authProvider, (prev, next) {
      if (prev != null && !prev.isAuthenticated && next.isAuthenticated) {
        WidgetsBinding.instance.addPostFrameCallback((_) => _loadData());
      }
    });

    final auth = ref.watch(authProvider);
    final theme = Theme.of(context);

    return Scaffold(
      backgroundColor: theme.scaffoldBackgroundColor,
      appBar: AppBar(title: const Text('Beranda', style: TextStyle(fontWeight: FontWeight.bold))),
      body: RefreshIndicator(
        onRefresh: _loadData,
        child: SingleChildScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.all(20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // Greeting Card
              Container(
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    colors: [theme.colorScheme.primary, theme.colorScheme.primary.withValues(alpha: 0.8)],
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  ),
                  borderRadius: BorderRadius.circular(16),
                  boxShadow: [BoxShadow(color: theme.colorScheme.primary.withValues(alpha: 0.15), blurRadius: 10, offset: const Offset(0, 4))],
                ),
                child: Row(
                  children: [
                    CircleAvatar(
                      radius: 28,
                      backgroundColor: Colors.white,
                      child: Text(
                        (auth.fullName ?? '?')[0].toUpperCase(),
                        style: TextStyle(color: theme.colorScheme.primary, fontWeight: FontWeight.bold, fontSize: 22),
                      ),
                    ),
                    const SizedBox(width: 16),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text('$_greeting, ${auth.fullName ?? 'Siswa'}!', style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 18)),
                          const SizedBox(height: 4),
                          Text('NIS: ${auth.nis ?? '—'}', style: TextStyle(color: Colors.white.withValues(alpha: 0.8), fontSize: 13)),
                          Text('Kelas: ${auth.className ?? '—'}', style: TextStyle(color: Colors.white.withValues(alpha: 0.8), fontSize: 13)),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 20),

              // Quote Card
              Card(
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12), side: const BorderSide(color: Color(0xFFE2E8F0))),
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Icon(Icons.format_quote, color: theme.colorScheme.primary.withValues(alpha: 0.3), size: 36),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text('"$_quote"', style: const TextStyle(fontSize: 13, height: 1.5, fontStyle: FontStyle.italic, color: Color(0xFF475569))),
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 20),

              // Stats Row
              if (!_isLoading)
                Row(
                  children: [
                    Expanded(child: _StatCard(label: 'Total Ujian', value: '$_totalExams', icon: Icons.assignment_rounded, color: theme.colorScheme.primary)),
                    const SizedBox(width: 12),
                    Expanded(child: _StatCard(label: 'Rata-rata Nilai', value: _averageScore.toStringAsFixed(1), icon: Icons.trending_up_rounded, color: Colors.green.shade600)),
                    const SizedBox(width: 12),
                    Expanded(child: _StatCard(label: 'Ujian Tersedia', value: '${_upcomingExams.length}', icon: Icons.calendar_month_rounded, color: Colors.orange.shade600)),
                  ],
                ),
              if (_isLoading)
                const Center(child: Padding(padding: EdgeInsets.all(20), child: CircularProgressIndicator())),
              const SizedBox(height: 24),

              // Upcoming Spoilers
              if (_upcomingExams.isNotEmpty) ...[
                Text('🔔 Ujian Mendatang', style: theme.textTheme.titleSmall?.copyWith(fontWeight: FontWeight.bold, color: const Color(0xFF334155))),
                const SizedBox(height: 10),
                ..._upcomingExams.map((exam) => Card(
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12), side: const BorderSide(color: Color(0xFFE2E8F0))),
                  margin: const EdgeInsets.only(bottom: 10),
                  child: Padding(
                    padding: const EdgeInsets.all(14),
                    child: Row(
                      children: [
                        Container(
                          width: 40, height: 40,
                          decoration: BoxDecoration(color: Colors.orange.shade50, borderRadius: BorderRadius.circular(10)),
                          child: Icon(Icons.calendar_month_outlined, color: Colors.orange, size: 20),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(exam['title'] ?? '', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: Color(0xFF94A3B8))),
                              const SizedBox(height: 2),
                              Text(exam['subject']?['name'] ?? '', style: TextStyle(fontSize: 12, color: Colors.orange.shade300)),
                            ],
                          ),
                        ),
                        Icon(Icons.lock_outline_rounded, color: Colors.orange.shade200, size: 18),
                      ],
                    ),
                  ),
                )),
              ],

              // Study Tip
              Container(
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: Colors.amber.shade50,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: Colors.amber.shade200),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.lightbulb_outline_rounded, color: Colors.amber, size: 20),
                    const SizedBox(width: 10),
                    const Expanded(child: Text('Tips: Belajar secara konsisten 30 menit setiap hari lebih efektif daripada belajar berjam-jam dalam sehari.', style: TextStyle(fontSize: 12, color: Color(0xFF92400E)))),
                  ],
                ),
              ),
              const SizedBox(height: 20),
            ],
          ),
        ),
      ),
    );
  }
}

class _StatCard extends StatelessWidget {
  final String label;
  final String value;
  final IconData icon;
  final Color color;

  const _StatCard({required this.label, required this.value, required this.icon, required this.color});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFFE2E8F0)),
      ),
      child: Column(
        children: [
          Icon(icon, color: color, size: 22),
          const SizedBox(height: 6),
          Text(value, style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18, color: color)),
          const SizedBox(height: 2),
          Text(label, style: const TextStyle(fontSize: 10, color: Color(0xFF64748B))),
        ],
      ),
    );
  }
}