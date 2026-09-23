import 'dart:math';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
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

class _TokenScreenState extends ConsumerState<TokenScreen> with SingleTickerProviderStateMixin {
  final _tokenController = TextEditingController();
  final _focusNode = FocusNode();
  late final AnimationController _shakeController;
  late final Animation<double> _shakeAnimation;

  bool _isLoading = false;
  bool _rulesAgreed = false;

  @override
  void initState() {
    super.initState();
    _shakeController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 400),
    );
    _shakeAnimation = Tween<double>(begin: 0, end: 1).animate(
      CurvedAnimation(parent: _shakeController, curve: Curves.elasticIn),
    );

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
    _focusNode.dispose();
    _shakeController.dispose();
    super.dispose();
  }

  void _triggerErrorShake() {
    HapticFeedback.mediumImpact();
    _shakeController.forward(from: 0.0);
  }

  Future<void> _startExam() async {
    if (!_rulesAgreed) return;

    final token = _tokenController.text.trim().toUpperCase();
    if (token.isEmpty) {
      _triggerErrorShake();
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: const Text('Silakan masukkan token ujian terlebih dahulu'),
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
      _triggerErrorShake();
      final message = e.response?.data?['message'] ?? 'Token tidak valid atau sudah kedaluwarsa';
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
      _triggerErrorShake();
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
    final tokenText = _tokenController.text.toUpperCase();
    final canSubmit = !_isLoading && _rulesAgreed && tokenText.isNotEmpty;

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
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // ── Exam Header Card ─────────────────────────────────
              Container(
                padding: const EdgeInsets.all(18),
                decoration: BoxDecoration(
                  color: AppColors.surface,
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(color: AppColors.border),
                  boxShadow: AppShadows.card,
                ),
                child: Row(
                  children: [
                    Container(
                      width: 50,
                      height: 50,
                      decoration: BoxDecoration(
                        gradient: const LinearGradient(
                          colors: [AppColors.primary, AppColors.primaryDark],
                          begin: Alignment.topLeft,
                          end: Alignment.bottomRight,
                        ),
                        borderRadius: BorderRadius.circular(14),
                        boxShadow: [
                          BoxShadow(
                            color: AppColors.primary.withValues(alpha: 0.25),
                            blurRadius: 8,
                            offset: const Offset(0, 3),
                          ),
                        ],
                      ),
                      child: const Icon(Icons.vpn_key_rounded, color: Colors.white, size: 24),
                    ),
                    const SizedBox(width: 14),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text(
                            'UJIAN YANG DIPILIH',
                            style: TextStyle(
                              fontSize: 11,
                              fontWeight: FontWeight.w700,
                              letterSpacing: 0.5,
                              color: AppColors.primary,
                            ),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            widget.examTitle ?? 'Informasi Ujian',
                            style: const TextStyle(
                              fontSize: 15,
                              fontWeight: FontWeight.w700,
                              letterSpacing: -0.3,
                              color: AppColors.textPrimary,
                            ),
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 20),

              // ── Interactive Segmented Token Input Box ────────────
              const Text(
                'Kode Akses / Token Ujian',
                style: TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w700,
                  letterSpacing: -0.2,
                  color: AppColors.textPrimary,
                ),
              ),
              const SizedBox(height: 8),

              AnimatedBuilder(
                animation: _shakeAnimation,
                builder: (context, child) {
                  final offset = sin(_shakeAnimation.value * pi * 4) * 8 * (1 - _shakeAnimation.value);
                  return Transform.translate(
                    offset: Offset(offset, 0),
                    child: child,
                  );
                },
                child: GestureDetector(
                  onTap: () => _focusNode.requestFocus(),
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 14),
                    decoration: BoxDecoration(
                      color: AppColors.surface,
                      borderRadius: BorderRadius.circular(18),
                      border: Border.all(
                        color: _focusNode.hasFocus ? AppColors.primary : AppColors.border,
                        width: _focusNode.hasFocus ? 1.5 : 1.0,
                      ),
                      boxShadow: _focusNode.hasFocus ? AppShadows.cardElevated : AppShadows.card,
                    ),
                    child: Stack(
                      alignment: Alignment.center,
                      children: [
                        // Segmented 8-char cells
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: List.generate(8, (index) {
                            final char = index < tokenText.length ? tokenText[index] : '';
                            final isCurrent = index == tokenText.length && _focusNode.hasFocus;
                            final isFilled = index < tokenText.length;

                            return Expanded(
                              child: Container(
                                height: 46,
                                margin: const EdgeInsets.symmetric(horizontal: 2.5),
                                decoration: BoxDecoration(
                                  color: isFilled
                                      ? AppColors.primaryContainer
                                      : isCurrent
                                          ? AppColors.surface
                                          : AppColors.surfaceSubtle,
                                  borderRadius: BorderRadius.circular(10),
                                  border: Border.all(
                                    color: isCurrent
                                        ? AppColors.primary
                                        : isFilled
                                            ? AppColors.primaryLight.withValues(alpha: 0.5)
                                            : AppColors.border,
                                    width: isCurrent ? 2 : 1,
                                  ),
                                  boxShadow: isCurrent
                                      ? [
                                          BoxShadow(
                                            color: AppColors.primary.withValues(alpha: 0.2),
                                            blurRadius: 6,
                                          ),
                                        ]
                                      : null,
                                ),
                                child: Center(
                                  child: Text(
                                    char,
                                    style: TextStyle(
                                      fontSize: 20,
                                      fontWeight: FontWeight.w900,
                                      color: isFilled ? AppColors.primary : AppColors.textPrimary,
                                      fontFeatures: const [FontFeature.tabularFigures()],
                                    ),
                                  ),
                                ),
                              ),
                            );
                          }),
                        ),

                        // Invisible native TextField catching input
                        Opacity(
                          opacity: 0.0,
                          child: TextField(
                            controller: _tokenController,
                            focusNode: _focusNode,
                            maxLength: 8,
                            textCapitalization: TextCapitalization.characters,
                            keyboardType: TextInputType.text,
                            autocorrect: false,
                            enableSuggestions: false,
                            onChanged: (_) => setState(() {}),
                            onSubmitted: (_) => _startExam(),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),

              const SizedBox(height: 6),
              const Text(
                'Minta 8 digit token pengawas ujian kepada guru piket / pengawas di kelas.',
                style: TextStyle(fontSize: 11.5, color: AppColors.textMuted),
              ),

              const SizedBox(height: 22),

              // ── Exam Rules Checklist ──────────────────────────────
              const Text(
                'Peraturan & Keamanan Ujian',
                style: TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w700,
                  letterSpacing: -0.2,
                  color: AppColors.textPrimary,
                ),
              ),
              const SizedBox(height: 8),
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: AppColors.surface,
                  borderRadius: BorderRadius.circular(18),
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
                              borderRadius: BorderRadius.circular(7),
                            ),
                            child: Center(
                              child: Text(
                                '${i + 1}',
                                style: const TextStyle(
                                  fontSize: 11,
                                  fontWeight: FontWeight.w800,
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
                                fontSize: 12.5,
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

              const SizedBox(height: 18),

              // ── Agreement Checkbox ────────────────────────────────
              BouncingButton(
                onTap: () => setState(() => _rulesAgreed = !_rulesAgreed),
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                  decoration: BoxDecoration(
                    color: _rulesAgreed ? AppColors.primaryContainer.withValues(alpha: 0.5) : AppColors.surface,
                    borderRadius: BorderRadius.circular(14),
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
                          'Saya setuju dan mematuhi seluruh peraturan keamanan di atas.',
                          style: TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.w600,
                            color: AppColors.textPrimary,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),

              const SizedBox(height: 24),

              // ── Start Exam CTA ────────────────────────────────────
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
              const SizedBox(height: 20),
            ],
          ),
        ),
      ),
    );
  }
}

const _rules = [
  'Dilarang meminimalkan aplikasi atau berpindah ke aplikasi lain selama ujian berlangsung.',
  'Tangkapan layar (screenshot) dan perekaman layar otomatis diblokir oleh sistem.',
  'Setiap indikasi kecurangan akan dicatat secara otomatis pada dasbor pengawas guru.',
  'Jawaban Anda tersimpan otomatis (auto-save) ke server secara berkala.',
  'Jika batas pelanggaran tercapai, lembar ujian akan langsung dikumpulkan secara otomatis.',
];
