import 'package:go_router/go_router.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:secure_cbt_mobile/features/auth/presentation/screens/login_screen.dart';
import 'package:secure_cbt_mobile/features/auth/presentation/screens/token_screen.dart';
import 'package:secure_cbt_mobile/features/exam/presentation/screens/exam_screen.dart';
import 'package:secure_cbt_mobile/features/exam/presentation/screens/result_screen.dart';
import 'package:secure_cbt_mobile/features/home/presentation/screens/home_screen.dart';
import 'package:secure_cbt_mobile/features/exams/presentation/screens/exams_screen.dart';
import 'package:secure_cbt_mobile/features/exams/presentation/screens/exam_detail_screen.dart';
import 'package:secure_cbt_mobile/features/history/presentation/screens/history_screen.dart';
import 'package:secure_cbt_mobile/features/profile/presentation/screens/profile_screen.dart';
import 'package:secure_cbt_mobile/app/widgets/scaffold_with_nav_bar.dart';

final routerProvider = Provider<GoRouter>((ref) {
  return GoRouter(
    initialLocation: '/login',
    routes: [
      // ── Auth (no bottom nav) ────────────────────────────────
      GoRoute(
        path: '/login',
        name: 'login',
        builder: (context, state) => const LoginScreen(),
      ),

      // ── Main Shell with Bottom Nav ──────────────────────────
      StatefulShellRoute.indexedStack(
        builder: (context, state, navigationShell) {
          return ScaffoldWithNavBar(navigationShell: navigationShell);
        },
        branches: [
          // Tab 0: Home
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: '/home',
                name: 'home',
                builder: (context, state) => const HomeScreen(),
              ),
            ],
          ),
          // Tab 1: Exams
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: '/exams',
                name: 'exams',
                builder: (context, state) => const ExamsScreen(),
              ),
            ],
          ),
          // Tab 2: History
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: '/history',
                name: 'history',
                builder: (context, state) => const HistoryScreen(),
              ),
            ],
          ),
          // Tab 3: Profile
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: '/profile',
                name: 'profile',
                builder: (context, state) => const ProfileScreen(),
              ),
            ],
          ),
        ],
      ),

      // ── Exam Flow (full screen, no bottom nav) ─────────────
      GoRoute(
        path: '/exam-detail',
        name: 'exam-detail',
        builder: (context, state) {
          final extra = state.extra as Map<String, dynamic>? ?? {};
          return ExamDetailScreen(exam: extra);
        },
      ),
      GoRoute(
        path: '/token',
        name: 'token',
        builder: (context, state) {
          final extra = state.extra as Map<String, dynamic>? ?? {};
          return TokenScreen(
            examTitle: extra['examTitle'] as String?,
            examId: extra['examId'] as String?,
          );
        },
      ),
      GoRoute(
        path: '/exam',
        name: 'exam',
        builder: (context, state) {
          final extra = state.extra as Map<String, dynamic>? ?? {};
          return ExamScreen(
            sessionId: extra['sessionId'] as String? ?? '',
            examTitle: extra['examTitle'] as String? ?? 'Ujian',
          );
        },
      ),
      GoRoute(
        path: '/result',
        name: 'result',
        builder: (context, state) {
          final extra = state.extra as Map<String, dynamic>? ?? {};
          return ResultScreen(
            sessionId: extra['sessionId'] as String? ?? '',
          );
        },
      ),
    ],
  );
});