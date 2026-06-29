import 'package:flutter/material.dart';

Future<bool?> showSubmitDialog(
  BuildContext context, {
  required int answered,
  required int total,
  bool isWarning = false,
}) {
  final String body;
  if (isWarning) {
    body = 'Meninggalkan layar ini akan mengumpulkan ujian. Yakin?';
  } else {
    body = answered < total
        ? 'Kamu baru menjawab $answered dari $total soal. Yakin ingin mengumpulkan?'
        : 'Semua soal sudah terjawab. Kumpulkan sekarang?';
  }

  return showDialog<bool>(
    context: context,
    builder: (ctx) => AlertDialog(
      title: const Text('Kumpulkan Ujian?'),
      content: Text(body),
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
