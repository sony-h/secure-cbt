import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:dio/dio.dart';
import 'package:secure_cbt_mobile/app/route_names.dart';
import 'package:secure_cbt_mobile/core/network/dio_client.dart';
import 'package:secure_cbt_mobile/core/theme/theme.dart';
import 'package:secure_cbt_mobile/core/widgets/bouncing_button.dart';
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
  bool _tokenFocused = false;

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
        SnackBar(
          content: const Text('Masukkan token ujian terlebih dahulu'),
          backgroundColor: AppColors.error,
          behavior: SnackBarBehavior.floating,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
        ),
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
          SnackBar(
            content: Text(message),
            backgroundColor: AppColors.error,
            behavior: SnackBarBehavior.floating,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(e.toString()),
            backgroundColor: AppColors.error,
            behavior: SnackBarBehavior.floating,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final canSubmit = !_isLoading && _rulesAgreed && _tokenController.text.trim().isNotEmpty;

    return Scaffold(
      backgroundColor: AppColors.canvas,
      appBar: AppBar(
        title: const Text('Konfirmasi & Token'),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new_rounded, size: 18),
          onPressed: () => context.goNamed(RouteNames.exams),
        ),
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // Exam Header Card
              Container(
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(
                  color: AppColors.surface,
                  borderRadius: BorderRadius.circular(18),
                  border: Border.all(color: AppColors.border),
                  boxShadow: AppShadows.card,
                ),
                child: Column(
                  children: [
                    Container(
                      width: 52,
                      height: 52,
                      decoration: BoxDecoration(
                        color: AppColors.primaryContainer,
                        borderRadius: BorderRadius.circular(16),
                      ),
                      child: const Icon(
                        Icons.assignment_turned_in_rounded,
                        size: 28,
                        color: AppColors.primary,
                      ),
                    ),
                    const SizedBox(height: 12),
                    Text(
                      widget.examTitle ?? 'Informasi Ujian',
                      textAlign: TextAlign.center,
                      style: const TextStyle(
                        fontSize: 17,
                        fontWeight: FontWeight.w700,
                        letterSpacing: -0.3,
                        color: AppColors.textPrimary,
                      ),
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                    ),
                    const SizedBox(height: 6),
                    const Text(
                      'Pastikan Anda berada di ruang ujian resmi sebelum memulai.',
                      textAlign: TextAlign.center,
                      style: TextStyle(
                        fontSize: 12,
                        color: AppColors.textSecondary,
                        height: 1.4,
                      ),
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 22),

              // Rules Section
              const Text(
                'Peraturan & Tata Tertib',
                style: TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w700,
                  letterSpacing: -0.2,
                  color: AppColors.textPrimary,
                ),
              ),
              const SizedBox(height: 10),
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: AppColors.surface,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: AppColors.border),
                  boxShadow: AppShadows.card,
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: List.generate(_rules.length, (i) {
                    return Padding(
                      padding: EdgeInsets.only(bottom: i == _rules.length - 1 ? 0 : 12),
                      child: Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Container(
                            width: 22,
                            height: 22,
                            decoration: BoxDecoration(
                              color: AppColors.primaryContainer,
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: Center(
                              child: Text(
                                '${i + 1}',
                                style: const TextStyle(
                                  fontSize: 11,
                                  fontWeight: FontWeight.w700,
                                  color: AppColors.primary,
                                ),
                              ),
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Text(
                              _rules[i],
                              style: const TextStyle(
                                fontSize: 13,
                                height: 1.45,
                                color: AppColors.textSecondary,
                              ),
                            ),
                          ),
                        ],
                      ),
                    );
                  }),
                ),
              ),

              const SizedBox(height: 22),

              // Token Input Box
              const Text(
                'Masukkan Token Ujian',
                style: TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w700,
                  letterSpacing: -0.2,
                  color: AppColors.textPrimary,
                ),
              ),
              const SizedBox(height: 10),
              Focus(
                onFocusChange: (focused) => setState(() => _tokenFocused = focused),
                child: AnimatedContainer(
                  duration: const Duration(milliseconds: 250),
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                  decoration: BoxDecoration(
                    color: AppColors.surface,
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(
                      color: _tokenFocused ? AppColors.primary : AppColors.border,
                      width: _tokenFocused ? 2 : 1,
                    ),
                    boxShadow: _tokenFocused ? AppShadows.cardElevated : AppShadows.card,
                  ),
                  child: TextFormField(
                    controller: _tokenController,
                    textAlign: TextAlign.center,
                    textCapitalization: TextCapitalization.characters,
                    style: const TextStyle(
                      fontSize: 24,
                      letterSpacing: 8,
                      fontWeight: FontWeight.w800,
                      color: AppColors.textPrimary,
                      fontFeatures: [FontFeature.tabularFigures()],
                    ),
                    decoration: const InputDecoration(
                      hintText: 'XXXXXXXX',
                      hintStyle: TextStyle(
                        fontSize: 24,
                        letterSpacing: 8,
                        color: AppColors.textMuted,
                      ),
                      counterText: '',
                      border: InputBorder.none,
                      enabledBorder: InputBorder.none,
                      focusedBorder: InputBorder.none,
                      contentPadding: EdgeInsets.symmetric(vertical: 8),
                    ),
                    maxLength: 8,
                    onFieldSubmitted: (_) => _startExam(),
                    onChanged: (_) => setState(() {}),
                  ),
                ),
              ),

              const SizedBox(height: 18),

              // Agreement Checkbox
              BouncingButton(
                onTap: () => setState(() => _rulesAgreed = !_rulesAgreed),
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                  decoration: BoxDecoration(
                    color: _rulesAgreed ? AppColors.primaryContainer.withValues(alpha: 0.4) : AppColors.surface,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(
                      color: _rulesAgreed ? AppColors.primaryLight : AppColors.border,
                    ),
                  ),
                  child: Row(
                    children: [
                      Checkbox(
                        value: _rulesAgreed,
                        onChanged: (val) => setState(() => _rulesAgreed = val ?? false),
                        activeColor: AppColors.primary,
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(5)),
                        visualDensity: VisualDensity.compact,
                        materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
                      ),
                      const SizedBox(width: 8),
                      const Expanded(
                        child: Text(
                          'Saya setuju dan mematuhi seluruh peraturan ujian di atas.',
                          style: TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.w600,
                            color: AppColors.textPrimary,
                            height: 1.35,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),

              const SizedBox(height: 24),

              // Start Exam CTA
              BouncingButton(
                onTap: canSubmit ? _startExam : null,
                child: Container(
                  height: 52,
                  decoration: BoxDecoration(
                    gradient: canSubmit
                        ? const LinearGradient(
                            colors: [AppColors.primary, AppColors.primaryDark],
                            begin: Alignment.topCenter,
                            end: Alignment.bottomCenter,
                          )
                        : null,
                    color: canSubmit ? null : AppColors.surfaceSubtle,
                    borderRadius: BorderRadius.circular(14),
                    boxShadow: canSubmit ? AppShadows.primaryButton : null,
                    border: canSubmit ? null : Border.all(color: AppColors.border),
                  ),
                  child: Center(
                    child: _isLoading
                        ? const SizedBox(
                            height: 22,
                            width: 22,
                            child: CircularProgressIndicator(
                              strokeWidth: 2.5,
                              valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                            ),
                          )
                        : Text(
                            'Mulai Pengerjaan Ujian',
                            style: TextStyle(
                              color: canSubmit ? Colors.white : AppColors.textMuted,
                              fontSize: 15,
                              fontWeight: FontWeight.w700,
                              letterSpacing: 0.2,
                            ),
                          ),
                  ),
                ),
              ),
              const SizedBox(height: 16),
            ],
          ),
        ),
      ),
    );
  }
}

const _rules = [
  'Dilarang keluar dari layar penuh atau meminimalkan aplikasi selama ujian.',
  'Tangkapan layar (screenshot) dan perekaman layar otomatis diblokir.',
  'Membuka aplikasi lain akan dicatat secara otomatis sebagai pelanggaran.',
  'Jawaban Anda tersimpan otomatis (auto-save) ke server.',
  'Jika batas pelanggaran tercapai, lembar ujian akan langsung dikumpulkan.',
];
