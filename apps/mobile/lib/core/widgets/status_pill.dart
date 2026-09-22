import 'package:flutter/material.dart';
import 'package:secure_cbt_mobile/core/theme/theme.dart';

enum StatusPillType {
  success,
  warning,
  error,
  info,
  neutral,
}

class StatusPill extends StatelessWidget {
  final String label;
  final IconData? icon;
  final StatusPillType type;
  final bool isCompact;

  const StatusPill({
    super.key,
    required this.label,
    this.icon,
    this.type = StatusPillType.info,
    this.isCompact = false,
  });

  factory StatusPill.fromExamStatus(String status) {
    switch (status.toUpperCase()) {
      case 'ONGOING':
      case 'AKTIF':
        return const StatusPill(label: 'Sedang Berlangsung', icon: Icons.play_circle_fill_rounded, type: StatusPillType.success);
      case 'PUBLISHED':
      case 'TERBIT':
        return const StatusPill(label: 'Tersedia', icon: Icons.schedule_rounded, type: StatusPillType.info);
      case 'FINISHED':
      case 'SUBMITTED':
      case 'AUTO_SUBMITTED':
      case 'SELESAI':
        return const StatusPill(label: 'Selesai', icon: Icons.check_circle_rounded, type: StatusPillType.neutral);
      case 'EXPIRED':
      case 'CANCELLED':
        return const StatusPill(label: 'Berakhir', icon: Icons.cancel_rounded, type: StatusPillType.error);
      default:
        return StatusPill(label: status, type: StatusPillType.neutral);
    }
  }

  factory StatusPill.passOrFail({required bool passed, bool compact = false}) {
    if (passed) {
      return StatusPill(
        label: 'Lulus KKM',
        icon: Icons.check_circle_rounded,
        type: StatusPillType.success,
        isCompact: compact,
      );
    } else {
      return StatusPill(
        label: 'Perlu Remedial',
        icon: Icons.info_outline_rounded,
        type: StatusPillType.warning,
        isCompact: compact,
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    Color bg;
    Color fg;

    switch (type) {
      case StatusPillType.success:
        bg = AppColors.successContainer;
        fg = AppColors.onSuccessContainer;
        break;
      case StatusPillType.warning:
        bg = AppColors.warningContainer;
        fg = AppColors.onWarningContainer;
        break;
      case StatusPillType.error:
        bg = AppColors.errorContainer;
        fg = AppColors.onErrorContainer;
        break;
      case StatusPillType.info:
        bg = AppColors.primaryContainer;
        fg = AppColors.onPrimaryContainer;
        break;
      case StatusPillType.neutral:
        bg = AppColors.surfaceSubtle;
        fg = AppColors.textSecondary;
        break;
    }

    return Container(
      padding: EdgeInsets.symmetric(
        horizontal: isCompact ? 8 : 10,
        vertical: isCompact ? 3 : 5,
      ),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(20),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (icon != null) ...[
            Icon(icon, size: isCompact ? 12 : 14, color: fg),
            SizedBox(width: isCompact ? 3 : 5),
          ],
          Text(
            label,
            style: TextStyle(
              fontSize: isCompact ? 11 : 12,
              fontWeight: FontWeight.w600,
              color: fg,
              letterSpacing: 0.1,
            ),
          ),
        ],
      ),
    );
  }
}
