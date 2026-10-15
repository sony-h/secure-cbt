import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:secure_cbt_mobile/core/network/dio_client.dart';

final homeDataProvider = FutureProvider((ref) async {
  final dio = ref.read(dioProvider);
  final historyRes = await dio.get('/sessions/history');
  final examsRes = await dio.get('/exams/student');
  final historyList = (historyRes.data is Map && historyRes.data['data'] is List)
      ? (historyRes.data['data'] as List)
      : [];
  final upcomingList = (examsRes.data is Map && examsRes.data['data'] is List)
      ? (examsRes.data['data'] as List)
      : [];
  return {
    'history': historyList,
    'upcomingExams': upcomingList,
  };
});
