import 'dart:math';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:secure_cbt_mobile/app/route_names.dart';
import 'package:secure_cbt_mobile/core/theme/subject_theme.dart';
import 'package:secure_cbt_mobile/core/theme/theme.dart';
import 'package:secure_cbt_mobile/core/widgets/app_card.dart';
import 'package:secure_cbt_mobile/core/widgets/bouncing_button.dart';
import 'package:secure_cbt_mobile/core/widgets/shimmer.dart';
import 'package:secure_cbt_mobile/core/widgets/status_pill.dart';
import 'package:secure_cbt_mobile/features/auth/providers/auth_provider.dart';
import 'package:secure_cbt_mobile/features/home/providers/home_provider.dart';
import 'package:secure_cbt_mobile/features/exams/providers/exams_provider.dart';

const _quotes = [
  'Belajar adalah investasi paling menguntungkan untuk masa depan.',
  'Kegagalan adalah guru terbaik, jangan pernah menyerah sebelum mencoba.',
  'Sukses dimulai dari satu langkah kecil dan konsisten hari ini.',
  'The secret of getting ahead is getting started. — Mark Twain',
  'Pendidikan adalah senjata paling ampuh untuk mengubah dunia. — Nelson Mandela',
  'Jangan pernah berhenti belajar, karena hidup tak pernah berhenti mengajar.',
  'Ilmu tanpa amal bagaikan pohon rindang tanpa buah.',
  'Sesungguhnya sesudah kesulitan itu ada kemudahan. — QS Al-Insyirah: 6',
  'Pendidikan adalah paspor untuk masa depan cemerlang. — Malcolm X',
  'Pekerjaan hebat diraih bukan dengan kekuatan, tapi dengan ketekunan.',
  'Pengetahuan adalah kekuatan sejati manusia. — Francis Bacon',
  'Persiapan yang matang adalah separuh dari kemenangan.',
  'Integritas dan kejujuran dalam ujian adalah cermin kemuliaan karaktermu.',
  'Setiap soal yang kamu kerjakan dengan sungguh-sungguh adalah jembatan impianmu.',
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
        .take(3)
        .map((e) => e as Map<String, dynamic>)
        .toList();

    return Scaffold(
      backgroundColor: AppColors.canvas,
      appBar: AppBar(
        title: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              padding: const EdgeInsets.all(6),
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  colors: [AppColors.primary, AppColors.primaryDark],
                ),
                borderRadius: BorderRadius.circular(8),
              ),
              child: const Icon(Icons.school_rounded, color: Colors.white, size: 18),
            ),
            const SizedBox(width: 8),
            const Text(
              'Secure CBT',
              style: TextStyle(
                fontWeight: FontWeight.w800,
                letterSpacing: -0.3,
                fontSize: 18,
              ),
            ),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh_rounded, size: 22),
            onPressed: () => ref.invalidate(homeDataProvider),
            tooltip: 'Segarkan',
          ),
          const SizedBox(width: 8),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: () async {
          ref.invalidate(homeDataProvider);
          ref.invalidate(examsDataProvider);
        },
        color: AppColors.primary,
        child: SingleChildScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.fromLTRB(20, 10, 20, 100),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // ── 1. Student Passport Identity Card ─────────────────
              _StudentPassportCard(
                greeting: _greeting,
                fullName: auth.fullName ?? 'Siswa',
                nis: auth.nis ?? '—',
                className: auth.className ?? 'Kelas —',
                totalExams: totalExams,
              ),

              const SizedBox(height: 18),

              // ── 2. Ongoing Exam Alert (If Any) ────────────────────
              if (ongoingExams.isNotEmpty) ...[
                ...ongoingExams.map((exam) => Padding(
                  padding: const EdgeInsets.only(bottom: 14),
                  child: _ActiveExamHeroBanner(exam: exam),
                )),
                const SizedBox(height: 6),
              ],

              // ── 3. Trio Gamified Metrics ──────────────────────────
              if (isLoading)
                const Row(
                  children: [
                    Expanded(child: ShimmerBox(height: 90, borderRadius: 18)),
                    SizedBox(width: 10),
                    Expanded(child: ShimmerBox(height: 90, borderRadius: 18)),
                    SizedBox(width: 10),
                    Expanded(child: ShimmerBox(height: 90, borderRadius: 18)),
                  ],
                )
              else
                Row(
                  children: [
                    Expanded(
                      child: _GamifiedStatCard(
                        title: 'Tuntas',
                        value: '$totalExams',
                        subtitle: 'Ujian',
                        icon: Icons.emoji_events_rounded,
                        primaryColor: const Color(0xFF7C3AED), // Royal Violet
                        backgroundColor: const Color(0xFFF5F3FF),
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: _GamifiedStatCard(
                        title: 'Rata-Rata',
                        value: averageScore.toStringAsFixed(1),
                        subtitle: averageScore >= 75 ? 'Di Atas KKM' : 'Perlu Belajar',
                        icon: Icons.trending_up_rounded,
                        primaryColor: const Color(0xFF059669), // Forest Emerald
                        backgroundColor: const Color(0xFFECFDF5),
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: _GamifiedStatCard(
                        title: 'Tersedia',
                        value: '${allExams.length}',
                        subtitle: 'Daftar Ujian',
                        icon: Icons.local_fire_department_rounded,
                        primaryColor: const Color(0xFFEA580C), // Sunset Amber
                        backgroundColor: const Color(0xFFFFF7ED),
                      ),
                    ),
                  ],
                ),

              const SizedBox(height: 20),

              // ── 4. Motivational Quote of the Day ──────────────────
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
                      padding: const EdgeInsets.all(7),
                      decoration: BoxDecoration(
                        color: const Color(0xFFF5F3FF),
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: const Icon(
                        Icons.auto_awesome_rounded,
                        color: Color(0xFF7C3AED),
                        size: 18,
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Text(
                        '"$_quote"',
                        style: const TextStyle(
                          fontSize: 12.5,
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

              // ── 5. Upcoming Exams Section ─────────────────────────
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text(
                    'Ujian Terjadwal',
                    style: TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.w800,
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
                        Text('Lihat Semua', style: TextStyle(color: AppColors.primary, fontWeight: FontWeight.w700, fontSize: 13)),
                        SizedBox(width: 2),
                        Icon(Icons.arrow_forward_rounded, size: 16, color: AppColors.primary),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 10),

              if (upcomingExams.isEmpty && !isLoading)
                AppCard(
                  padding: const EdgeInsets.symmetric(vertical: 24, horizontal: 16),
                  child: Center(
                    child: Column(
                      children: [
                        Container(
                          padding: const EdgeInsets.all(12),
                          decoration: const BoxDecoration(
                            color: AppColors.surfaceSubtle,
                            shape: BoxShape.circle,
                          ),
                          child: const Icon(Icons.done_all_rounded, color: AppColors.textMuted, size: 26),
                        ),
                        const SizedBox(height: 10),
                        const Text(
                          'Tidak ada ujian baru yang dijadwalkan',
                          style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: AppColors.textSecondary),
                        ),
                      ],
                    ),
                  ),
                )
              else
                ...upcomingExams.map((exam) {
                  final subjectName = exam['subject']?['name'] as String?;
                  final subjectCode = exam['subject']?['code'] as String?;
                  final sTheme = SubjectTheme.fromSubject(name: subjectName, code: subjectCode);

                  return Padding(
                    padding: const EdgeInsets.only(bottom: 12),
                    child: _SubjectThemedExamCard(
                      exam: exam,
                      theme: sTheme,
                      onTap: () => context.goNamed(RouteNames.examDetail, extra: exam),
                    ),
                  );
                }),
            ],
          ),
        ),
      ),
    );
  }
}

class _StudentPassportCard extends StatelessWidget {
  final String greeting;
  final String fullName;
  final String nis;
  final String className;
  final int totalExams;

  const _StudentPassportCard({
    required this.greeting,
    required this.fullName,
    required this.nis,
    required this.className,
    required this.totalExams,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [Color(0xFF4338CA), Color(0xFF4F46E5), Color(0xFF6366F1)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(22),
        boxShadow: [
          BoxShadow(
            color: const Color(0xFF4F46E5).withValues(alpha: 0.28),
            blurRadius: 18,
            offset: const Offset(0, 8),
          ),
        ],
      ),
      child: Stack(
        children: [
          // Background Decorative Rings Watermark
          Positioned(
            right: -25,
            top: -25,
            child: Container(
              width: 130,
              height: 130,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                border: Border.all(color: Colors.white.withValues(alpha: 0.08), width: 18),
              ),
            ),
          ),
          Positioned(
            right: 40,
            bottom: -35,
            child: Container(
              width: 100,
              height: 100,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                border: Border.all(color: Colors.white.withValues(alpha: 0.06), width: 14),
              ),
            ),
          ),

          Padding(
            padding: const EdgeInsets.all(20),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  crossAxisAlignment: CrossAxisAlignment.center,
                  children: [
                    // Avatar with double halo
                    Container(
                      width: 58,
                      height: 58,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        border: Border.all(color: Colors.white.withValues(alpha: 0.4), width: 2),
                        boxShadow: [
                          BoxShadow(
                            color: Colors.black.withValues(alpha: 0.15),
                            blurRadius: 8,
                            offset: const Offset(0, 3),
                          ),
                        ],
                      ),
                      child: Center(
                        child: Container(
                          width: 50,
                          height: 50,
                          decoration: const BoxDecoration(
                            color: Colors.white,
                            shape: BoxShape.circle,
                          ),
                          child: Center(
                            child: Text(
                              (fullName.isNotEmpty ? fullName[0] : '?').toUpperCase(),
                              style: const TextStyle(
                                color: AppColors.primaryDark,
                                fontWeight: FontWeight.w900,
                                fontSize: 24,
                              ),
                            ),
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(width: 16),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              Text(
                                '$greeting,',
                                style: TextStyle(
                                  color: Colors.white.withValues(alpha: 0.85),
                                  fontSize: 12.5,
                                  fontWeight: FontWeight.w500,
                                ),
                              ),
                              const SizedBox(width: 6),
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                decoration: BoxDecoration(
                                  color: const Color(0xFF10B981),
                                  borderRadius: BorderRadius.circular(6),
                                ),
                                child: const Row(
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    Icon(Icons.verified_rounded, size: 10, color: Colors.white),
                                    SizedBox(width: 2),
                                    Text(
                                      'Aktif',
                                      style: TextStyle(
                                        color: Colors.white,
                                        fontSize: 10,
                                        fontWeight: FontWeight.w800,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 2),
                          Text(
                            fullName,
                            style: const TextStyle(
                              color: Colors.white,
                              fontWeight: FontWeight.w800,
                              fontSize: 18,
                              letterSpacing: -0.3,
                            ),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                          const SizedBox(height: 6),
                          Row(
                            children: [
                              _PassportBadge(label: nis),
                              const SizedBox(width: 6),
                              _PassportBadge(label: className),
                            ],
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _PassportBadge extends StatelessWidget {
  final String label;
  const _PassportBadge({required this.label});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.16),
        borderRadius: BorderRadius.circular(7),
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

class _ActiveExamHeroBanner extends StatelessWidget {
  final Map<String, dynamic> exam;
  const _ActiveExamHeroBanner({required this.exam});

  @override
  Widget build(BuildContext context) {
    final sTheme = SubjectTheme.fromSubject(
      name: exam['subject']?['name'],
      code: exam['subject']?['code'],
    );

    return BouncingButton(
      onTap: () => context.goNamed(RouteNames.examDetail, extra: exam),
      child: Container(
        padding: const EdgeInsets.all(18),
        decoration: BoxDecoration(
          color: const Color(0xFFF0FDF4), // Mint Green Surface
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: const Color(0xFF86EFAC), width: 1.5),
          boxShadow: [
            BoxShadow(
              color: const Color(0xFF10B981).withValues(alpha: 0.15),
              blurRadius: 14,
              offset: const Offset(0, 4),
            ),
          ],
        ),
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  colors: [sTheme.gradientStart, sTheme.gradientEnd],
                ),
                borderRadius: BorderRadius.circular(14),
                boxShadow: [
                  BoxShadow(
                    color: sTheme.primary.withValues(alpha: 0.35),
                    blurRadius: 8,
                    offset: const Offset(0, 3),
                  ),
                ],
              ),
              child: Icon(sTheme.icon, color: Colors.white, size: 24),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Container(
                        width: 8,
                        height: 8,
                        decoration: const BoxDecoration(
                          color: Color(0xFF10B981),
                          shape: BoxShape.circle,
                        ),
                      ),
                      const SizedBox(width: 6),
                      const Text(
                        'SEDANG BERLANGSUNG',
                        style: TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.w800,
                          letterSpacing: 0.5,
                          color: Color(0xFF047857),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 4),
                  Text(
                    exam['title'] ?? 'Ujian Aktif',
                    style: const TextStyle(
                      fontSize: 14.5,
                      fontWeight: FontWeight.w800,
                      letterSpacing: -0.3,
                      color: AppColors.textPrimary,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ],
              ),
            ),
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: Colors.white,
                shape: BoxShape.circle,
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withValues(alpha: 0.06),
                    blurRadius: 6,
                  ),
                ],
              ),
              child: const Icon(Icons.arrow_forward_rounded, size: 16, color: Color(0xFF047857)),
            ),
          ],
        ),
      ),
    );
  }
}

class _GamifiedStatCard extends StatelessWidget {
  final String title;
  final String value;
  final String subtitle;
  final IconData icon;
  final Color primaryColor;
  final Color backgroundColor;

  const _GamifiedStatCard({
    required this.title,
    required this.value,
    required this.subtitle,
    required this.icon,
    required this.primaryColor,
    required this.backgroundColor,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: AppColors.border),
        boxShadow: AppShadows.card,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: backgroundColor,
              borderRadius: BorderRadius.circular(10),
            ),
            child: Icon(icon, size: 20, color: primaryColor),
          ),
          const SizedBox(height: 12),
          Text(
            value,
            style: const TextStyle(
              fontSize: 22,
              fontWeight: FontWeight.w900,
              letterSpacing: -0.6,
              color: AppColors.textPrimary,
              fontFeatures: [FontFeature.tabularFigures()],
            ),
          ),
          const SizedBox(height: 2),
          Text(
            title,
            style: const TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.w700,
              color: AppColors.textSecondary,
            ),
          ),
          Text(
            subtitle,
            style: TextStyle(
              fontSize: 10,
              fontWeight: FontWeight.w600,
              color: primaryColor,
            ),
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
          ),
        ],
      ),
    );
  }
}

class _SubjectThemedExamCard extends StatelessWidget {
  final Map<String, dynamic> exam;
  final SubjectThemeData theme;
  final VoidCallback onTap;

  const _SubjectThemedExamCard({
    required this.exam,
    required this.theme,
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

    return BouncingButton(
      onTap: onTap,
      child: Container(
        decoration: BoxDecoration(
          color: AppColors.surface,
          borderRadius: BorderRadius.circular(18),
          border: Border.all(color: AppColors.border),
          boxShadow: AppShadows.card,
        ),
        clipBehavior: Clip.antiAlias,
        child: IntrinsicHeight(
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // Left Accent Colored Stripe
              Container(
                width: 6,
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    colors: [theme.gradientStart, theme.gradientEnd],
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
                              color: theme.backgroundWash,
                              borderRadius: BorderRadius.circular(10),
                            ),
                            child: Icon(theme.icon, size: 20, color: theme.primary),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  title,
                                  style: const TextStyle(
                                    fontSize: 14.5,
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
                                    color: theme.primary,
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
                              '$duration Menit',
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
    );
  }
}
