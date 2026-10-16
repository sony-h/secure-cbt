import 'dart:convert';
import 'dart:io';
import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:path/path.dart' as p;
import 'package:path_provider/path_provider.dart';
import 'package:secure_cbt_mobile/core/logger/logger.dart';
import 'package:secure_cbt_mobile/core/network/dio_client.dart';

class AudioCacheException implements Exception {
  final String message;
  final Object? cause;

  AudioCacheException(this.message, [this.cause]);

  @override
  String toString() => 'AudioCacheException: $message${cause != null ? ' (Cause: $cause)' : ''}';
}

class AudioCacheService {
  final Dio _dio;
  final Future<Directory> Function()? _cacheDirProvider;
  Directory? _customDir;

  AudioCacheService({
    Dio? dio,
    Future<Directory> Function()? cacheDirProvider,
    Directory? customDir,
  })  : _dio = dio ?? Dio(),
        _cacheDirProvider = cacheDirProvider,
        _customDir = customDir;

  Future<Directory> _getCacheDir() async {
    if (_customDir != null) {
      if (!await _customDir!.exists()) {
        await _customDir!.create(recursive: true);
      }
      return _customDir!;
    }

    if (_cacheDirProvider != null) {
      final dir = await _cacheDirProvider();
      if (!await dir.exists()) {
        await dir.create(recursive: true);
      }
      _customDir = dir;
      return dir;
    }

    try {
      final docsDir = await getApplicationDocumentsDirectory();
      final cacheDir = Directory(p.join(docsDir.path, 'cbt_audio_cache'));
      if (!await cacheDir.exists()) {
        await cacheDir.create(recursive: true);
      }
      _customDir = cacheDir;
      return cacheDir;
    } catch (e) {
      // Fallback for tests or platforms where path_provider is not mocked
      final tempDir = Directory(p.join(Directory.systemTemp.path, 'cbt_audio_cache'));
      if (!await tempDir.exists()) {
        await tempDir.create(recursive: true);
      }
      _customDir = tempDir;
      return tempDir;
    }
  }

  String _getCacheFilename(String url) {
    final uri = Uri.tryParse(url);
    final pathSegments = uri?.pathSegments ?? [];
    final originalName = pathSegments.isNotEmpty ? pathSegments.last : '';
    final dotIdx = originalName.lastIndexOf('.');
    final ext = (dotIdx != -1 && dotIdx < originalName.length - 1)
        ? originalName.substring(dotIdx)
        : '.mp3';

    final encoded = base64Url.encode(utf8.encode(url)).replaceAll('=', '');
    final safeKey = encoded.length > 32 ? encoded.substring(0, 32) : encoded;
    return 'audio_${safeKey}_${url.hashCode.toRadixString(16)}$ext';
  }

  /// Checks if an audio file for [url] is already cached locally.
  /// Returns the absolute file path if cached, or null if missing.
  Future<String?> getCachedAudioPath(String url) async {
    if (url.trim().isEmpty) return null;
    final resolvedUrl = resolveMediaUrl(url.trim());
    final dir = await _getCacheDir();
    final filename = _getCacheFilename(resolvedUrl);
    final file = File(p.join(dir.path, filename));
    if (await file.exists() && (await file.length()) > 0) {
      return file.path;
    }
    return null;
  }

  /// Synchronous check if base cache directory is already resolved.
  String? getCachedAudioPathSync(String url) {
    if (url.trim().isEmpty || _customDir == null) return null;
    final resolvedUrl = resolveMediaUrl(url.trim());
    final filename = _getCacheFilename(resolvedUrl);
    final file = File(p.join(_customDir!.path, filename));
    if (file.existsSync() && file.lengthSync() > 0) {
      return file.path;
    }
    return null;
  }

  /// Alias for [getCachedAudioPath].
  Future<String?> getLocalAudioPath(String url) => getCachedAudioPath(url);

  /// Pre-caches audio stimuli for all questions in [questions].
  ///
  /// Scans each question map for `audio_url` or `audioUrl`, downloads
  /// missing files into the local cache directory, and invokes [onProgress]
  /// after each unique audio stimulus is processed.
  ///
  /// Returns a map of `url -> localFilePath`.
  Future<Map<String, String>> preCacheExamAudio(
    List<Map<String, dynamic>> questions, {
    void Function(int current, int total)? onProgress,
  }) async {
    final result = <String, String>{};

    // Extract unique audio items: Map<rawUrl, resolvedUrl>
    final audioEntries = <String, String>{};
    for (final q in questions) {
      final raw = (q['audio_url'] ?? q['audioUrl']) as String?;
      if (raw != null && raw.trim().isNotEmpty) {
        final trimmed = raw.trim();
        final resolved = resolveMediaUrl(trimmed);
        audioEntries[trimmed] = resolved;
      }
    }

    final total = audioEntries.length;
    if (total == 0) {
      onProgress?.call(0, 0);
      return result;
    }

    final dir = await _getCacheDir();
    var current = 0;

    for (final entry in audioEntries.entries) {
      final rawUrl = entry.key;
      final resolvedUrl = entry.value;
      final filename = _getCacheFilename(resolvedUrl);
      final file = File(p.join(dir.path, filename));

      if (await file.exists() && (await file.length()) > 0) {
        result[rawUrl] = file.path;
      } else {
        try {
          final tempFilePath = '${file.path}.tmp';
          await _dio.download(resolvedUrl, tempFilePath);
          final tempFile = File(tempFilePath);
          if (!await tempFile.exists() || (await tempFile.length()) == 0) {
            throw AudioCacheException('Downloaded audio file is empty for $resolvedUrl');
          }
          await tempFile.rename(file.path);
          result[rawUrl] = file.path;
        } catch (e, st) {
          AppLogger.error('Failed to pre-cache audio: $resolvedUrl', e, st);
          if (e is AudioCacheException) rethrow;
          throw AudioCacheException('Failed to download audio file: $resolvedUrl', e);
        }
      }

      current++;
      onProgress?.call(current, total);
    }

    return result;
  }

  /// Clears all files in the CBT audio cache directory.
  Future<void> clearAudioCache() async {
    final dir = await _getCacheDir();
    if (await dir.exists()) {
      final entities = await dir.list().toList();
      for (final entity in entities) {
        try {
          await entity.delete(recursive: true);
        } catch (e) {
          AppLogger.warn('Failed to delete cached audio entity: ${entity.path}');
        }
      }
    }
  }
}

final audioCacheServiceProvider = Provider<AudioCacheService>((ref) {
  final dio = ref.watch(dioProvider);
  return AudioCacheService(dio: dio);
});
