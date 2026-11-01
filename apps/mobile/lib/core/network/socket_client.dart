import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:socket_io_client/socket_io_client.dart' as socket_io;
import 'package:secure_cbt_mobile/core/logger/logger.dart';
import 'package:secure_cbt_mobile/core/network/server_config_provider.dart';

const _defaultSocketBaseUrl = String.fromEnvironment(
  'API_URL',
  defaultValue: 'http://10.0.2.2:3000',
);

class MonitoringSocket {
  final String _socketBaseUrl;
  socket_io.Socket? _socket;

  MonitoringSocket({String? serverUrl})
      : _socketBaseUrl = serverUrl ?? _defaultSocketBaseUrl;

  void Function(Map<String, dynamic> data)? _onBroadcast;
  void Function(Map<String, dynamic> data)? _onForceSubmit;
  void Function(Map<String, dynamic> data)? _onTimeExtended;
  void Function(Map<String, dynamic> data)? _onWarningsReset;
  void Function(Map<String, dynamic> data)? _onWarningsAdjusted;
  void Function(Map<String, dynamic> data)? _onSessionUnlocked;
  void Function(Map<String, dynamic> data)? _onSessionReopened;
  void Function(Map<String, dynamic> data)? _onAttemptGranted;

  bool get isConnected => _socket?.connected ?? false;

  void setOnBroadcast(void Function(Map<String, dynamic> data)? callback) {
    _onBroadcast = callback;
  }

  void setOnForceSubmit(void Function(Map<String, dynamic> data)? callback) {
    _onForceSubmit = callback;
  }

  void setOnTimeExtended(void Function(Map<String, dynamic> data)? callback) {
    _onTimeExtended = callback;
  }

  void setOnWarningsReset(void Function(Map<String, dynamic> data)? callback) {
    _onWarningsReset = callback;
  }

  void setOnWarningsAdjusted(void Function(Map<String, dynamic> data)? callback) {
    _onWarningsAdjusted = callback;
  }

  void setOnSessionUnlocked(void Function(Map<String, dynamic> data)? callback) {
    _onSessionUnlocked = callback;
  }

  void setOnSessionReopened(void Function(Map<String, dynamic> data)? callback) {
    _onSessionReopened = callback;
  }

  void setOnAttemptGranted(void Function(Map<String, dynamic> data)? callback) {
    _onAttemptGranted = callback;
  }

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

    _socket?.on('exam.broadcast', (data) {
      AppLogger.info('Monitoring socket received broadcast: $data');
      if (data is Map) {
        _onBroadcast?.call(Map<String, dynamic>.from(data));
      }
    });

    _socket?.on('session.force_submit', (data) {
      AppLogger.warn('Monitoring socket received force submit: $data');
      if (data is Map) {
        _onForceSubmit?.call(Map<String, dynamic>.from(data));
      } else {
        _onForceSubmit?.call({});
      }
    });

    _socket?.on('session.time_extended', (data) {
      AppLogger.info('Monitoring socket received time extended: $data');
      if (data is Map) {
        _onTimeExtended?.call(Map<String, dynamic>.from(data));
      }
    });

    _socket?.on('session.warnings_reset', (data) {
      AppLogger.info('Monitoring socket received warnings reset: $data');
      if (data is Map) {
        _onWarningsReset?.call(Map<String, dynamic>.from(data));
      } else {
        _onWarningsReset?.call({});
      }
    });

    _socket?.on('session.warnings_adjusted', (data) {
      AppLogger.info('Monitoring socket received warnings adjusted: $data');
      if (data is Map) {
        _onWarningsAdjusted?.call(Map<String, dynamic>.from(data));
      }
    });

    _socket?.on('session.unlocked', (data) {
      AppLogger.info('Monitoring socket received session unlocked: $data');
      if (data is Map) {
        _onSessionUnlocked?.call(Map<String, dynamic>.from(data));
      } else {
        _onSessionUnlocked?.call({});
      }
    });

    _socket?.on('session.reopened', (data) {
      AppLogger.info('Monitoring socket received session reopened: $data');
      if (data is Map) {
        _onSessionReopened?.call(Map<String, dynamic>.from(data));
      } else {
        _onSessionReopened?.call({});
      }
    });

    _socket?.on('session.attempt_granted', (data) {
      AppLogger.info('Monitoring socket received session attempt granted: $data');
      if (data is Map) {
        _onAttemptGranted?.call(Map<String, dynamic>.from(data));
      } else {
        _onAttemptGranted?.call({});
      }
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
  final serverConfig = ref.watch(serverConfigProvider);
  return MonitoringSocket(serverUrl: serverConfig.socketBaseUrl);
});
