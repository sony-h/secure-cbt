import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:dio/dio.dart';
import 'package:secure_cbt_mobile/core/network/dio_client.dart';
import 'package:secure_cbt_mobile/features/auth/providers/auth_provider.dart';

class TokenScreen extends ConsumerStatefulWidget {
  final String? examTitle;

  const TokenScreen({super.key, this.examTitle});

  @override
  ConsumerState<TokenScreen> createState() => _TokenScreenState();
}

class _TokenScreenState extends ConsumerState<TokenScreen> {
  final _tokenController = TextEditingController();
  bool _isLoading = false;

  @override
  void initState() {
    super.initState();
    // Check if already authenticated
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final auth = ref.read(authProvider);
      if (!auth.isAuthenticated) {
        context.goNamed('login');
      }
    });
  }

  @override
  void dispose() {
    _tokenController.dispose();
    super.dispose();
  }

  Future<void> _startExam() async {
    final token = _tokenController.text.trim().toUpperCase();
    if (token.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Masukkan token ujian')),
      );
      return;
    }

    setState(() => _isLoading = true);
    try {
      final dio = ref.read(dioProvider);
      final response = await dio.post('/sessions/start', data: {
        'token': token,
        'device_id': 'android_${DateTime.now().millisecondsSinceEpoch}',
      });

      final session = response.data['data'];
      final examTitle = session['exam']?['title'] ?? 'Ujian';

      if (mounted) {
        context.goNamed('exam', extra: {
          'sessionId': session['id'],
          'examTitle': examTitle,
        });
      }
    } on DioException catch (e) {
      final message = e.response?.data?['message'] ?? 'Token tidak valid atau sudah kadaluarsa';
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(message), backgroundColor: Colors.red),
        );
      }
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Ujian'),
        actions: [
          IconButton(
            icon: const Icon(Icons.logout),
            onPressed: () async {
              await ref.read(authProvider.notifier).logout();
              if (context.mounted) context.goNamed('login');
            },
          ),
        ],
      ),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Icon(
                Icons.vpn_key,
                size: 64,
                color: Theme.of(context).colorScheme.primary,
              ),
              const SizedBox(height: 24),
              if (widget.examTitle != null) ...[
                Text(
                  widget.examTitle!,
                  textAlign: TextAlign.center,
                  style: Theme.of(context).textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.w600,
                    color: Theme.of(context).colorScheme.primary,
                  ),
                ),
                const SizedBox(height: 8),
              ],
              Text(
                'Masukkan Token Ujian',
                textAlign: TextAlign.center,
                style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 8),
              Text(
                'Token diberikan oleh pengawas ujian',
                textAlign: TextAlign.center,
                style: TextStyle(color: Colors.grey[600]),
              ),
              const SizedBox(height: 32),

              // Token input
              TextFormField(
                controller: _tokenController,
                textAlign: TextAlign.center,
                textCapitalization: TextCapitalization.characters,
                style: const TextStyle(fontSize: 24, letterSpacing: 4, fontWeight: FontWeight.bold),
                decoration: InputDecoration(
                  hintText: 'XXXXXXXX',
                  hintStyle: TextStyle(
                    fontSize: 24,
                    letterSpacing: 4,
                    color: Colors.grey[400],
                  ),
                ),
                maxLength: 8,
                onFieldSubmitted: (_) => _startExam(),
              ),
              const SizedBox(height: 24),

              ElevatedButton(
                onPressed: _isLoading ? null : _startExam,
                child: _isLoading
                    ? const SizedBox(
                        height: 20,
                        width: 20,
                        child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                      )
                    : const Text('MULAI UJIAN'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
