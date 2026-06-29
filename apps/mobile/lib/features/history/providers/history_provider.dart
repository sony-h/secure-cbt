import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:secure_cbt_mobile/core/network/dio_client.dart';

final historyDataProvider = FutureProvider((ref) async {
  final dio = ref.read(dioProvider);
  final res = await dio.get('/sessions/history');
  return List<Map<String, dynamic>>.from(res.data['data'] ?? []);
});
