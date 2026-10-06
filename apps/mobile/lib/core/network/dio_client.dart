import 'package:dio/dio.dart';
import 'package:dio_smart_retry/dio_smart_retry.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:secure_cbt_mobile/core/logger/logger.dart';
import 'package:secure_cbt_mobile/core/network/token_refresh_coordinator.dart';

const _apiHost = String.fromEnvironment(
  'API_URL',
  defaultValue: 'http://10.0.2.2:3000',
);
const _baseUrl = '$_apiHost/api/v1';

String resolveMediaUrl(String? url) {
  if (url == null || url.isEmpty) return '';
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  final cleanHost = _apiHost.replaceAll(RegExp(r'/+$'), '');
  return '$cleanHost${url.startsWith('/') ? '' : '/'}$url';
}

final secureStorageProvider = Provider<FlutterSecureStorage>((ref) {
  return const FlutterSecureStorage();
});

final tokenRefreshCoordinatorProvider = Provider<TokenRefreshCoordinator>((ref) {
  final storage = ref.watch(secureStorageProvider);
  return TokenRefreshCoordinator(storage, _baseUrl);
});

final dioProvider = Provider<Dio>((ref) {
  final dio = Dio(BaseOptions(
    baseUrl: _baseUrl,
    connectTimeout: const Duration(seconds: 10),
    receiveTimeout: const Duration(seconds: 10),
    headers: {'Content-Type': 'application/json'},
  ));

  final storage = ref.watch(secureStorageProvider);
  final coordinator = ref.watch(tokenRefreshCoordinatorProvider);

  // Order: Retry (closest to adapter) → Auth → Log (outermost)
  dio.interceptors.addAll([
    RetryInterceptor(
      dio: dio,
      logPrint: (msg) => AppLogger.debug('Retry', msg),
      retries: 3,
      retryDelays: const [
        Duration(seconds: 1),
        Duration(seconds: 2),
        Duration(seconds: 4),
      ],
    ),
    InterceptorsWrapper(
      onRequest: (options, handler) async {
        final token = await storage.read(key: 'access_token');
        if (token != null) {
          options.headers['Authorization'] = 'Bearer $token';
        }
        handler.next(options);
      },
      onError: (error, handler) async {
        final response = error.response;
        final requestOptions = error.requestOptions;

        // 1. Guard against non-401, already-retried, or auth endpoints
        if (response?.statusCode != 401 ||
            requestOptions.extra['_retry'] == true ||
            requestOptions.path.contains('/auth/login') ||
            requestOptions.path.contains('/auth/refresh')) {
          return handler.next(error);
        }

        requestOptions.extra['_retry'] = true;

        // 2. Fast-path: Check if another request already refreshed the access token
        final staleAuth = requestOptions.headers['Authorization'] as String?;
        final currentToken = await storage.read(key: 'access_token');
        if (currentToken != null && 'Bearer $currentToken' != staleAuth) {
          AppLogger.info('Token already refreshed by concurrent request, retrying');
          requestOptions.headers['Authorization'] = 'Bearer $currentToken';
          try {
            final retryResponse = await dio.fetch(requestOptions);
            return handler.resolve(retryResponse);
          } on DioException catch (retryErr) {
            return handler.next(retryErr);
          }
        }

        // 3. Ensure refresh token exists before attempting refresh
        final refreshToken = await storage.read(key: 'refresh_token');
        if (refreshToken == null || refreshToken.isEmpty) {
          AppLogger.warn('No refresh token available, clearing session');
          await storage.deleteAll();
          return handler.next(error);
        }

        // 4. Single-flight token refresh
        try {
          final newAccessToken = await coordinator.refreshAccessToken();
          requestOptions.headers['Authorization'] = 'Bearer $newAccessToken';
          final retryResponse = await dio.fetch(requestOptions);
          return handler.resolve(retryResponse);
        } catch (refreshErr) {
          // 5. On refresh failure: re-read storage first!
          // If another request or background task succeeded, do NOT wipe session
          final latestToken = await storage.read(key: 'access_token');
          if (latestToken != null && 'Bearer $latestToken' != staleAuth) {
            AppLogger.info('Refresh failed but valid token found in storage, retrying');
            requestOptions.headers['Authorization'] = 'Bearer $latestToken';
            try {
              final retryResponse = await dio.fetch(requestOptions);
              return handler.resolve(retryResponse);
            } on DioException catch (retryErr) {
              return handler.next(retryErr);
            }
          }

          // 6. Only wipe storage when session is genuinely dead
          AppLogger.error('Session is dead after failed refresh, wiping storage', refreshErr);
          await storage.deleteAll();
          return handler.next(error);
        }
      },
    ),
    LogInterceptor(
      requestBody: true,
      responseBody: true,
      logPrint: (obj) => AppLogger.debug('Dio', obj),
    ),
  ]);

  return dio;
});
