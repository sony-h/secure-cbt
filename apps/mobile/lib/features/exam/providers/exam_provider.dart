import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:secure_cbt_mobile/core/database/database_provider.dart';
import 'package:secure_cbt_mobile/features/exam/providers/exam_notifier.dart';
import 'package:secure_cbt_mobile/features/exam/providers/exam_state.dart';

final examProvider = StateNotifierProvider<ExamNotifier, ExamState>((ref) {
  final db = ref.watch(localDatabaseProvider);
  return ExamNotifier(db);
});
