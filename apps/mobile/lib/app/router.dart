import 'package:go_router/go_router.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:secure_cbt_mobile/features/auth/presentation/screens/login_screen.dart';
import 'package:secure_cbt_mobile/features/auth/presentation/screens/token_screen.dart';
import 'package:secure_cbt_mobile/features/exam/presentation/screens/exam_screen.dart';
import 'package:secure_cbt_mobile/features/exam/presentation/screens/exam_select_screen.dart';
import 'package:secure_cbt_mobile/features/exam/presentation/screens/result_screen.dart';

final routerProvider = Provider<GoRouter>((ref) {
  return GoRouter(
    initialLocation: '/login',
    routes: [
      // ── Auth ────────────────────────────────────────────────
      GoRoute(
        path: '/login',
        name: 'login',
        builder: (context, state) => const LoginScreen(),
      ),

      // ── Exam Selection ──────────────────────────────────────
      GoRoute(
        path: '/exam-select',
        name: 'exam-select',
        builder: (context, state) => const ExamSelectScreen(),
      ),
      GoRoute(
        path: '/token',
        name: 'token',
        builder: (context, state) {
          final extra = state.extra as Map<String, dynamic>? ?? {};
          return TokenScreen(
            examTitle: extra['examTitle'] as String?,
          );
        },
      ),

      // ── Exam ────────────────────────────────────────────────
      GoRoute(
        path: '/exam',
        name: 'exam',
        builder: (context, state) {
          final extra = state.extra as Map<String, dynamic>? ?? {};
          return ExamScreen(
            sessionId: extra['sessionId'] as String? ?? '',
            examTitle: extra['examTitle'] as String? ?? 'Ujian',
            questions: (extra['questions'] as List<dynamic>?)?.cast<Map<String, dynamic>>() ?? [],
            remainingSeconds: extra['remainingSeconds'] as int? ?? 0,
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
