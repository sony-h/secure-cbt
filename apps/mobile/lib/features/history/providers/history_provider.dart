import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:secure_cbt_mobile/core/network/dio_client.dart';

final historyDataProvider = FutureProvider((ref) async {
  final dio = ref.read(dioProvider);
  final res = await dio.get('/sessions/history');
  final list = (res.data is Map && res.data['data'] is List)
      ? res.data['data'] as List
      : [];
  return List<Map<String, dynamic>>.from(list);
});
