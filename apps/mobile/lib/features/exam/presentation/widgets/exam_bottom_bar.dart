import 'package:flutter/material.dart';
import 'package:secure_cbt_mobile/core/theme/theme.dart';
import 'package:secure_cbt_mobile/core/widgets/bouncing_button.dart';

class ExamBottomBar extends StatelessWidget {
  final int total;
  final int current;
  final int answered;
  final bool showSaveIndicator;
  final VoidCallback onSubmit;
  final VoidCallback? onPrevious;
  final VoidCallback? onNext;
  final VoidCallback onOpenPalette;

  const ExamBottomBar({
    super.key,
    required this.total,
    required this.current,
    required this.answered,
    required this.showSaveIndicator,
    required this.onSubmit,
    required this.onPrevious,
    required this.onNext,
    required this.onOpenPalette,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: const BoxDecoration(
        color: AppColors.surface,
        border: Border(
          top: BorderSide(color: AppColors.border, width: 1),
        ),
        boxShadow: AppShadows.cardElevated,
      ),
      child: SafeArea(
        top: false,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            // Auto-save feedback pill banner
            AnimatedCrossFade(
              duration: const Duration(milliseconds: 200),
              crossFadeState: showSaveIndicator ? CrossFadeState.showSecond : CrossFadeState.showFirst,
              firstChild: const SizedBox(height: 0, width: double.infinity),
              secondChild: Container(
                width: double.infinity,
                padding: const EdgeInsets.symmetric(vertical: 5, horizontal: 16),
                color: AppColors.successContainer,
                child: const Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(Icons.cloud_done_rounded, size: 15, color: AppColors.success),
                    SizedBox(width: 6),
                    Text(
                      'Jawaban tersimpan otomatis',
                      style: TextStyle(
                        color: AppColors.onSuccessContainer,
                        fontSize: 11,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ],
                ),
              ),
            ),

            // Navigation and Question Palette Trigger Row
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 10, 16, 8),
              child: Row(
                children: [
                  // Previous Button
                  BouncingButton(
                    onTap: onPrevious,
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 9),
                      decoration: BoxDecoration(
                        color: onPrevious != null ? AppColors.surfaceSubtle : AppColors.canvas,
                        borderRadius: BorderRadius.circular(10),
                        border: Border.all(color: AppColors.border),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(
                            Icons.chevron_left_rounded,
                            size: 18,
                            color: onPrevious != null ? AppColors.textPrimary : AppColors.textMuted,
                          ),
                          const SizedBox(width: 2),
                          Text(
                            'Sebelumnya',
                            style: TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.w600,
                              color: onPrevious != null ? AppColors.textPrimary : AppColors.textMuted,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),

                  const Spacer(),

                  // Center: Question Number Palette Trigger
                  BouncingButton(
                    onTap: onOpenPalette,
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                      decoration: BoxDecoration(
                        color: AppColors.primaryContainer,
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: AppColors.primaryLight.withValues(alpha: 0.4)),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Text(
                            '${current + 1}',
                            style: const TextStyle(
                              fontWeight: FontWeight.w800,
                              fontSize: 14,
                              color: AppColors.primary,
                              fontFeatures: [FontFeature.tabularFigures()],
                            ),
                          ),
                          Text(
                            ' / $total',
                            style: TextStyle(
                              fontSize: 13,
                              fontWeight: FontWeight.w600,
                              color: AppColors.primary.withValues(alpha: 0.7),
                              fontFeatures: const [FontFeature.tabularFigures()],
                            ),
                          ),
                          const SizedBox(width: 8),
                          const Icon(
                            Icons.grid_view_rounded,
                            size: 14,
                            color: AppColors.primary,
                          ),
                          const SizedBox(width: 2),
                          const Icon(
                            Icons.arrow_drop_down_rounded,
                            size: 16,
                            color: AppColors.primary,
                          ),
                        ],
                      ),
                    ),
                  ),

                  const Spacer(),

                  // Next Button
                  BouncingButton(
                    onTap: onNext,
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 9),
                      decoration: BoxDecoration(
                        color: onNext != null ? AppColors.surfaceSubtle : AppColors.canvas,
                        borderRadius: BorderRadius.circular(10),
                        border: Border.all(color: AppColors.border),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Text(
                            'Selanjutnya',
                            style: TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.w600,
                              color: onNext != null ? AppColors.textPrimary : AppColors.textMuted,
                            ),
                          ),
                          const SizedBox(width: 2),
                          Icon(
                            Icons.chevron_right_rounded,
                            size: 18,
                            color: onNext != null ? AppColors.textPrimary : AppColors.textMuted,
                          ),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
            ),

            // Submit Button
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 4, 16, 10),
              child: BouncingButton(
                onTap: onSubmit,
                child: Container(
                  width: double.infinity,
                  height: 46,
                  decoration: BoxDecoration(
                    color: AppColors.error,
                    borderRadius: BorderRadius.circular(12),
                    boxShadow: [
                      BoxShadow(
                        color: AppColors.error.withValues(alpha: 0.25),
                        blurRadius: 8,
                        offset: const Offset(0, 3),
                      ),
                    ],
                  ),
                  child: const Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(Icons.assignment_turned_in_rounded, size: 18, color: Colors.white),
                      SizedBox(width: 8),
                      Text(
                        'Kumpulkan Lembar Ujian',
                        style: TextStyle(
                          color: Colors.white,
                          fontWeight: FontWeight.w700,
                          fontSize: 14,
                          letterSpacing: 0.2,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
