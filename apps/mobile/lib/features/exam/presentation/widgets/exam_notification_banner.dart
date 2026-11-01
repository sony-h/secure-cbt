import 'dart:async';
import 'package:flutter/material.dart';

enum ExamNotificationBannerType {
  timeAdded,
  timeReduced,
  strikeMercy,
  strikePenalty,
  strikeReset,
  deviceUnlocked,
  personalMessage,
  roomBroadcast,
}

class ExamNotificationBanner extends StatefulWidget {
  final ExamNotificationBannerType type;
  final String title;
  final String message;
  final String? badgeText;
  final VoidCallback onDismiss;
  final Duration autoDismissDuration;

  const ExamNotificationBanner({
    super.key,
    required this.type,
    required this.title,
    required this.message,
    this.badgeText,
    required this.onDismiss,
    this.autoDismissDuration = const Duration(seconds: 6),
  });

  @override
  State<ExamNotificationBanner> createState() => _ExamNotificationBannerState();
}

class _ExamNotificationBannerState extends State<ExamNotificationBanner>
    with SingleTickerProviderStateMixin {
  late AnimationController _animController;
  late Animation<double> _fadeAnim;
  late Animation<Offset> _slideAnim;
  Timer? _dismissTimer;

  @override
  void initState() {
    super.initState();
    _animController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 320),
    );

    _fadeAnim = CurvedAnimation(parent: _animController, curve: Curves.easeOut);
    _slideAnim = Tween<Offset>(
      begin: const Offset(0, -0.3),
      end: Offset.zero,
    ).animate(CurvedAnimation(parent: _animController, curve: Curves.easeOutCubic));

    _animController.forward();

    if (widget.autoDismissDuration > Duration.zero) {
      _dismissTimer = Timer(widget.autoDismissDuration, () {
        if (mounted) {
          widget.onDismiss();
        }
      });
    }
  }

  @override
  void didUpdateWidget(covariant ExamNotificationBanner oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.message != oldWidget.message || widget.type != oldWidget.type) {
      _dismissTimer?.cancel();
      _animController.forward(from: 0.0);
      if (widget.autoDismissDuration > Duration.zero) {
        _dismissTimer = Timer(widget.autoDismissDuration, () {
          if (mounted) {
            widget.onDismiss();
          }
        });
      }
    }
  }

  @override
  void dispose() {
    _dismissTimer?.cancel();
    _animController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final style = _getStyle(widget.type);
    final displayBadge = widget.badgeText ?? style.defaultBadge;

    return SlideTransition(
      position: _slideAnim,
      child: FadeTransition(
        opacity: _fadeAnim,
        child: Container(
          margin: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
          decoration: BoxDecoration(
            color: style.bgColor.withValues(alpha: 0.96),
            borderRadius: BorderRadius.circular(14),
            border: Border.all(
              color: style.borderColor.withValues(alpha: 0.7),
              width: 1.2,
            ),
            boxShadow: [
              BoxShadow(
                color: style.borderColor.withValues(alpha: 0.3),
                blurRadius: 12,
                offset: const Offset(0, 4),
              ),
            ],
          ),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                padding: const EdgeInsets.all(7),
                decoration: BoxDecoration(
                  color: style.iconBgColor.withValues(alpha: 0.25),
                  shape: BoxShape.circle,
                ),
                child: Icon(
                  style.icon,
                  color: style.iconColor,
                  size: 20,
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Row(
                      children: [
                        Flexible(
                          child: Text(
                            widget.title,
                            style: TextStyle(
                              fontSize: 11,
                              fontWeight: FontWeight.w900,
                              letterSpacing: 0.5,
                              color: style.titleColor,
                            ),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                        if (displayBadge != null && displayBadge.isNotEmpty) ...[
                          const SizedBox(width: 6),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 1.5),
                            decoration: BoxDecoration(
                              color: style.badgeBgColor.withValues(alpha: 0.4),
                              border: Border.all(
                                color: style.badgeBorderColor.withValues(alpha: 0.5),
                                width: 0.8,
                              ),
                              borderRadius: BorderRadius.circular(4),
                            ),
                            child: Text(
                              displayBadge,
                              style: const TextStyle(
                                fontSize: 9,
                                fontWeight: FontWeight.w800,
                                letterSpacing: 0.4,
                                color: Colors.white,
                              ),
                            ),
                          ),
                        ],
                      ],
                    ),
                    const SizedBox(height: 3),
                    Text(
                      widget.message,
                      style: const TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w500,
                        color: Colors.white,
                        height: 1.35,
                      ),
                    ),
                  ],
                ),
              ),
              IconButton(
                icon: const Icon(Icons.close, size: 18, color: Colors.white70),
                visualDensity: VisualDensity.compact,
                padding: EdgeInsets.zero,
                constraints: const BoxConstraints(),
                onPressed: widget.onDismiss,
              ),
            ],
          ),
        ),
      ),
    );
  }

  _BannerStyle _getStyle(ExamNotificationBannerType type) {
    switch (type) {
      case ExamNotificationBannerType.timeAdded:
        return const _BannerStyle(
          bgColor: Color(0xFF064E3B),
          borderColor: Color(0xFF34D399),
          titleColor: Color(0xFFA7F3D0),
          iconColor: Color(0xFF34D399),
          iconBgColor: Color(0xFF10B981),
          icon: Icons.more_time_rounded,
          badgeBgColor: Color(0xFF065F46),
          badgeBorderColor: Color(0xFF10B981),
          defaultBadge: 'KOMPENSASI',
        );
      case ExamNotificationBannerType.timeReduced:
        return const _BannerStyle(
          bgColor: Color(0xFF78350F),
          borderColor: Color(0xFFF59E0B),
          titleColor: Color(0xFFFDE68A),
          iconColor: Color(0xFFFBBF24),
          iconBgColor: Color(0xFFD97706),
          icon: Icons.timelapse_rounded,
          badgeBgColor: Color(0xFF92400E),
          badgeBorderColor: Color(0xFFF59E0B),
          defaultBadge: 'PENALTI',
        );
      case ExamNotificationBannerType.strikeMercy:
        return const _BannerStyle(
          bgColor: Color(0xFF1E3A8A),
          borderColor: Color(0xFF60A5FA),
          titleColor: Color(0xFFBFDBFE),
          iconColor: Color(0xFF93C5FD),
          iconBgColor: Color(0xFF3B82F6),
          icon: Icons.verified_user_rounded,
          badgeBgColor: Color(0xFF1E40AF),
          badgeBorderColor: Color(0xFF3B82F6),
          defaultBadge: '-1 STRIKE',
        );
      case ExamNotificationBannerType.strikePenalty:
        return const _BannerStyle(
          bgColor: Color(0xFF881337),
          borderColor: Color(0xFFFB7185),
          titleColor: Color(0xFFFECDD3),
          iconColor: Color(0xFFFDA4AF),
          iconBgColor: Color(0xFFE11D48),
          icon: Icons.warning_amber_rounded,
          badgeBgColor: Color(0xFF9F1239),
          badgeBorderColor: Color(0xFFE11D48),
          defaultBadge: '+1 STRIKE',
        );
      case ExamNotificationBannerType.strikeReset:
        return const _BannerStyle(
          bgColor: Color(0xFF134E4A),
          borderColor: Color(0xFF2DD4BF),
          titleColor: Color(0xFF99F6E4),
          iconColor: Color(0xFF5EEAD4),
          iconBgColor: Color(0xFF14B8A6),
          icon: Icons.restart_alt_rounded,
          badgeBgColor: Color(0xFF115E59),
          badgeBorderColor: Color(0xFF14B8A6),
          defaultBadge: '0 STRIKE',
        );
      case ExamNotificationBannerType.deviceUnlocked:
        return const _BannerStyle(
          bgColor: Color(0xFF0E7490),
          borderColor: Color(0xFF38BDF8),
          titleColor: Color(0xFFBAE6FD),
          iconColor: Color(0xFF7DD3FC),
          iconBgColor: Color(0xFF0284C7),
          icon: Icons.lock_open_rounded,
          badgeBgColor: Color(0xFF155E75),
          badgeBorderColor: Color(0xFF0EA5E9),
          defaultBadge: 'PULIH',
        );
      case ExamNotificationBannerType.personalMessage:
        return const _BannerStyle(
          bgColor: Color(0xFF0F172A),
          borderColor: Color(0xFF38BDF8),
          titleColor: Color(0xFF7DD3FC),
          iconColor: Color(0xFF38BDF8),
          iconBgColor: Color(0xFF0284C7),
          icon: Icons.mark_chat_unread_rounded,
          badgeBgColor: Color(0xFF0284C7),
          badgeBorderColor: Color(0xFF38BDF8),
          defaultBadge: 'PRIBADI',
        );
      case ExamNotificationBannerType.roomBroadcast:
        return const _BannerStyle(
          bgColor: Color(0xFF4C0519),
          borderColor: Color(0xFFFB7185),
          titleColor: Color(0xFFFDA4AF),
          iconColor: Color(0xFFFB7185),
          iconBgColor: Color(0xFFE11D48),
          icon: Icons.campaign_rounded,
          badgeBgColor: Color(0xFFBE123C),
          badgeBorderColor: Color(0xFFFB7185),
          defaultBadge: 'SEMUA SISWA',
        );
    }
  }
}

class _BannerStyle {
  final Color bgColor;
  final Color borderColor;
  final Color titleColor;
  final Color iconColor;
  final Color iconBgColor;
  final IconData icon;
  final Color badgeBgColor;
  final Color badgeBorderColor;
  final String? defaultBadge;

  const _BannerStyle({
    required this.bgColor,
    required this.borderColor,
    required this.titleColor,
    required this.iconColor,
    required this.iconBgColor,
    required this.icon,
    required this.badgeBgColor,
    required this.badgeBorderColor,
    this.defaultBadge,
  });
}
