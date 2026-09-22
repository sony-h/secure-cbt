import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:socket_io_client/socket_io_client.dart' as socket_io;
import 'package:secure_cbt_mobile/core/logger/logger.dart';

const _socketBaseUrl = String.fromEnvironment(
  'API_URL',
  defaultValue: 'http://10.0.2.2:3000',
);

class MonitoringSocket {
  socket_io.Socket? _socket;

  bool get isConnected => _socket?.connected ?? false;

  Future<void> connect(String userId, String examId, {String? studentName}) async {
    disconnect();

    const storage = FlutterSecureStorage();
    final token = await storage.read(key: 'access_token');

    _socket = socket_io.io(
      '$_socketBaseUrl/monitoring',
      socket_io.OptionBuilder()
          .setTransports(['websocket'])
          .setAuth({'token': token ?? ''})
          .setQuery({'role': 'student', 'userId': userId, 'examId': examId})
          .build(),
    );

    _socket?.onConnect((_) {
      AppLogger.debug('Monitoring socket connected');
      _socket?.emit('student.connected', {
        'studentId': userId,
        'studentName': studentName ?? '',
        'examId': examId,
        'deviceId': 'android_${DateTime.now().millisecondsSinceEpoch}',
        'timestamp': DateTime.now().toUtc().toIso8601String(),
      });
    });

    _socket?.onDisconnect((_) {
      AppLogger.debug('Monitoring socket disconnected');
    });

    _socket?.onError((err) {
      AppLogger.error('Monitoring socket error', err);
    });

    _socket?.connect();
  }

  void emitAnswerSaved(String sessionId, String questionId, String examId) {
    if (_socket?.connected != true) return;
    _socket?.emit('answer.saved', {
      'sessionId': sessionId,
      'questionId': questionId,
      'examId': examId,
    });
  }

  void emitExamSubmitted(String sessionId, String examId, String studentId, {String? studentName}) {
    if (_socket?.connected != true) return;
    _socket?.emit('exam.submitted', {
      'sessionId': sessionId,
      'examId': examId,
      'studentId': studentId,
      'studentName': studentName ?? '',
    });
  }

  void emitViolation(String examId, int warningCount, String event, String sessionId, {String? studentName}) {
    if (_socket?.connected != true) return;
    _socket?.emit('warning.triggered', {
      'sessionId': sessionId,
      'examId': examId,
      'studentId': '',
      'studentName': studentName ?? '',
      'warningCount': warningCount,
      'event': event,
      'timestamp': DateTime.now().toUtc().toIso8601String(),
    });
  }

  void disconnect() {
    if (_socket != null) {
      _socket?.disconnect();
      _socket?.dispose();
      _socket = null;
    }
  }
}

final monitoringSocketProvider = Provider<MonitoringSocket>((ref) {
  return MonitoringSocket();
});
