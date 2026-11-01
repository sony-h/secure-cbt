import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:secure_cbt_mobile/core/theme/theme.dart';

class SlideToSubmit extends StatefulWidget {
  final int totalQuestions;
  final List<int> unansweredQuestions;
  final VoidCallback onSubmitted;
  final String label;

  const SlideToSubmit({
    super.key,
    required this.totalQuestions,
    required this.unansweredQuestions,
    required this.onSubmitted,
    this.label = 'Geser untuk Kumpulkan',
  });

  @override
  State<SlideToSubmit> createState() => _SlideToSubmitState();
}

class _SlideToSubmitState extends State<SlideToSubmit> with SingleTickerProviderStateMixin {
  late final AnimationController _resetController;
  Animation<double>? _resetAnimation;
  double _dragOffset = 0.0;
  bool _submitted = false;

  static const double _trackHeight = 52.0;
  static const double _handleSize = 44.0;
  static const double _padding = 4.0;
  static const double _threshold = 0.85;

  @override
  void initState() {
    super.initState();
    _resetController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 250),
    )..addListener(() {
        if (_resetAnimation != null) {
          setState(() {
            _dragOffset = _resetAnimation!.value;
          });
        }
      });
  }

  @override
  void dispose() {
    _resetController.dispose();
    super.dispose();
  }

  void _onDragUpdate(DragUpdateDetails details, double maxDragDistance) {
    if (_submitted) return;
    if (_resetController.isAnimating) _resetController.stop();

    setState(() {
      _dragOffset = (_dragOffset + details.delta.dx).clamp(0.0, maxDragDistance);
    });
  }

  void _onDragEnd(DragEndDetails details, double maxDragDistance) {
    if (_submitted || maxDragDistance <= 0) return;

    final progress = _dragOffset / maxDragDistance;
    if (progress >= _threshold) {
      setState(() {
        _dragOffset = maxDragDistance;
        _submitted = true;
      });
      HapticFeedback.heavyImpact();
      widget.onSubmitted();
    } else {
      _resetAnimation = Tween<double>(
        begin: _dragOffset,
        end: 0.0,
      ).animate(CurvedAnimation(
        parent: _resetController,
        curve: Curves.easeOutCubic,
      ));
      _resetController.forward(from: 0.0);
    }
  }

  @override
  Widget build(BuildContext context) {
    final hasUnanswered = widget.unansweredQuestions.isNotEmpty;
    final primaryColor = hasUnanswered ? AppColors.warning : AppColors.primary;

    return Column(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        if (hasUnanswered) ...[
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
            decoration: BoxDecoration(
              color: AppColors.warningContainer,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: AppColors.warning.withValues(alpha: 0.3)),
            ),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Icon(
                  Icons.warning_amber_rounded,
                  size: 18,
                  color: AppColors.warning,
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        '${widget.unansweredQuestions.length} Soal Belum Terjawab',
                        style: const TextStyle(
                          fontSize: 12.5,
                          fontWeight: FontWeight.w700,
                          color: AppColors.warning,
                        ),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        'No. ${widget.unansweredQuestions.join(', ')}',
                        style: const TextStyle(
                          fontSize: 11.5,
                          color: AppColors.textSecondary,
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
          const SizedBox(height: 14),
        ],
        LayoutBuilder(
          builder: (context, constraints) {
            final trackWidth = constraints.maxWidth;
            final maxDragDistance = (trackWidth - _handleSize - (_padding * 2)).clamp(0.0, double.infinity);
            final dragProgress = maxDragDistance > 0 ? (_dragOffset / maxDragDistance).clamp(0.0, 1.0) : 0.0;

            return Container(
              height: _trackHeight,
              width: trackWidth,
              decoration: BoxDecoration(
                color: AppColors.surfaceSubtle,
                borderRadius: BorderRadius.circular(_trackHeight / 2),
                border: Border.all(color: AppColors.border),
              ),
              child: Stack(
                children: [
                  // Progress fill
                  Positioned(
                    left: 0,
                    top: 0,
                    bottom: 0,
                    width: _dragOffset + _handleSize + (_padding * 2),
                    child: Container(
                      decoration: BoxDecoration(
                        color: primaryColor.withValues(alpha: 0.15 + (dragProgress * 0.15)),
                        borderRadius: BorderRadius.circular(_trackHeight / 2),
                      ),
                    ),
                  ),

                  // Center label
                  Center(
                    child: Opacity(
                      opacity: (1.0 - (dragProgress * 1.5)).clamp(0.0, 1.0),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Text(
                            widget.label,
                            style: TextStyle(
                              fontSize: 13,
                              fontWeight: FontWeight.w600,
                              letterSpacing: 0.2,
                              color: primaryColor.withValues(alpha: 0.85),
                            ),
                          ),
                          const SizedBox(width: 4),
                          Icon(
                            Icons.keyboard_double_arrow_right_rounded,
                            size: 16,
                            color: primaryColor.withValues(alpha: 0.7),
                          ),
                        ],
                      ),
                    ),
                  ),

                  // Draggable handle
                  Positioned(
                    left: _padding + _dragOffset,
                    top: _padding,
                    child: GestureDetector(
                      key: const Key('slide_to_submit_handle'),
                      onHorizontalDragUpdate: (details) => _onDragUpdate(details, maxDragDistance),
                      onHorizontalDragEnd: (details) => _onDragEnd(details, maxDragDistance),
                      child: Container(
                        width: _handleSize,
                        height: _handleSize,
                        decoration: BoxDecoration(
                          color: primaryColor,
                          shape: BoxShape.circle,
                          boxShadow: [
                            BoxShadow(
                              color: primaryColor.withValues(alpha: 0.35),
                              blurRadius: 8,
                              offset: const Offset(0, 2),
                            ),
                          ],
                        ),
                        child: const Center(
                          child: Icon(
                            Icons.arrow_forward_rounded,
                            size: 20,
                            color: Colors.white,
                          ),
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            );
          },
        ),
      ],
    );
  }
}
