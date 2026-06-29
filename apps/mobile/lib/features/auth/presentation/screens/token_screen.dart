import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:dio/dio.dart';
import 'package:secure_cbt_mobile/app/route_names.dart';
import 'package:secure_cbt_mobile/core/network/dio_client.dart';
import 'package:secure_cbt_mobile/features/auth/providers/auth_provider.dart';

class TokenScreen extends ConsumerStatefulWidget {
  final String? examTitle;
  final String? examId;

  const TokenScreen({super.key, this.examTitle, this.examId});

  @override
  ConsumerState<TokenScreen> createState() => _TokenScreenState();
}

class _TokenScreenState extends ConsumerState<TokenScreen> {
  final _tokenController = TextEditingController();
  bool _isLoading = false;
  bool _rulesAgreed = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final auth = ref.read(authProvider);
      if (!auth.isAuthenticated) {
        context.goNamed(RouteNames.login);
      }
    });
  }

  @override
  void dispose() {
    _tokenController.dispose();
    super.dispose();
  }

  Future<void> _startExam() async {
    if (!_rulesAgreed) return;

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
        if (widget.examId != null) 'exam_id': widget.examId,
      });

      final session = response.data['data'];
      final examTitle = session['exam']?['title'] ?? 'Ujian';

      if (mounted) {
        context.goNamed(RouteNames.exam, extra: {
          'sessionId': session['id'],
          'examTitle': examTitle,
        });
      }
    } on DioException catch (e) {
      final message = e.response?.data?['message'] ?? 'Token tidak valid atau sudah kadaluarsa';
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(message), backgroundColor: Colors.red.shade700),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(e.toString()), backgroundColor: Colors.red.shade700),
        );
      }
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Scaffold(
      backgroundColor: theme.scaffoldBackgroundColor,
      appBar: AppBar(
        title: const Text('Persiapan Ujian', style: TextStyle(fontWeight: FontWeight.bold)),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new_rounded, size: 20),
          onPressed: () => context.goNamed(RouteNames.exams),
        ),
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Card(
                elevation: 0,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(16),
                  side: const BorderSide(color: Color(0xFFE2E8F0)),
                ),
                child: Padding(
                  padding: const EdgeInsets.all(20),
                  child: Column(
                    children: [
                      Icon(Icons.assignment_turned_in_rounded, size: 48, color: theme.colorScheme.primary),
                      const SizedBox(height: 12),
                      Text(
                        widget.examTitle ?? 'Informasi Ujian',
                        textAlign: TextAlign.center,
                        style: theme.textTheme.titleMedium?.copyWith(
                          fontWeight: FontWeight.bold,
                          color: const Color(0xFF0F172A),
                        ),
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 20),
              Text(
                'Peraturan & Petunjuk Ujian',
                style: theme.textTheme.titleSmall?.copyWith(
                  fontWeight: FontWeight.bold,
                  color: const Color(0xFF334155),
                ),
              ),
              const SizedBox(height: 10),
              Card(
                color: const Color(0xFFF8FAFC),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                  side: const BorderSide(color: Color(0xFFE2E8F0)),
                ),
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: const [
                      _RuleItem(text: 'Dilarang keluar dari layar penuh / meminimalkan aplikasi.'),
                      _RuleItem(text: 'Aplikasi akan otomatis mengunci dalam mode kiosk (Lock Task).'),
                      _RuleItem(text: 'Pelanggaran/membuka aplikasi lain akan dicatat sebagai kecurangan.'),
                      _RuleItem(text: 'Jawaban disimpan otomatis (auto-save) setiap beberapa detik.'),
                      _RuleItem(text: 'Jika batas pelanggaran terlampaui, ujian akan otomatis dikumpulkan.'),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 24),
              Text(
                'Masukkan Token Ujian',
                style: theme.textTheme.titleSmall?.copyWith(
                  fontWeight: FontWeight.bold,
                  color: const Color(0xFF334155),
                ),
              ),
              const SizedBox(height: 8),
              TextFormField(
                controller: _tokenController,
                textAlign: TextAlign.center,
                textCapitalization: TextCapitalization.characters,
                style: const TextStyle(fontSize: 22, letterSpacing: 6, fontWeight: FontWeight.bold, color: Color(0xFF0F172A)),
                decoration: const InputDecoration(
                  hintText: 'XXXXXXXX',
                  hintStyle: TextStyle(fontSize: 22, letterSpacing: 6, color: Color(0xFF9E9E9E)),
                  counterText: '',
                ),
                maxLength: 8,
                onFieldSubmitted: (_) => _startExam(),
              ),
              const SizedBox(height: 20),
              CheckboxListTile(
                value: _rulesAgreed,
                onChanged: (val) => setState(() => _rulesAgreed = val ?? false),
                title: Text(
                  'Saya telah membaca dan memahami seluruh peraturan ujian di atas.',
                  style: theme.textTheme.bodySmall?.copyWith(color: const Color(0xFF475569), fontWeight: FontWeight.w500),
                ),
                controlAffinity: ListTileControlAffinity.leading,
                contentPadding: EdgeInsets.zero,
                dense: true,
                activeColor: theme.colorScheme.primary,
              ),
              const SizedBox(height: 16),
              ElevatedButton(
                onPressed: (_isLoading || !_rulesAgreed) ? null : _startExam,
                style: ElevatedButton.styleFrom(
                  backgroundColor: theme.colorScheme.primary,
                  foregroundColor: Colors.white,
                  disabledBackgroundColor: Colors.grey.shade300,
                  disabledForegroundColor: Colors.grey.shade500,
                ),
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

class _RuleItem extends StatelessWidget {
  final String text;
  const _RuleItem({required this.text});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('• ', style: TextStyle(fontWeight: FontWeight.bold, color: Theme.of(context).colorScheme.primary)),
          Expanded(
            child: Text(
              text,
              style: const TextStyle(fontSize: 13, height: 1.4, color: Color(0xFF475569)),
            ),
          ),
        ],
      ),
    );
  }
}
