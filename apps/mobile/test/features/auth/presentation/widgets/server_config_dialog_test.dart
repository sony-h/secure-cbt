import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:secure_cbt_mobile/core/network/server_config_provider.dart';
import 'package:secure_cbt_mobile/features/auth/presentation/widgets/server_config_dialog.dart';

class MockFlutterSecureStorage extends Mock implements FlutterSecureStorage {}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  late MockFlutterSecureStorage mockStorage;

  setUp(() {
    mockStorage = MockFlutterSecureStorage();
    when(() => mockStorage.read(key: ServerConfigNotifier.storageKey))
        .thenAnswer((_) async => null);
  });

  Widget buildTestableWidget(Widget child, {ServerConfigNotifier? notifier}) {
    return ProviderScope(
      overrides: [
        if (notifier != null)
          serverConfigProvider.overrideWith((ref) => notifier),
      ],
      child: MaterialApp(
        home: Scaffold(
          body: Builder(
            builder: (context) => ElevatedButton(
              onPressed: () => showDialog(
                context: context,
                builder: (_) => const ServerConfigDialog(),
              ),
              child: const Text('Open Dialog'),
            ),
          ),
        ),
      ),
    );
  }

  testWidgets('ServerConfigDialog renders input field and current host', (tester) async {
    final notifier = ServerConfigNotifier(mockStorage);
    await tester.pumpWidget(buildTestableWidget(const SizedBox(), notifier: notifier));

    await tester.tap(find.text('Open Dialog'));
    await tester.pumpAndSettle();

    expect(find.text('Pengaturan Server CBT'), findsOneWidget);
    expect(find.byType(TextField), findsOneWidget);
    expect(find.text('Tes Koneksi'), findsOneWidget);
    expect(find.text('Simpan'), findsOneWidget);
  });

  testWidgets('Saving new URL updates serverConfigProvider', (tester) async {
    when(() => mockStorage.write(
          key: ServerConfigNotifier.storageKey,
          value: 'http://192.168.1.100:3000',
        )).thenAnswer((_) async => {});

    final notifier = ServerConfigNotifier(mockStorage);
    await tester.pumpWidget(buildTestableWidget(const SizedBox(), notifier: notifier));

    await tester.tap(find.text('Open Dialog'));
    await tester.pumpAndSettle();

    final inputFinder = find.byType(TextField);
    await tester.enterText(inputFinder, '192.168.1.100:3000');
    await tester.tap(find.text('Simpan'));
    await tester.pumpAndSettle();

    expect(notifier.state.apiHost, 'http://192.168.1.100:3000');
    expect(notifier.state.isCustom, true);
  });
}
