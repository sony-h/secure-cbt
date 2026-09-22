import 'package:flutter/material.dart';

class CountUpText extends StatelessWidget {
  final double end;
  final Duration duration;
  final TextStyle? style;
  final int precision;
  final String suffix;
  final String prefix;

  const CountUpText({
    super.key,
    required this.end,
    this.duration = const Duration(milliseconds: 900),
    this.style,
    this.precision = 0,
    this.suffix = '',
    this.prefix = '',
  });

  @override
  Widget build(BuildContext context) {
    return TweenAnimationBuilder<double>(
      tween: Tween<double>(begin: 0, end: end),
      duration: duration,
      curve: Curves.easeOutCubic,
      builder: (context, value, child) {
        final formatted = precision == 0 ? value.round().toString() : value.toStringAsFixed(precision);
        return Text(
          '$prefix$formatted$suffix',
          style: (style ?? const TextStyle()).copyWith(
            fontFeatures: const [FontFeature.tabularFigures()],
          ),
        );
      },
    );
  }
}
