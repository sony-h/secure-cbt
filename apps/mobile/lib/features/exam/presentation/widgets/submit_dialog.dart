import 'package:flutter/material.dart';

Future<bool?> showSubmitDialog(
  BuildContext context, {
  required int answered,
  required int total,
}) {
  return showDialog<bool>(
    context: context,
    builder: (ctx) => AlertDialog(
      title: const Text('Submit Exam?'),
      content: Text(
        answered < total
            ? 'You have answered $answered of $total questions. Are you sure you want to submit?'
            : 'All questions have been answered. Submit now?',
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.pop(ctx, false),
          child: const Text('CANCEL'),
        ),
        TextButton(
          onPressed: () => Navigator.pop(ctx, true),
          child: const Text('SUBMIT', style: TextStyle(color: Colors.red)),
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
      title: const Text('Submit Exam?'),
      content: const Text('Your answers will be submitted and cannot be changed.'),
      actions: [
        TextButton(
          onPressed: () => Navigator.pop(ctx, false),
          child: const Text('CANCEL'),
        ),
        TextButton(
          onPressed: () => Navigator.pop(ctx, true),
          child: const Text('SUBMIT', style: TextStyle(color: Colors.red)),
        ),
      ],
    ),
  );
}
