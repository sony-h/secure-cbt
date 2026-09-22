import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:secure_cbt_mobile/core/theme/theme.dart';
import 'package:secure_cbt_mobile/core/widgets/bouncing_button.dart';

class ScaffoldWithNavBar extends StatelessWidget {
  final StatefulNavigationShell navigationShell;

  const ScaffoldWithNavBar({super.key, required this.navigationShell});

  static const _navItems = [
    _NavData(icon: Icons.home_rounded, label: 'Beranda'),
    _NavData(icon: Icons.assignment_rounded, label: 'Ujian'),
    _NavData(icon: Icons.history_rounded, label: 'Riwayat'),
    _NavData(icon: Icons.person_rounded, label: 'Profil'),
  ];

  @override
  Widget build(BuildContext context) {
    final currentIndex = navigationShell.currentIndex;

    return Scaffold(
      extendBody: true,
      body: navigationShell,
      bottomNavigationBar: SafeArea(
        top: false,
        child: Container(
          margin: const EdgeInsets.fromLTRB(20, 0, 20, 14),
          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 6),
          height: 62,
          decoration: BoxDecoration(
            color: AppColors.surface,
            borderRadius: BorderRadius.circular(32),
            boxShadow: AppShadows.floatingNav,
            border: Border.all(color: AppColors.border.withValues(alpha: 0.8), width: 1),
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceEvenly,
            children: List.generate(_navItems.length, (index) {
              final isSelected = index == currentIndex;
              final item = _navItems[index];

              return BouncingButton(
                onTap: () {
                  navigationShell.goBranch(
                    index,
                    initialLocation: index == currentIndex,
                  );
                },
                child: AnimatedContainer(
                  duration: const Duration(milliseconds: 260),
                  curve: Curves.easeOutCubic,
                  padding: EdgeInsets.symmetric(
                    horizontal: isSelected ? 16 : 12,
                    vertical: 8,
                  ),
                  decoration: BoxDecoration(
                    color: isSelected ? AppColors.primaryContainer : Colors.transparent,
                    borderRadius: BorderRadius.circular(24),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      AnimatedScale(
                        scale: isSelected ? 1.08 : 1.0,
                        duration: const Duration(milliseconds: 200),
                        curve: Curves.easeOutBack,
                        child: Icon(
                          item.icon,
                          size: 22,
                          color: isSelected ? AppColors.primary : AppColors.textMuted,
                        ),
                      ),
                      if (isSelected) ...[
                        const SizedBox(width: 6),
                        AnimatedOpacity(
                          opacity: isSelected ? 1.0 : 0.0,
                          duration: const Duration(milliseconds: 200),
                          child: Text(
                            item.label,
                            style: const TextStyle(
                              color: AppColors.primary,
                              fontWeight: FontWeight.w700,
                              fontSize: 13,
                              letterSpacing: -0.2,
                            ),
                          ),
                        ),
                      ],
                    ],
                  ),
                ),
              );
            }),
          ),
        ),
      ),
    );
  }
}

class _NavData {
  final IconData icon;
  final String label;
  const _NavData({required this.icon, required this.label});
}
