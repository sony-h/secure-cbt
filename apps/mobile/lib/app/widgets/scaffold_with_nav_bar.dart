import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

class ScaffoldWithNavBar extends StatelessWidget {
  final StatefulNavigationShell navigationShell;

  const ScaffoldWithNavBar({super.key, required this.navigationShell});

  static const _navIcons = [
    Icons.home_rounded,
    Icons.assignment_rounded,
    Icons.history_rounded,
    Icons.person_rounded,
  ];

  static const _navLabels = ['Beranda', 'Ujian', 'Riwayat', 'Profil'];

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final currentIndex = navigationShell.currentIndex;

    return Scaffold(
      body: navigationShell,
      bottomNavigationBar: NavigationBar(
        selectedIndex: currentIndex,
        onDestinationSelected: (index) {
          navigationShell.goBranch(index, initialLocation: index == currentIndex);
        },
        backgroundColor: theme.colorScheme.surface,
        indicatorColor: theme.colorScheme.primary.withValues(alpha: 0.1),
        elevation: 6,
        surfaceTintColor: theme.colorScheme.primary.withValues(alpha: 0.08),
        shadowColor: theme.colorScheme.shadow.withValues(alpha: 0.15),
        height: 64,
        destinations: [
          for (var i = 0; i < _navIcons.length; i++)
            NavigationDestination(
              icon: AnimatedScale(
                scale: i == currentIndex ? 1.1 : 1.0,
                duration: const Duration(milliseconds: 200),
                child: Icon(_navIcons[i]),
              ),
              label: _navLabels[i],
            ),
        ],
        labelBehavior: NavigationDestinationLabelBehavior.alwaysShow,
      ),
    );
  }
}
