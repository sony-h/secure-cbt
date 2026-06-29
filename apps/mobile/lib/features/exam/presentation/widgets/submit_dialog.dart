import 'package:flutter/material.dart';

Future<bool?> showSubmitDialog(
  BuildContext context, {
  required int answered,
  required int total,
}) {
  return showDialog<bool>(
    context: context,
    builder: (ctx) => AlertDialog(
      title: const Text('Kumpulkan Ujian?'),
      content: Text(
        answered < total
            ? 'Kamu baru menjawab $answered dari $total soal. Yakin ingin mengumpulkan?'
            : 'Semua soal sudah terjawab. Kumpulkan sekarang?',
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.pop(ctx, false),
          child: const Text('BATAL'),
        ),
        TextButton(
          onPressed: () => Navigator.pop(ctx, true),
          child: const Text('KUMPULKAN', style: TextStyle(color: Colors.red)),
        ),
      ],
    ),
  );
}

Future<bool?> showWarningSubmitDialog(
  BuildContext context,
) {
  return showDialog<bool>(
    context: context,
    builder: (ctx) => AlertDialog(
      title: const Text('Kumpulkan Ujian?'),
      content: const Text('Jawaban akan dikumpulkan dan tidak dapat diubah.'),
      actions: [
        TextButton(
          onPressed: () => Navigator.pop(ctx, false),
          child: const Text('BATAL'),
        ),
        TextButton(
          onPressed: () => Navigator.pop(ctx, true),
          child: const Text('KUMPULKAN', style: TextStyle(color: Colors.red)),
        ),
      ],
    ),
  );
}
