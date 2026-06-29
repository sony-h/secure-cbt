import 'package:intl/intl.dart';

const _wibOffset = Duration(hours: 7);

DateTime toWIB(DateTime utc) => utc.add(_wibOffset);

String formatDateTimeWIB(DateTime utc) {
  final wib = toWIB(utc);
  return '${DateFormat('dd MMMM yyyy, HH:mm', 'id_ID').format(wib)} WIB';
}

String formatDateWIB(DateTime utc) {
  final wib = toWIB(utc);
  return '${DateFormat('dd MMMM yyyy', 'id_ID').format(wib)} WIB';
}

String formatDateShortWIB(DateTime utc) {
  final wib = toWIB(utc);
  final months = [
    'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
    'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des',
  ];
  return '${wib.day} ${months[wib.month - 1]} ${wib.year}';
}

String formatDuration(int minutes) {
  if (minutes >= 60) {
    final h = minutes ~/ 60;
    final m = minutes % 60;
    return m > 0 ? '$h jam $m mnt' : '$h jam';
  }
  return '$minutes mnt';
}

String formatDetailDuration(int minutes) {
  if (minutes >= 60) {
    final h = minutes ~/ 60;
    final m = minutes % 60;
    return m > 0 ? '$h jam $m menit' : '$h jam';
  }
  return '$minutes menit';
}
