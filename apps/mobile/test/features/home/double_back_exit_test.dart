import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:secure_cbt_mobile/core/theme/theme.dart';

class DoubleBackExitWrapper extends StatefulWidget {
  final Widget child;

  const DoubleBackExitWrapper({super.key, required this.child});

  @override
  State<DoubleBackExitWrapper> createState() => _DoubleBackExitWrapperState();
}

class _DoubleBackExitWrapperState extends State<DoubleBackExitWrapper> {
  DateTime? _lastBackPressTime;

  void _handlePopInvoked(bool didPop) {
    if (didPop) return;
    final now = DateTime.now();
    if (_lastBackPressTime == null ||
        now.difference(_lastBackPressTime!) > const Duration(seconds: 2)) {
      _lastBackPressTime = now;
      ScaffoldMessenger.of(context).hideCurrentSnackBar();
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: const Text('Tekan sekali lagi untuk keluar dari aplikasi'),
          duration: const Duration(seconds: 2),
          behavior: SnackBarBehavior.floating,
          backgroundColor: AppColors.textPrimary,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return PopScope(
      canPop: false,
      onPopInvokedWithResult: (didPop, result) => _handlePopInvoked(didPop),
      child: widget.child,
    );
  }
}

void main() {
  testWidgets('DoubleBackExitWrapper shows snackbar on first back press', (tester) async {
    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: DoubleBackExitWrapper(
            child: const Center(child: Text('Home Content')),
          ),
        ),
      ),
    );

    // Simulate back button press via pop scope
    final popScope = tester.widget<PopScope<Object?>>(find.byWidgetPredicate((w) => w is PopScope));
    popScope.onPopInvokedWithResult!(false, null);
    await tester.pumpAndSettle();

    expect(find.text('Tekan sekali lagi untuk keluar dari aplikasi'), findsOneWidget);
  });
}
