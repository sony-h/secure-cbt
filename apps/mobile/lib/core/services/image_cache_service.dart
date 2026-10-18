import 'package:flutter_cache_manager/flutter_cache_manager.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:secure_cbt_mobile/core/logger/logger.dart';
import 'package:secure_cbt_mobile/core/network/server_config_provider.dart';

class ImageCacheService {
  BaseCacheManager? _cacheManager;

  ImageCacheService({BaseCacheManager? cacheManager})
      : _cacheManager = cacheManager;

  BaseCacheManager get cacheManager => _cacheManager ??= DefaultCacheManager();

  static final RegExp _markdownImageRegex = RegExp(r'!\[.*?\]\((.*?)\)');
  static final RegExp _htmlImageRegex = RegExp(r'<img[^>]+src=["''](.*?)["'']', caseSensitive: false);

  Set<String> extractExamImageUrls(List<Map<String, dynamic>> questions) {
    final urls = <String>{};

    for (final q in questions) {
      final qData = q['question'] as Map<String, dynamic>? ?? q;

      // Direct question image
      final qImg = qData['image_url']?.toString().trim();
      if (qImg != null && qImg.isNotEmpty) {
        urls.add(qImg);
      }

      // Markdown / HTML images in question content
      final content = qData['content']?.toString();
      if (content != null && content.isNotEmpty) {
        for (final match in _markdownImageRegex.allMatches(content)) {
          final url = match.group(1)?.trim();
          if (url != null && url.isNotEmpty) urls.add(url);
        }
        for (final match in _htmlImageRegex.allMatches(content)) {
          final url = match.group(1)?.trim();
          if (url != null && url.isNotEmpty) urls.add(url);
        }
      }

      // Options images
      final options = qData['options'] as List<dynamic>?;
      if (options != null) {
        for (final opt in options) {
          if (opt is Map) {
            final optImg = opt['image_url']?.toString().trim();
            if (optImg != null && optImg.isNotEmpty) {
              urls.add(optImg);
            }

            final optContent = opt['content']?.toString();
            if (optContent != null && optContent.isNotEmpty) {
              for (final match in _markdownImageRegex.allMatches(optContent)) {
                final url = match.group(1)?.trim();
                if (url != null && url.isNotEmpty) urls.add(url);
              }
            }
          }
        }
      }
    }

    return urls;
  }

  Future<int> preCacheExamImages(List<Map<String, dynamic>> questions) async {
    final rawUrls = extractExamImageUrls(questions);
    if (rawUrls.isEmpty) return 0;

    int successCount = 0;
    final mgr = cacheManager;
    final downloadTasks = rawUrls.map((rawUrl) async {
      try {
        final resolvedUrl = resolveMediaUrl(rawUrl);
        await mgr
            .getSingleFile(resolvedUrl)
            .timeout(const Duration(seconds: 6));
        successCount++;
      } catch (e) {
        AppLogger.warn('Pre-cache image failed for $rawUrl: $e');
      }
    });

    await Future.wait(downloadTasks);
    AppLogger.info('Pre-cached $successCount of ${rawUrls.length} stimulus images');
    return successCount;
  }
}

final imageCacheServiceProvider = Provider<ImageCacheService>((ref) {
  return ImageCacheService();
});
