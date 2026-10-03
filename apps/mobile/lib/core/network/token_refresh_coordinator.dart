import 'package:dio/dio.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

/// Coordinates access token refreshes so concurrent 401s share a single
/// in-flight HTTP POST /auth/refresh call.
class TokenRefreshCoordinator {
  final FlutterSecureStorage _storage;
  final String _baseUrl;
  Dio? _refreshDio;

  Future<String>? _refreshFuture;

  TokenRefreshCoordinator(
    this._storage,
    this._baseUrl, {
    Dio? refreshDio,
  }) : _refreshDio = refreshDio;

  Dio get _client => _refreshDio ??= Dio(
        BaseOptions(
          baseUrl: _baseUrl,
          connectTimeout: const Duration(seconds: 10),
          receiveTimeout: const Duration(seconds: 10),
          headers: {'Content-Type': 'application/json'},
        ),
      );

  /// Requests a refreshed access token. Concurrent callers receive the same Future.
  Future<String> refreshAccessToken() {
    if (_refreshFuture != null) {
      return _refreshFuture!;
    }

    _refreshFuture = _doRefresh().whenComplete(() {
      _refreshFuture = null;
    });

    return _refreshFuture!;
  }

  Future<String> _doRefresh() async {
    final refreshToken = await _storage.read(key: 'refresh_token');
    if (refreshToken == null || refreshToken.isEmpty) {
      throw Exception('No refresh token available');
    }

    final response = await _client.post('/auth/refresh', data: {
      'refresh_token': refreshToken,
    });

    final data = response.data['data'];
    final newAccess = data['access_token'] as String;
    final newRefresh = data['refresh_token'] as String;

    await _storage.write(key: 'access_token', value: newAccess);
    await _storage.write(key: 'refresh_token', value: newRefresh);

    return newAccess;
  }
}
