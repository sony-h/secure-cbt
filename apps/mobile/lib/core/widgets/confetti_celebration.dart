import 'dart:math';
import 'package:flutter/material.dart';

class ConfettiCelebration extends StatefulWidget {
  final Widget child;
  final bool play;
  final Duration duration;

  const ConfettiCelebration({
    super.key,
    required this.child,
    this.play = true,
    this.duration = const Duration(milliseconds: 2500),
  });

  @override
  State<ConfettiCelebration> createState() => _ConfettiCelebrationState();
}

class _ConfettiCelebrationState extends State<ConfettiCelebration> with SingleTickerProviderStateMixin {
  late final AnimationController _controller;
  late final List<_ConfettiParticle> _particles;
  final Random _random = Random();

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(vsync: this, duration: widget.duration);

    _particles = List.generate(55, (_) => _generateParticle());

    if (widget.play) {
      _controller.forward();
    }
  }

  _ConfettiParticle _generateParticle() {
    final colors = [
      const Color(0xFFF59E0B), // Gold
      const Color(0xFF10B981), // Emerald
      const Color(0xFF4F46E5), // Indigo
      const Color(0xFF06B6D4), // Cyan
      const Color(0xFFEC4899), // Pink
      const Color(0xFF8B5CF6), // Purple
      const Color(0xFFEF4444), // Coral
    ];

    return _ConfettiParticle(
      color: colors[_random.nextInt(colors.length)],
      x: _random.nextDouble(),
      y: -_random.nextDouble() * 0.3,
      size: _random.nextDouble() * 7 + 5,
      speedY: _random.nextDouble() * 0.8 + 0.6,
      speedX: (_random.nextDouble() - 0.5) * 0.5,
      rotation: _random.nextDouble() * 2 * pi,
      rotationSpeed: (_random.nextDouble() - 0.5) * 8,
      isStar: _random.nextBool(),
    );
  }

  @override
  void didUpdateWidget(covariant ConfettiCelebration oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.play && !oldWidget.play) {
      _controller.reset();
      _controller.forward();
    }
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Stack(
      children: [
        widget.child,
        Positioned.fill(
          child: IgnorePointer(
            child: AnimatedBuilder(
              animation: _controller,
              builder: (context, _) {
                if (!_controller.isAnimating && _controller.isCompleted) {
                  return const SizedBox.shrink();
                }
                return CustomPaint(
                  painter: _ConfettiPainter(
                    progress: _controller.value,
                    particles: _particles,
                  ),
                );
              },
            ),
          ),
        ),
      ],
    );
  }
}

class _ConfettiParticle {
  final Color color;
  final double x;
  final double y;
  final double size;
  final double speedY;
  final double speedX;
  final double rotation;
  final double rotationSpeed;
  final bool isStar;

  _ConfettiParticle({
    required this.color,
    required this.x,
    required this.y,
    required this.size,
    required this.speedY,
    required this.speedX,
    required this.rotation,
    required this.rotationSpeed,
    required this.isStar,
  });
}

class _ConfettiPainter extends CustomPainter {
  final double progress;
  final List<_ConfettiParticle> particles;

  _ConfettiPainter({required this.progress, required this.particles});

  @override
  void paint(Canvas canvas, Size size) {
    final opacity = (1.0 - (progress - 0.75).clamp(0.0, 0.25) / 0.25).clamp(0.0, 1.0);

    for (final p in particles) {
      final currentX = (p.x * size.width) + (sin((progress * 4) + (p.x * 10)) * 25 * p.speedX);
      final currentY = (p.y * size.height) + (progress * size.height * p.speedY * 1.3);
      final currentRot = p.rotation + (progress * p.rotationSpeed * pi);

      if (currentY > size.height + 20) continue;

      final paint = Paint()
        ..color = p.color.withValues(alpha: opacity)
        ..style = PaintingStyle.fill;

      canvas.save();
      canvas.translate(currentX, currentY);
      canvas.rotate(currentRot);

      if (p.isStar) {
        _drawStar(canvas, p.size, paint);
      } else {
        canvas.drawRRect(
          RRect.fromRectAndRadius(
            Rect.fromCenter(center: Offset.zero, width: p.size, height: p.size * 0.6),
            const Radius.circular(2),
          ),
          paint,
        );
      }

      canvas.restore();
    }
  }

  void _drawStar(Canvas canvas, double size, Paint paint) {
    final path = Path();
    const numberOfPoints = 5;
    final halfSize = size / 2;
    final innerRadius = halfSize * 0.45;

    for (int i = 0; i < numberOfPoints * 2; i++) {
      final radius = i.isEven ? halfSize : innerRadius;
      final angle = (i * pi) / numberOfPoints - (pi / 2);
      final point = Offset(radius * cos(angle), radius * sin(angle));
      if (i == 0) {
        path.moveTo(point.dx, point.dy);
      } else {
        path.lineTo(point.dx, point.dy);
      }
    }
    path.close();
    canvas.drawPath(path, paint);
  }

  @override
  bool shouldRepaint(covariant _ConfettiPainter oldDelegate) =>
      oldDelegate.progress != progress;
}
