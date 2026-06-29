import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:secure_cbt_mobile/core/network/dio_client.dart';

final examsDataProvider = FutureProvider((ref) async {
  final dio = ref.read(dioProvider);
  final examsRes = await dio.get('/exams/student');
  final subjectsRes = await dio.get('/academic/subjects');
  return {
    'exams': (examsRes.data['data'] as List?) ?? [],
    'subjects': (subjectsRes.data['data'] as List?) ?? [],
  };
});
