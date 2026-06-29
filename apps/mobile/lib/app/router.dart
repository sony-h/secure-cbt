import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:secure_cbt_mobile/app/route_names.dart';
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
import 'package:secure_cbt_mobile/features/auth/providers/auth_provider.dart';

final routerProvider = Provider<GoRouter>((ref) {
  return GoRouter(
    initialLocation: '/login',
    redirect: (context, state) {
      final authState = ref.read(authProvider);
      final isLoggedIn = authState.isAuthenticated;
      final isLoginRoute = state.matchedLocation == '/login';

      if (!isLoggedIn && !isLoginRoute) return '/login';
      if (isLoggedIn && isLoginRoute) return '/home';
      return null;
    },
    routes: [
      GoRoute(
        path: '/login',
        name: RouteNames.login,
        builder: (context, state) => const LoginScreen(),
      ),

      StatefulShellRoute.indexedStack(
        builder: (context, state, navigationShell) {
          return ScaffoldWithNavBar(navigationShell: navigationShell);
        },
        branches: [
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: '/home',
                name: RouteNames.home,
                builder: (context, state) => const HomeScreen(),
              ),
            ],
          ),
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: '/exams',
                name: RouteNames.exams,
                builder: (context, state) => const ExamsScreen(),
              ),
            ],
          ),
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: '/history',
                name: RouteNames.history,
                builder: (context, state) => const HistoryScreen(),
              ),
            ],
          ),
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: '/profile',
                name: RouteNames.profile,
                builder: (context, state) => const ProfileScreen(),
              ),
            ],
          ),
        ],
      ),

      GoRoute(
        path: '/exam-detail',
        name: RouteNames.examDetail,
        builder: (context, state) {
          final extra = state.extra as Map<String, dynamic>? ?? {};
          return ExamDetailScreen(exam: extra);
        },
      ),
      GoRoute(
        path: '/token',
        name: RouteNames.token,
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
        name: RouteNames.exam,
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
        name: RouteNames.result,
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
