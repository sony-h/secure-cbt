import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:secure_cbt_mobile/core/network/dio_client.dart';

final homeDataProvider = FutureProvider((ref) async {
  final dio = ref.read(dioProvider);
  final historyRes = await dio.get('/sessions/history');
  final examsRes = await dio.get('/exams/student');
  return {
    'history': (historyRes.data['data'] as List?) ?? [],
    'upcomingExams': (examsRes.data['data'] as List?) ?? [],
  };
});
