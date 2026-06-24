import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:dio/dio.dart';
import 'package:secure_cbt_mobile/core/network/dio_client.dart';
import 'package:secure_cbt_mobile/core/logger/logger.dart';

// ── Auth State ────────────────────────────────────────────────
class AuthState {
  final bool isAuthenticated;
  final String? accessToken;
  final String? userId;
  final String? username;
  final String? fullName;
  final String? role;

  const AuthState({
    this.isAuthenticated = false,
    this.accessToken,
    this.userId,
    this.username,
    this.fullName,
    this.role,
  });

  AuthState copyWith({
    bool? isAuthenticated,
    String? accessToken,
    String? userId,
    String? username,
    String? fullName,
    String? role,
  }) {
    return AuthState(
      isAuthenticated: isAuthenticated ?? this.isAuthenticated,
      accessToken: accessToken ?? this.accessToken,
      userId: userId ?? this.userId,
      username: username ?? this.username,
      fullName: fullName ?? this.fullName,
      role: role ?? this.role,
    );
  }
}

// ── Auth Notifier ────────────────────────────────────────────
class AuthNotifier extends StateNotifier<AuthState> {
  final Dio _dio;
  final FlutterSecureStorage _storage;

  AuthNotifier(this._dio, this._storage) : super(const AuthState());

  Future<void> login(String username, String password) async {
    try {
      final response = await _dio.post('/auth/login', data: {
        'username': username,
        'password': password,
      });

      final data = response.data['data'];
      final accessToken = data['access_token'] as String;
      final refreshToken = data['refresh_token'] as String;
      final user = data['user'];

      await _storage.write(key: 'access_token', value: accessToken);
      await _storage.write(key: 'refresh_token', value: refreshToken);

      state = AuthState(
        isAuthenticated: true,
        accessToken: accessToken,
        userId: user['id'],
        username: user['username'],
        fullName: user['full_name'],
        role: user['role'],
      );

      AppLogger.info('Login successful', username);
    } on DioException catch (e) {
      final message = e.response?.data?['message'] ?? 'Login gagal';
      AppLogger.error('Login failed', e);
      throw Exception(message);
    }
  }

  Future<void> logout() async {
    try {
      final token = await _storage.read(key: 'refresh_token');
      if (token != null) {
        await _dio.post('/auth/logout', data: {'refresh_token': token});
      }
    } catch (_) {
      // Ignore logout API errors
    } finally {
      await _storage.deleteAll();
      state = const AuthState();
      AppLogger.info('Logged out');
    }
  }

  Future<void> tryAutoLogin() async {
    final token = await _storage.read(key: 'access_token');
    if (token != null) {
      try {
        final response = await _dio.get('/auth/me');
        final user = response.data['data'];
        state = AuthState(
          isAuthenticated: true,
          accessToken: token,
          userId: user['id'] as String?,
          username: user['username'] as String?,
          fullName: user['full_name'] as String?,
          role: user['role'] as String?,
        );
      } catch (_) {
        await _storage.deleteAll();
      }
    }
  }
}

// ── Provider ──────────────────────────────────────────────────
final authProvider = StateNotifierProvider<AuthNotifier, AuthState>((ref) {
  final dio = ref.watch(dioProvider);
  final storage = ref.watch(secureStorageProvider);
  return AuthNotifier(dio, storage);
});
