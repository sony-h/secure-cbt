import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:secure_cbt_mobile/core/network/dio_client.dart';

final examsDataProvider = FutureProvider((ref) async {
  final dio = ref.read(dioProvider);
  final examsRes = await dio.get('/exams/student');
  final subjectsRes = await dio.get('/academic/subjects');
  final examsList = (examsRes.data is Map && examsRes.data['data'] is List)
      ? (examsRes.data['data'] as List)
      : [];
  final subjectsList = (subjectsRes.data is Map && subjectsRes.data['data'] is List)
      ? (subjectsRes.data['data'] as List)
      : [];
  return {
    'exams': examsList,
    'subjects': subjectsList,
  };
});
