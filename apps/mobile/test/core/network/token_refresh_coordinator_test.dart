import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:dio/dio.dart';
import 'package:mocktail/mocktail.dart';
import 'package:secure_cbt_mobile/core/network/token_refresh_coordinator.dart';

class MockFlutterSecureStorage extends Mock implements FlutterSecureStorage {}
class MockDio extends Mock implements Dio {}

void main() {
  late MockFlutterSecureStorage mockStorage;
  late MockDio mockRefreshDio;
  late TokenRefreshCoordinator coordinator;

  setUp(() {
    mockStorage = MockFlutterSecureStorage();
    mockRefreshDio = MockDio();
    coordinator = TokenRefreshCoordinator(
      mockStorage,
      'http://test.api/api/v1',
      refreshDio: mockRefreshDio,
    );
  });

  test('single-flight: parallel refresh calls make only ONE post request', () async {
    when(() => mockStorage.read(key: 'refresh_token'))
        .thenAnswer((_) async => 'valid_refresh_token');
    when(() => mockStorage.write(key: any(named: 'key'), value: any(named: 'value')))
        .thenAnswer((_) async {});
    when(() => mockRefreshDio.post('/auth/refresh', data: any(named: 'data')))
        .thenAnswer((_) async => Response(
              requestOptions: RequestOptions(path: '/auth/refresh'),
              data: {
                'data': {
                  'access_token': 'new_access_token',
                  'refresh_token': 'new_refresh_token',
                }
              },
            ));

    // Trigger two refreshes concurrently
    final future1 = coordinator.refreshAccessToken();
    final future2 = coordinator.refreshAccessToken();

    final results = await Future.wait([future1, future2]);

    expect(results[0], 'new_access_token');
    expect(results[1], 'new_access_token');
    verify(() => mockRefreshDio.post('/auth/refresh', data: {'refresh_token': 'valid_refresh_token'})).called(1);
    verify(() => mockStorage.write(key: 'access_token', value: 'new_access_token')).called(1);
    verify(() => mockStorage.write(key: 'refresh_token', value: 'new_refresh_token')).called(1);
  });

  test('throws and clears single-flight future when refresh fails', () async {
    when(() => mockStorage.read(key: 'refresh_token'))
        .thenAnswer((_) async => 'expired_refresh_token');
    when(() => mockRefreshDio.post('/auth/refresh', data: any(named: 'data')))
        .thenThrow(DioException(
          requestOptions: RequestOptions(path: '/auth/refresh'),
          response: Response(
            statusCode: 401,
            requestOptions: RequestOptions(path: '/auth/refresh'),
          ),
        ));

    await expectLater(
      () => coordinator.refreshAccessToken(),
      throwsA(isA<DioException>()),
    );

    // Verify subsequent call attempts a new refresh (future was reset to null)
    when(() => mockRefreshDio.post('/auth/refresh', data: any(named: 'data')))
        .thenAnswer((_) async => Response(
              requestOptions: RequestOptions(path: '/auth/refresh'),
              data: {
                'data': {
                  'access_token': 'recovered_access_token',
                  'refresh_token': 'recovered_refresh_token',
                }
              },
            ));
    when(() => mockStorage.write(key: any(named: 'key'), value: any(named: 'value')))
        .thenAnswer((_) async {});

    final secondAttempt = await coordinator.refreshAccessToken();
    expect(secondAttempt, 'recovered_access_token');
    verify(() => mockRefreshDio.post('/auth/refresh', data: {'refresh_token': 'expired_refresh_token'})).called(2);
  });
}
