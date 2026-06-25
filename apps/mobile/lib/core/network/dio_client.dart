import 'package:dio/dio.dart';
import 'package:dio_smart_retry/dio_smart_retry.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:secure_cbt_mobile/core/logger/logger.dart';

const _baseUrl = 'http://10.0.2.2:3000/api/v1'; // Android emulator → host

final secureStorageProvider = Provider<FlutterSecureStorage>((ref) {
  return const FlutterSecureStorage();
});

final dioProvider = Provider<Dio>((ref) {
  final dio = Dio(BaseOptions(
    baseUrl: _baseUrl,
    connectTimeout: const Duration(seconds: 10),
    receiveTimeout: const Duration(seconds: 10),
    headers: {'Content-Type': 'application/json'},
  ));

  // ── Logging Interceptor ─────────────────────────────────────
  dio.interceptors.add(LogInterceptor(
    requestBody: true,
    responseBody: true,
    logPrint: (obj) => AppLogger.debug('Dio', obj),
  ));

  // ── Auth Interceptor ────────────────────────────────────────
  dio.interceptors.add(InterceptorsWrapper(
    onRequest: (options, handler) async {
      final storage = ref.read(secureStorageProvider);
      final token = await storage.read(key: 'access_token');
      if (token != null) {
        options.headers['Authorization'] = 'Bearer $token';
      }
      handler.next(options);
    },
    onError: (error, handler) async {
      // Auto-refresh token on 401
      if (error.response?.statusCode == 401) {
        final storage = ref.read(secureStorageProvider);
        final refreshToken = await storage.read(key: 'refresh_token');
        if (refreshToken != null) {
          try {
            final refreshDio = Dio(BaseOptions(baseUrl: _baseUrl));
            final response = await refreshDio.post('/auth/refresh', data: {
              'refresh_token': refreshToken,
            });
            final newAccess = response.data['data']['access_token'];
            final newRefresh = response.data['data']['refresh_token'];
            await storage.write(key: 'access_token', value: newAccess);
            await storage.write(key: 'refresh_token', value: newRefresh);

            // Retry original request
            final opts = error.requestOptions;
            opts.headers['Authorization'] = 'Bearer $newAccess';
            final retryResponse = await Dio().fetch(opts);
            return handler.resolve(retryResponse);
          } catch (e) {
            await storage.deleteAll();
          }
        }
      }
      handler.next(error);
    },
  ));

  // ── Retry Interceptor (for offline resilience) ──────────────
  dio.interceptors.add(RetryInterceptor(
    dio: dio,
    logPrint: (msg) => AppLogger.debug('Retry', msg),
    retries: 3,
    retryDelays: const [
      Duration(seconds: 1),
      Duration(seconds: 2),
      Duration(seconds: 4),
    ],
  ));

  return dio;
});
