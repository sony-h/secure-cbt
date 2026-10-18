import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:secure_cbt_mobile/core/logger/logger.dart';

const String defaultApiHost = String.fromEnvironment(
  'API_URL',
  defaultValue: 'http://10.0.2.2:3000',
);

String _currentApiHost = defaultApiHost;

String sanitizeServerUrl(String rawUrl) {
  var url = rawUrl.trim();
  if (url.isEmpty) return defaultApiHost;

  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    url = 'http://$url';
  }

  url = url.replaceAll(RegExp(r'/+$'), '');

  if (url.endsWith('/api/v1')) {
    url = url.substring(0, url.length - '/api/v1'.length);
  }

  return url.replaceAll(RegExp(r'/+$'), '');
}

String resolveMediaUrl(String? url) {
  if (url == null || url.isEmpty) return '';
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  final cleanHost = _currentApiHost.replaceAll(RegExp(r'/+$'), '');
  return '$cleanHost${url.startsWith('/') ? '' : '/'}$url';
}

class ServerConfigState {
  final String apiHost;
  final bool isCustom;
  final bool isLoading;

  const ServerConfigState({
    required this.apiHost,
    this.isCustom = false,
    this.isLoading = false,
  });

  String get baseUrl => '$apiHost/api/v1';
  String get socketBaseUrl => apiHost;

  ServerConfigState copyWith({
    String? apiHost,
    bool? isCustom,
    bool? isLoading,
  }) {
    return ServerConfigState(
      apiHost: apiHost ?? this.apiHost,
      isCustom: isCustom ?? this.isCustom,
      isLoading: isLoading ?? this.isLoading,
    );
  }
}

class ServerConfigNotifier extends StateNotifier<ServerConfigState> {
  final FlutterSecureStorage _storage;
  static const String storageKey = 'custom_api_url';

  ServerConfigNotifier(this._storage)
      : super(const ServerConfigState(apiHost: defaultApiHost)) {
    loadSavedConfig();
  }

  Future<void> loadSavedConfig() async {
    try {
      final savedUrl = await _storage.read(key: storageKey);
      if (savedUrl != null && savedUrl.trim().isNotEmpty) {
        final sanitized = sanitizeServerUrl(savedUrl);
        _currentApiHost = sanitized;
        state = ServerConfigState(apiHost: sanitized, isCustom: true);
      }
    } catch (e) {
      AppLogger.warn('Failed to read custom server URL from storage: $e');
    }
  }

  Future<void> setServerUrl(String rawUrl) async {
    final sanitized = sanitizeServerUrl(rawUrl);
    await _storage.write(key: storageKey, value: sanitized);
    _currentApiHost = sanitized;
    state = ServerConfigState(apiHost: sanitized, isCustom: true);
  }

  Future<void> resetToDefault() async {
    await _storage.delete(key: storageKey);
    _currentApiHost = defaultApiHost;
    state = const ServerConfigState(apiHost: defaultApiHost, isCustom: false);
  }

  Future<bool> testConnection(String candidateUrl) async {
    final sanitized = sanitizeServerUrl(candidateUrl);
    final dio = Dio(BaseOptions(
      connectTimeout: const Duration(seconds: 4),
      receiveTimeout: const Duration(seconds: 4),
    ));
    try {
      final res = await dio.get('$sanitized/api/v1/health');
      return res.statusCode != null && res.statusCode! >= 200 && res.statusCode! < 300;
    } catch (e) {
      AppLogger.debug('Server connection test failed for $sanitized: $e');
      return false;
    }
  }
}

final serverConfigProvider =
    StateNotifierProvider<ServerConfigNotifier, ServerConfigState>((ref) {
  const storage = FlutterSecureStorage();
  return ServerConfigNotifier(storage);
});
