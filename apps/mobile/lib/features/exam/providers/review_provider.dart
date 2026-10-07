import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:secure_cbt_mobile/core/network/dio_client.dart';

final examReviewProvider = FutureProvider.family<Map<String, dynamic>, String>((ref, String sessionId) async {
  final dio = ref.read(dioProvider);
  try {
    final response = await dio.get('/sessions/$sessionId/review');
    final data = response.data;
    if (data['success'] == true && data['data'] != null) {
      return data['data'] as Map<String, dynamic>;
    }
    throw Exception('Data pembahasan tidak ditemukan');
  } on DioException catch (e) {
    final msg = e.response?.data?['message']?.toString() ?? 'Pembahasan belum dapat diakses.';
    throw Exception(msg);
  }
});
