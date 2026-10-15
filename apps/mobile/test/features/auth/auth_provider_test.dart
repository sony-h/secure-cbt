import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:dio/dio.dart';
import 'package:mocktail/mocktail.dart';
import 'package:secure_cbt_mobile/features/auth/providers/auth_provider.dart';

class MockDio extends Mock implements Dio {}
class MockFlutterSecureStorage extends Mock implements FlutterSecureStorage {}
class MockRef extends Mock implements Ref {}

void main() {
  late MockDio mockDio;
  late MockFlutterSecureStorage mockStorage;
  late MockRef mockRef;
  late AuthNotifier authNotifier;

  setUp(() {
    mockDio = MockDio();
    mockStorage = MockFlutterSecureStorage();
    mockRef = MockRef();
    authNotifier = AuthNotifier(mockRef, mockDio, mockStorage);
  });

  test('login throws clean Exception when server returns HTML 404 instead of JSON', () async {
    when(() => mockDio.post('/auth/login', data: any(named: 'data'))).thenThrow(
      DioException(
        requestOptions: RequestOptions(path: '/auth/login'),
        response: Response(
          requestOptions: RequestOptions(path: '/auth/login'),
          statusCode: 404,
          data: '<!DOCTYPE html><html><body>404 Not Found</body></html>',
        ),
      ),
    );

    try {
      await authNotifier.login('test_user', 'password123');
      fail('Should have thrown an Exception');
    } catch (e) {
      // Must not throw Dart index type error
      expect(e.toString(), isNot(contains("subtype of type 'int' of 'index'")));
      expect(e.toString(), contains('404'));
      expect(e.toString(), contains('tidak ditemukan'));
    }
  });

  test('login succeeds when server returns valid JSON data', () async {
    when(() => mockDio.post('/auth/login', data: any(named: 'data'))).thenAnswer(
      (_) async => Response(
        requestOptions: RequestOptions(path: '/auth/login'),
        statusCode: 200,
        data: {
          'data': {
            'access_token': 'mock_access',
            'refresh_token': 'mock_refresh',
            'user': {
              'id': 'u1',
              'username': 'student1',
              'full_name': 'Student One',
              'role': 'STUDENT',
              'nis': '12345',
              'class_name': 'XII-IPA-1',
            }
          }
        },
      ),
    );
    when(() => mockStorage.write(key: any(named: 'key'), value: any(named: 'value')))
        .thenAnswer((_) async {});

    await authNotifier.login('student1', 'password123');

    expect(authNotifier.state.isAuthenticated, isTrue);
    expect(authNotifier.state.username, 'student1');
  });
}
