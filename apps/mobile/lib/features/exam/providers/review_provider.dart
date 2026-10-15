import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:secure_cbt_mobile/core/network/dio_client.dart';
import 'package:secure_cbt_mobile/core/network/api_error_handler.dart';

final examReviewProvider = FutureProvider.family<Map<String, dynamic>, String>((ref, String sessionId) async {
  final dio = ref.read(dioProvider);
  try {
    final response = await dio.get('/sessions/$sessionId/review');
    final data = response.data;
    if (data is Map && data['success'] == true && data['data'] != null) {
      return data['data'] as Map<String, dynamic>;
    }
    throw Exception('Data pembahasan tidak ditemukan');
  } on DioException catch (e) {
    final msg = ApiErrorHandler.extractErrorMessage(e, fallback: 'Pembahasan belum dapat diakses.');
    throw Exception(msg);
  }
});
