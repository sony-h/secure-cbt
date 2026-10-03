import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:secure_cbt_mobile/app/app.dart';

void main() {
  testWidgets('Secure CBT app launches smoke test', (WidgetTester tester) async {
    await tester.pumpWidget(
      const ProviderScope(
        child: SecureCbtApp(),
      ),
    );
    await tester.pump();
    expect(find.byType(SecureCbtApp), findsOneWidget);
  });
}
