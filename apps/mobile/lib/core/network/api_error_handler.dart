import 'package:dio/dio.dart';

class ApiErrorHandler {
  /// Safely extracts a user-facing error message from any dynamic error or DioException.
  /// Guarantees no runtime type errors when backend returns HTML, String, or malformed data.
  static String extractErrorMessage(dynamic error, {String fallback = 'Terjadi kesalahan sistem'}) {
    if (error is DioException) {
      // 1. Connection / Timeout errors
      switch (error.type) {
        case DioExceptionType.connectionTimeout:
        case DioExceptionType.sendTimeout:
        case DioExceptionType.receiveTimeout:
          return 'Koneksi ke server batas waktu berakhir (timeout). Periksa jaringan Anda.';
        case DioExceptionType.connectionError:
          return 'Gagal terhubung ke server. Periksa koneksi internet atau alamat server.';
        case DioExceptionType.cancel:
          return 'Permintaan dibatalkan.';
        case DioExceptionType.badCertificate:
          return 'Sertifikat keamanan server tidak valid.';
        case DioExceptionType.unknown:
          if (error.error != null && error.error.toString().contains('SocketException')) {
            return 'Tidak dapat menjangkau server. Periksa koneksi internet Anda.';
          }
          break;
        case DioExceptionType.badResponse:
          break;
      }

      // 2. Handle HTTP response errors
      final response = error.response;
      if (response != null) {
        final statusCode = response.statusCode;
        final data = response.data;

        // When data is a structured JSON Map
        if (data is Map) {
          final message = data['message'];
          if (message is String && message.trim().isNotEmpty) {
            return message.trim();
          }
          if (message is List && message.isNotEmpty) {
            return message.map((m) => m.toString()).join('\n');
          }
          final errorField = data['error'];
          if (errorField is String && errorField.trim().isNotEmpty) {
            return errorField.trim();
          }
        }

        // When data is a String (e.g. HTML error page from Nginx / Next.js / Cloudflare)
        if (data is String) {
          final lower = data.toLowerCase();
          final isHtml = lower.contains('<!doctype') || lower.contains('<html') || lower.contains('<body');

          if (isHtml) {
            if (statusCode == 404) {
              return 'Alamat server API tidak ditemukan (404). Pastikan URL server benar.';
            }
            if (statusCode == 502) {
              return 'Server gateway error (502). Backend tidak dapat dihubungi.';
            }
            if (statusCode == 503) {
              return 'Server sedang dalam pemeliharaan (503). Coba beberapa saat lagi.';
            }
            if (statusCode == 500) {
              return 'Server mengalami kesalahan internal (500).';
            }
            return 'Server mengembalikan respons tidak valid (HTTP $statusCode).';
          }

          // Plain text error message (non-HTML)
          if (data.trim().isNotEmpty && data.length < 200) {
            return data.trim();
          }
        }

        // Fallbacks based on HTTP status code if no body message could be parsed
        if (statusCode == 401) {
          return 'Sesi Anda telah berakhir atau kredensial salah.';
        }
        if (statusCode == 403) {
          return 'Akses ditolak (403).';
        }
        if (statusCode == 404) {
          return 'Layanan atau data tidak ditemukan (404).';
        }
        if (statusCode != null && statusCode >= 500) {
          return 'Server sedang mengalami gangguan (HTTP $statusCode).';
        }
      }
    }

    if (error is Exception) {
      final str = error.toString().replaceFirst('Exception: ', '').trim();
      if (str.isNotEmpty) return str;
    }

    return fallback;
  }
}
