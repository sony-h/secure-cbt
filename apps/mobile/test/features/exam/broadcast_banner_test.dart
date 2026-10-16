import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:secure_cbt_mobile/features/exam/presentation/screens/exam_screen.dart';

void main() {
  testWidgets('ExamBroadcastBanner displays general announcement correctly', (tester) async {
    bool dismissed = false;

    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: ExamBroadcastBanner(
            message: 'Sisa waktu 15 menit',
            urgency: 'low',
            isPersonal: false,
            onDismiss: () => dismissed = true,
          ),
        ),
      ),
    );

    expect(find.text('PENGUMUMAN PENGAWAS'), findsOneWidget);
    expect(find.text('Sisa waktu 15 menit'), findsOneWidget);
    expect(find.text('PRIBADI'), findsNothing);

    // Tap dismiss button
    await tester.tap(find.byType(IconButton));
    expect(dismissed, isTrue);
  });

  testWidgets('ExamBroadcastBanner displays targeted personal message with PRIBADI badge', (tester) async {
    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: ExamBroadcastBanner(
            message: 'Tolong jangan menoleh ke kanan',
            urgency: 'low',
            isPersonal: true,
            onDismiss: () {},
          ),
        ),
      ),
    );

    expect(find.text('PESAN KHUSUS UNTUK ANDA'), findsOneWidget);
    expect(find.text('PRIBADI'), findsOneWidget);
    expect(find.text('Tolong jangan menoleh ke kanan'), findsOneWidget);
  });

  testWidgets('ExamBroadcastBanner displays urgent personal warning', (tester) async {
    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: ExamBroadcastBanner(
            message: 'Peringatan keras: Anda terdeteksi membuka tab lain!',
            urgency: 'high',
            isPersonal: true,
            onDismiss: () {},
          ),
        ),
      ),
    );

    expect(find.text('PESAN PRIBADI PENGAWAS'), findsOneWidget);
    expect(find.text('PRIBADI'), findsOneWidget);
    expect(find.text('Peringatan keras: Anda terdeteksi membuka tab lain!'), findsOneWidget);
  });
}
