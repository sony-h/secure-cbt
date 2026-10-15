import 'package:flutter_test/flutter_test.dart';
import 'package:dio/dio.dart';
import 'package:secure_cbt_mobile/core/network/api_error_handler.dart';

void main() {
  group('ApiErrorHandler.extractErrorMessage', () {
    test('extracts message from standard JSON response map', () {
      final dioException = DioException(
        requestOptions: RequestOptions(path: '/auth/login'),
        response: Response(
          requestOptions: RequestOptions(path: '/auth/login'),
          statusCode: 400,
          data: {'message': 'Username atau password salah'},
        ),
      );

      final message = ApiErrorHandler.extractErrorMessage(dioException);
      expect(message, 'Username atau password salah');
    });

    test('handles HTML String response without throwing "String is not subtype of int" index error', () {
      final dioException = DioException(
        requestOptions: RequestOptions(path: '/auth/login'),
        response: Response(
          requestOptions: RequestOptions(path: '/auth/login'),
          statusCode: 404,
          data: '<!DOCTYPE html><html><head><title>404 Not Found</title></head><body>404</body></html>',
        ),
      );

      // Must not throw Dart runtime index error
      final message = ApiErrorHandler.extractErrorMessage(dioException);
      expect(message, contains('404'));
      expect(message, contains('tidak ditemukan'));
    });

    test('extracts message when data.message is a List of validation errors', () {
      final dioException = DioException(
        requestOptions: RequestOptions(path: '/auth/login'),
        response: Response(
          requestOptions: RequestOptions(path: '/auth/login'),
          statusCode: 400,
          data: {
            'message': ['username must not be empty', 'password is too short']
          },
        ),
      );

      final message = ApiErrorHandler.extractErrorMessage(dioException);
      expect(message, contains('username must not be empty'));
      expect(message, contains('password is too short'));
    });

    test('handles connection timeout cleanly', () {
      final dioException = DioException(
        requestOptions: RequestOptions(path: '/auth/login'),
        type: DioExceptionType.connectionTimeout,
      );

      final message = ApiErrorHandler.extractErrorMessage(dioException);
      expect(message.toLowerCase(), contains('batas waktu'));
    });

    test('handles connection error cleanly', () {
      final dioException = DioException(
        requestOptions: RequestOptions(path: '/auth/login'),
        type: DioExceptionType.connectionError,
      );

      final message = ApiErrorHandler.extractErrorMessage(dioException);
      expect(message.toLowerCase(), contains('gagal terhubung'));
    });
  });
}
