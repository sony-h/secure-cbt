import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:secure_cbt_mobile/core/network/dio_client.dart';

final examResultProvider = FutureProvider.family((ref, String sessionId) async {
  final dio = ref.read(dioProvider);
  final response = await dio.get('/grading/result/$sessionId');
  final data = response.data;
  if (data['success'] == true && data['data'] != null) {
    return data['data'] as Map<String, dynamic>;
  }
  throw Exception('Hasil tidak ditemukan');
});
