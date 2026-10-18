import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:mocktail/mocktail.dart';
import 'package:secure_cbt_mobile/core/network/server_config_provider.dart';

class MockFlutterSecureStorage extends Mock implements FlutterSecureStorage {}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  late MockFlutterSecureStorage mockStorage;

  setUp(() {
    mockStorage = MockFlutterSecureStorage();
  });

  group('sanitizeServerUrl', () {
    test('adds http:// when missing scheme', () {
      expect(sanitizeServerUrl('192.168.1.50:3000'), 'http://192.168.1.50:3000');
    });

    test('preserves https scheme and removes trailing slashes', () {
      expect(sanitizeServerUrl('https://cbt.sekolah.sch.id///'), 'https://cbt.sekolah.sch.id');
    });

    test('strips /api/v1 suffix if user entered it', () {
      expect(sanitizeServerUrl('http://192.168.1.50:3000/api/v1'), 'http://192.168.1.50:3000');
      expect(sanitizeServerUrl('http://192.168.1.50:3000/api/v1/'), 'http://192.168.1.50:3000');
    });

    test('returns defaultApiHost on empty or whitespace string', () {
      expect(sanitizeServerUrl('   '), defaultApiHost);
    });
  });

  group('ServerConfigNotifier', () {
    test('initializes with defaultApiHost when storage is empty', () async {
      when(() => mockStorage.read(key: ServerConfigNotifier.storageKey))
          .thenAnswer((_) async => null);

      final notifier = ServerConfigNotifier(mockStorage);
      expect(notifier.state.apiHost, defaultApiHost);
      expect(notifier.state.isCustom, false);
      expect(notifier.state.baseUrl, '$defaultApiHost/api/v1');
    });

    test('loads saved custom URL on initialization', () async {
      when(() => mockStorage.read(key: ServerConfigNotifier.storageKey))
          .thenAnswer((_) async => 'http://192.168.0.200:3000');

      final notifier = ServerConfigNotifier(mockStorage);
      await pumpEventQueue();

      expect(notifier.state.apiHost, 'http://192.168.0.200:3000');
      expect(notifier.state.isCustom, true);
      expect(notifier.state.baseUrl, 'http://192.168.0.200:3000/api/v1');
    });

    test('setServerUrl sanitizes, persists, and updates state', () async {
      when(() => mockStorage.read(key: ServerConfigNotifier.storageKey))
          .thenAnswer((_) async => null);
      when(() => mockStorage.write(
            key: ServerConfigNotifier.storageKey,
            value: 'http://10.10.10.10:8000',
          )).thenAnswer((_) async => {});

      final notifier = ServerConfigNotifier(mockStorage);
      await notifier.setServerUrl('10.10.10.10:8000/api/v1/');

      expect(notifier.state.apiHost, 'http://10.10.10.10:8000');
      expect(notifier.state.isCustom, true);
      verify(() => mockStorage.write(
            key: ServerConfigNotifier.storageKey,
            value: 'http://10.10.10.10:8000',
          )).called(1);
    });

    test('resetToDefault deletes storage key and reverts state', () async {
      when(() => mockStorage.read(key: ServerConfigNotifier.storageKey))
          .thenAnswer((_) async => 'http://custom:3000');
      when(() => mockStorage.delete(key: ServerConfigNotifier.storageKey))
          .thenAnswer((_) async => {});

      final notifier = ServerConfigNotifier(mockStorage);
      await pumpEventQueue();

      await notifier.resetToDefault();
      expect(notifier.state.apiHost, defaultApiHost);
      expect(notifier.state.isCustom, false);
      verify(() => mockStorage.delete(key: ServerConfigNotifier.storageKey)).called(1);
    });
  });

  group('resolveMediaUrl', () {
    test('handles null and empty', () {
      expect(resolveMediaUrl(null), '');
      expect(resolveMediaUrl(''), '');
    });

    test('preserves absolute URLs', () {
      expect(resolveMediaUrl('http://cdn.com/img.png'), 'http://cdn.com/img.png');
      expect(resolveMediaUrl('https://cdn.com/img.png'), 'https://cdn.com/img.png');
    });

    test('resolves relative URLs against active host', () async {
      when(() => mockStorage.read(key: ServerConfigNotifier.storageKey))
          .thenAnswer((_) async => 'http://192.168.1.99:3000');

      final notifier = ServerConfigNotifier(mockStorage);
      await pumpEventQueue();

      expect(resolveMediaUrl('/uploads/image.png'), 'http://192.168.1.99:3000/uploads/image.png');
      expect(resolveMediaUrl('uploads/image.png'), 'http://192.168.1.99:3000/uploads/image.png');
    });
  });
}
