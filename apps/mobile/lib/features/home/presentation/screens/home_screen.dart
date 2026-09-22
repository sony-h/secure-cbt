import 'dart:math';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:secure_cbt_mobile/app/route_names.dart';
import 'package:secure_cbt_mobile/core/theme/theme.dart';
import 'package:secure_cbt_mobile/core/widgets/app_card.dart';
import 'package:secure_cbt_mobile/core/widgets/bouncing_button.dart';
import 'package:secure_cbt_mobile/core/widgets/shimmer.dart';
import 'package:secure_cbt_mobile/core/widgets/status_pill.dart';
import 'package:secure_cbt_mobile/features/auth/providers/auth_provider.dart';
import 'package:secure_cbt_mobile/features/home/providers/home_provider.dart';

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
  'Pekerjaan hebat dilakukan bukan dengan kekuatan, tapi ketekunan.',
  'Pengetahuan adalah kekuatan. — Francis Bacon',
  'Persiapan yang baik adalah setengah dari kemenangan.',
  'Skor bukan segalanya, yang terpenting adalah integritas dan proses belajar.',
  'Setiap soal yang kamu kerjakan adalah langkah menuju impianmu.',
];

class HomeScreen extends ConsumerStatefulWidget {
  const HomeScreen({super.key});

  @override
  ConsumerState<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends ConsumerState<HomeScreen> {
  String _greeting = '';
  String _quote = '';

  @override
  void initState() {
    super.initState();
    final hour = DateTime.now().hour;
    if (hour < 11) {
      _greeting = 'Selamat Pagi';
    } else if (hour < 15) {
      _greeting = 'Selamat Siang';
    } else if (hour < 18) {
      _greeting = 'Selamat Sore';
    } else {
      _greeting = 'Selamat Malam';
    }

    _quote = _quotes[Random().nextInt(_quotes.length)];
  }

  @override
  Widget build(BuildContext context) {
    final auth = ref.watch(authProvider);
    final homeDataAsync = ref.watch(homeDataProvider);

    final isLoading = homeDataAsync.isLoading;
    final history = homeDataAsync.valueOrNull?['history'] ?? [];
    final allExams = homeDataAsync.valueOrNull?['upcomingExams'] ?? [];
    final scores = history.map((h) => (h['total_score'] as num?)?.toDouble() ?? 0.0).toList();
    final totalExams = history.length;
    final averageScore = scores.isEmpty ? 0.0 : scores.reduce((a, b) => a + b) / scores.length;

    final ongoingExams = allExams
        .where((e) => e['status'] == 'ONGOING')
        .map((e) => e as Map<String, dynamic>)
        .toList();

    final upcomingExams = allExams
        .where((e) {
          final startAt = DateTime.tryParse(e['start_at'] ?? '');
          return e['status'] == 'PUBLISHED' && startAt != null && startAt.isAfter(DateTime.now());
        })
        .take(2)
        .map((e) => e as Map<String, dynamic>)
        .toList();

    return Scaffold(
      backgroundColor: AppColors.canvas,
      appBar: AppBar(
        title: const Text('Beranda'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh_rounded, size: 22),
            onPressed: () => ref.invalidate(homeDataProvider),
            tooltip: 'Perbarui Data',
          ),
          const SizedBox(width: 8),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: () async {
          ref.invalidate(homeDataProvider);
        },
        color: AppColors.primary,
        child: SingleChildScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.fromLTRB(20, 12, 20, 100),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // Student Identity Banner
              Container(
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(
                  gradient: const LinearGradient(
                    colors: [AppColors.primary, AppColors.primaryDark],
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  ),
                  borderRadius: BorderRadius.circular(20),
                  boxShadow: AppShadows.primaryButton,
                ),
                child: Row(
                  children: [
                    Container(
                      width: 56,
                      height: 56,
                      decoration: BoxDecoration(
                        color: Colors.white,
                        shape: BoxShape.circle,
                        boxShadow: [
                          BoxShadow(
                            color: Colors.black.withValues(alpha: 0.1),
                            blurRadius: 8,
                            offset: const Offset(0, 2),
                          ),
                        ],
                      ),
                      child: Center(
                        child: Text(
                          (auth.fullName?.isNotEmpty == true ? auth.fullName![0] : '?').toUpperCase(),
                          style: const TextStyle(
                            color: AppColors.primary,
                            fontWeight: FontWeight.w800,
                            fontSize: 24,
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(width: 16),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            '$_greeting,',
                            style: TextStyle(
                              color: Colors.white.withValues(alpha: 0.85),
                              fontSize: 13,
                              fontWeight: FontWeight.w500,
                            ),
                          ),
                          Text(
                            auth.fullName ?? 'Siswa',
                            style: const TextStyle(
                              color: Colors.white,
                              fontWeight: FontWeight.w700,
                              fontSize: 18,
                              letterSpacing: -0.3,
                            ),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                          const SizedBox(height: 6),
                          Row(
                            children: [
                              _IdentityPill(label: 'NIS: ${auth.nis ?? '—'}'),
                              const SizedBox(width: 6),
                              _IdentityPill(label: auth.className ?? 'Kelas —'),
                            ],
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 18),

              // Active Exam Alert Card (If an exam is ongoing right now)
              if (ongoingExams.isNotEmpty) ...[
                _OngoingExamBanner(exam: ongoingExams.first),
                const SizedBox(height: 18),
              ],

              // 3 Readiness Metrics
              if (isLoading)
                const Row(
                  children: [
                    Expanded(child: ShimmerBox(height: 84, borderRadius: 16)),
                    SizedBox(width: 12),
                    Expanded(child: ShimmerBox(height: 84, borderRadius: 16)),
                    SizedBox(width: 12),
                    Expanded(child: ShimmerBox(height: 84, borderRadius: 16)),
                  ],
                )
              else
                Row(
                  children: [
                    Expanded(
                      child: _MetricCard(
                        label: 'Total Selesai',
                        value: '$totalExams',
                        icon: Icons.assignment_turned_in_rounded,
                        accentColor: AppColors.primary,
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: _MetricCard(
                        label: 'Rata-Rata',
                        value: averageScore.toStringAsFixed(1),
                        icon: Icons.analytics_rounded,
                        accentColor: AppColors.success,
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: _MetricCard(
                        label: 'Tersedia',
                        value: '${allExams.length}',
                        icon: Icons.event_available_rounded,
                        accentColor: AppColors.warning,
                      ),
                    ),
                  ],
                ),

              const SizedBox(height: 18),

              // Motivational Quote Card
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                decoration: BoxDecoration(
                  color: AppColors.surface,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: AppColors.border),
                  boxShadow: AppShadows.card,
                ),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Container(
                      padding: const EdgeInsets.all(8),
                      decoration: BoxDecoration(
                        color: AppColors.primaryContainer,
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: const Icon(
                        Icons.format_quote_rounded,
                        color: AppColors.primary,
                        size: 20,
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Text(
                        '"$_quote"',
                        style: const TextStyle(
                          fontSize: 13,
                          height: 1.45,
                          fontStyle: FontStyle.italic,
                          color: AppColors.textSecondary,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 24),

              // Section: Upcoming Exams
              if (upcomingExams.isNotEmpty) ...[
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text(
                      'Ujian Akan Datang',
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w700,
                        letterSpacing: -0.3,
                        color: AppColors.textPrimary,
                      ),
                    ),
                    TextButton(
                      onPressed: () => context.goNamed(RouteNames.exams),
                      style: TextButton.styleFrom(
                        visualDensity: VisualDensity.compact,
                        padding: EdgeInsets.zero,
                      ),
                      child: const Row(
                        children: [
                          Text('Lihat Semua', style: TextStyle(color: AppColors.primary, fontWeight: FontWeight.w600, fontSize: 13)),
                          SizedBox(width: 2),
                          Icon(Icons.chevron_right_rounded, size: 18, color: AppColors.primary),
                        ],
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 10),
                ...upcomingExams.map((exam) => Padding(
                  padding: const EdgeInsets.only(bottom: 12),
                  child: AppCard(
                    onTap: () => context.goNamed(RouteNames.examDetail, extra: exam),
                    padding: const EdgeInsets.all(16),
                    child: Row(
                      children: [
                        Container(
                          width: 44,
                          height: 44,
                          decoration: BoxDecoration(
                            color: AppColors.primaryContainer,
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: const Icon(Icons.school_rounded, color: AppColors.primary, size: 22),
                        ),
                        const SizedBox(width: 14),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                exam['title'] ?? '',
                                style: const TextStyle(
                                  fontWeight: FontWeight.w700,
                                  fontSize: 14,
                                  color: AppColors.textPrimary,
                                  letterSpacing: -0.2,
                                ),
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                              ),
                              const SizedBox(height: 4),
                              Text(
                                exam['subject']?['name'] ?? 'Mata Pelajaran',
                                style: const TextStyle(
                                  fontSize: 12,
                                  color: AppColors.textMuted,
                                  fontWeight: FontWeight.w500,
                                ),
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(width: 8),
                        StatusPill.fromExamStatus(exam['status'] ?? 'PUBLISHED'),
                      ],
                    ),
                  ),
                )),
                const SizedBox(height: 12),
              ],

              // Daily Study Tip
              Container(
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: AppColors.warningContainer.withValues(alpha: 0.6),
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(color: AppColors.warning.withValues(alpha: 0.2)),
                ),
                child: const Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Icon(Icons.tips_and_updates_rounded, color: AppColors.warning, size: 20),
                    SizedBox(width: 10),
                    Expanded(
                      child: Text(
                        'Tips Integritas: Pastikan baterai HP Anda terisi di atas 50% dan jangan membuka aplikasi lain agar tidak memicu peringatan otomatis selama ujian.',
                        style: TextStyle(
                          fontSize: 12,
                          height: 1.45,
                          fontWeight: FontWeight.w500,
                          color: AppColors.onWarningContainer,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _IdentityPill extends StatelessWidget {
  final String label;
  const _IdentityPill({required this.label});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.18),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Text(
        label,
        style: const TextStyle(
          color: Colors.white,
          fontSize: 11,
          fontWeight: FontWeight.w600,
        ),
      ),
    );
  }
}

class _MetricCard extends StatelessWidget {
  final String label;
  final String value;
  final IconData icon;
  final Color accentColor;

  const _MetricCard({
    required this.label,
    required this.value,
    required this.icon,
    required this.accentColor,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 14),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.border),
        boxShadow: AppShadows.card,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            padding: const EdgeInsets.all(6),
            decoration: BoxDecoration(
              color: accentColor.withValues(alpha: 0.12),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Icon(icon, size: 18, color: accentColor),
          ),
          const SizedBox(height: 10),
          Text(
            value,
            style: const TextStyle(
              fontSize: 20,
              fontWeight: FontWeight.w800,
              letterSpacing: -0.5,
              color: AppColors.textPrimary,
              fontFeatures: [FontFeature.tabularFigures()],
            ),
          ),
          const SizedBox(height: 2),
          Text(
            label,
            style: const TextStyle(
              fontSize: 11,
              fontWeight: FontWeight.w500,
              color: AppColors.textMuted,
            ),
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
          ),
        ],
      ),
    );
  }
}

class _OngoingExamBanner extends StatelessWidget {
  final Map<String, dynamic> exam;
  const _OngoingExamBanner({required this.exam});

  @override
  Widget build(BuildContext context) {
    return BouncingButton(
      onTap: () => context.goNamed(RouteNames.examDetail, extra: exam),
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: AppColors.successContainer,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: AppColors.success.withValues(alpha: 0.3)),
          boxShadow: [
            BoxShadow(
              color: AppColors.success.withValues(alpha: 0.1),
              blurRadius: 10,
              offset: const Offset(0, 4),
            ),
          ],
        ),
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(10),
              decoration: const BoxDecoration(
                color: AppColors.success,
                shape: BoxShape.circle,
              ),
              child: const Icon(Icons.play_arrow_rounded, color: Colors.white, size: 22),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'UJIAN SEDANG AKTIF',
                    style: TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.w800,
                      letterSpacing: 0.5,
                      color: AppColors.onSuccessContainer,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    exam['title'] ?? 'Ujian',
                    style: const TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w700,
                      color: AppColors.textPrimary,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ],
              ),
            ),
            const Icon(Icons.arrow_forward_ios_rounded, size: 14, color: AppColors.onSuccessContainer),
          ],
        ),
      ),
    );
  }
}
