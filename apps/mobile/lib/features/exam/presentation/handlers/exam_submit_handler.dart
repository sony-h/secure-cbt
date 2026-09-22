import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:secure_cbt_mobile/app/route_names.dart';
import 'package:secure_cbt_mobile/core/logger/logger.dart';
import 'package:secure_cbt_mobile/features/exam/providers/exam_provider.dart';
import 'package:secure_cbt_mobile/core/security/screen_security.dart';

class ExamSubmitHandler {
  final Dio dio;
  final String sessionId;
  final WidgetRef ref;
  final BuildContext context;

  bool _submitting = false;

  ExamSubmitHandler({
    required this.dio,
    required this.sessionId,
    required this.ref,
    required this.context,
  });

  bool get isSubmitting => _submitting;

  Future<void> forceSubmit() async {
    if (_submitting) return;
    _submitting = true;
    try {
      await dio.post('/sessions/submit', data: {
        'session_id': sessionId,
        'reason': 'WARNING_LIMIT_EXCEEDED',
      });
    } catch (e) {
      final isAlreadySubmitted = e is DioException &&
          (e.response?.statusCode == 400 &&
              (e.response?.data?['message']?.toString().toLowerCase().contains('dikumpulkan') == true ||
               e.response?.data?['message']?.toString().toLowerCase().contains('completed') == true));

      if (!isAlreadySubmitted) {
        AppLogger.error('Force submit failed', e);
        _submitting = false;
        if (context.mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('Auto-submit gagal: ${e.toString()}'), backgroundColor: Theme.of(context).colorScheme.error),
          );
        }
        return;
      }
      AppLogger.info('Session already submitted on server, navigating to result screen');
    }
    ref.read(examProvider.notifier).markSubmitted();
    ScreenSecurity.disable();
    if (context.mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: const Text('Ujian otomatis dikumpulkan.'),
          backgroundColor: Theme.of(context).colorScheme.error,
          duration: const Duration(seconds: 5),
        ),
      );
      await Future.delayed(const Duration(seconds: 2));
      if (context.mounted) context.goNamed(RouteNames.result, extra: {'sessionId': sessionId});
    }
  }

  Future<void> submitExam() async {
    if (_submitting) return;
    _submitting = true;
    try {
      await dio.post('/sessions/submit', data: {'session_id': sessionId});
    } catch (e) {
      final isAlreadySubmitted = e is DioException &&
          (e.response?.statusCode == 400 &&
              (e.response?.data?['message']?.toString().toLowerCase().contains('dikumpulkan') == true ||
               e.response?.data?['message']?.toString().toLowerCase().contains('completed') == true));

      if (!isAlreadySubmitted) {
        AppLogger.error('Submit failed', e);
        _submitting = false;
        if (context.mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('Submit gagal: ${e.toString()}'), backgroundColor: Theme.of(context).colorScheme.error),
          );
        }
        return;
      }
      AppLogger.info('Session already submitted on server, navigating to result screen');
    }
    ref.read(examProvider.notifier).markSubmitted();
    ScreenSecurity.disable();
    if (context.mounted) context.goNamed(RouteNames.result, extra: {'sessionId': sessionId});
  }
}
