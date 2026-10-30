import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:secure_cbt_mobile/features/exam/presentation/widgets/exam_notification_banner.dart';

void main() {
  testWidgets('ExamNotificationBanner renders timeAdded theme with badge and message', (tester) async {
    bool dismissed = false;

    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: ExamNotificationBanner(
            type: ExamNotificationBannerType.timeAdded,
            title: 'WAKTU UJIAN DITAMBAH',
            message: 'Pengawas menambahkan 10 menit waktu pengerjaan',
            badgeText: 'KOMPENSASI',
            onDismiss: () => dismissed = true,
          ),
        ),
      ),
    );

    expect(find.text('WAKTU UJIAN DITAMBAH'), findsOneWidget);
    expect(find.text('Pengawas menambahkan 10 menit waktu pengerjaan'), findsOneWidget);
    expect(find.text('KOMPENSASI'), findsOneWidget);

    await tester.tap(find.byType(IconButton));
    expect(dismissed, isTrue);
  });

  testWidgets('ExamNotificationBanner renders timeReduced theme with PENALTI badge', (tester) async {
    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: ExamNotificationBanner(
            type: ExamNotificationBannerType.timeReduced,
            title: 'WAKTU UJIAN DIKURANGI',
            message: 'Pengawas mengurangi 5 menit waktu pengerjaan',
            badgeText: 'PENALTI',
            onDismiss: () {},
          ),
        ),
      ),
    );

    expect(find.text('WAKTU UJIAN DIKURANGI'), findsOneWidget);
    expect(find.text('PENALTI'), findsOneWidget);
    expect(find.text('Pengawas mengurangi 5 menit waktu pengerjaan'), findsOneWidget);
  });

  testWidgets('ExamNotificationBanner renders strikePenalty theme with +1 STRIKE badge', (tester) async {
    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: ExamNotificationBanner(
            type: ExamNotificationBannerType.strikePenalty,
            title: 'SANKSI PELANGGARAN',
            message: 'Poin pelanggaran Anda bertambah (+1)',
            badgeText: '+1 STRIKE',
            onDismiss: () {},
          ),
        ),
      ),
    );

    expect(find.text('SANKSI PELANGGARAN'), findsOneWidget);
    expect(find.text('+1 STRIKE'), findsOneWidget);
    expect(find.text('Poin pelanggaran Anda bertambah (+1)'), findsOneWidget);
  });

  testWidgets('ExamNotificationBanner renders strikeMercy theme with -1 STRIKE badge', (tester) async {
    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: ExamNotificationBanner(
            type: ExamNotificationBannerType.strikeMercy,
            title: 'KERINGANAN STRIKE',
            message: 'Pengawas memberikan keringanan (-1 strike)',
            badgeText: '-1 STRIKE',
            onDismiss: () {},
          ),
        ),
      ),
    );

    expect(find.text('KERINGANAN STRIKE'), findsOneWidget);
    expect(find.text('-1 STRIKE'), findsOneWidget);
  });

  testWidgets('ExamNotificationBanner renders strikeReset theme with 0 STRIKE badge', (tester) async {
    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: ExamNotificationBanner(
            type: ExamNotificationBannerType.strikeReset,
            title: 'RESET POIN PELANGGARAN',
            message: 'Poin pelanggaran Anda direset ke 0',
            badgeText: '0 STRIKE',
            onDismiss: () {},
          ),
        ),
      ),
    );

    expect(find.text('RESET POIN PELANGGARAN'), findsOneWidget);
    expect(find.text('0 STRIKE'), findsOneWidget);
  });

  testWidgets('ExamNotificationBanner renders deviceUnlocked theme with PULIH badge', (tester) async {
    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: ExamNotificationBanner(
            type: ExamNotificationBannerType.deviceUnlocked,
            title: 'KUNCI PERANGKAT DIBUKA',
            message: 'Perangkat dan sesi Anda berhasil dibuka kembali',
            badgeText: 'PULIH',
            onDismiss: () {},
          ),
        ),
      ),
    );

    expect(find.text('KUNCI PERANGKAT DIBUKA'), findsOneWidget);
    expect(find.text('PULIH'), findsOneWidget);
  });

  testWidgets('ExamNotificationBanner auto-dismisses after duration', (tester) async {
    bool dismissed = false;

    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: ExamNotificationBanner(
            type: ExamNotificationBannerType.timeAdded,
            title: 'AUTO DISMISS TEST',
            message: 'Banner will close',
            autoDismissDuration: const Duration(seconds: 2),
            onDismiss: () => dismissed = true,
          ),
        ),
      ),
    );

    expect(dismissed, isFalse);
    await tester.pump(const Duration(seconds: 1));
    expect(dismissed, isFalse);
    await tester.pump(const Duration(seconds: 2));
    expect(dismissed, isTrue);
  });
}
