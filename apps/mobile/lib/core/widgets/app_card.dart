import 'package:flutter/material.dart';
import 'package:secure_cbt_mobile/core/theme/theme.dart';
import 'package:secure_cbt_mobile/core/widgets/bouncing_button.dart';

class AppCard extends StatelessWidget {
  final Widget child;
  final EdgeInsetsGeometry? padding;
  final double borderRadius;
  final Color? borderColor;
  final Color? backgroundColor;
  final EdgeInsetsGeometry? margin;
  final List<BoxShadow>? shadows;
  final VoidCallback? onTap;

  const AppCard({
    super.key,
    required this.child,
    this.padding,
    this.borderRadius = 16,
    this.borderColor,
    this.backgroundColor,
    this.margin,
    this.shadows,
    this.onTap,
  });

  factory AppCard.section({
    Key? key,
    required String title,
    required List<Widget> children,
    Widget? trailing,
    EdgeInsetsGeometry? margin,
    EdgeInsetsGeometry? padding,
    VoidCallback? onTap,
  }) {
    return AppCard(
      key: key,
      margin: margin,
      padding: padding ?? const EdgeInsets.all(18),
      onTap: onTap,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                title,
                style: const TextStyle(
                  fontWeight: FontWeight.w700,
                  fontSize: 14,
                  letterSpacing: -0.2,
                  color: AppColors.textPrimary,
                ),
              ),
              if (trailing != null) trailing,
            ],
          ),
          const SizedBox(height: 14),
          ...children,
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final border = borderColor ?? AppColors.border;
    final bg = backgroundColor ?? AppColors.surface;
    final boxShadows = shadows ?? AppShadows.card;

    final container = Container(
      margin: margin ?? EdgeInsets.zero,
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(borderRadius),
        border: Border.all(color: border, width: 1),
        boxShadow: boxShadows,
      ),
      child: Padding(
        padding: padding ?? const EdgeInsets.all(16),
        child: child,
      ),
    );

    if (onTap != null) {
      return BouncingButton(
        onTap: onTap,
        child: container,
      );
    }

    return container;
  }
}
