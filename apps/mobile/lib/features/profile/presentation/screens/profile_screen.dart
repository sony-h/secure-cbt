import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:secure_cbt_mobile/features/auth/providers/auth_provider.dart';
import 'package:device_info_plus/device_info_plus.dart';
import 'dart:io';

class ProfileScreen extends ConsumerStatefulWidget {
  const ProfileScreen({super.key});

  @override
  ConsumerState<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends ConsumerState<ProfileScreen> {
  String _deviceModel = '';
  String _osVersion = '';

  @override
  void initState() {
    super.initState();
    _loadDeviceInfo();
  }

  Future<void> _loadDeviceInfo() async {
    try {
      final deviceInfo = DeviceInfoPlugin();
      if (Platform.isAndroid) {
        final android = await deviceInfo.androidInfo;
        setState(() {
          _deviceModel = android.model;
          _osVersion = 'Android ${android.version.release}';
        });
      }
    } catch (_) {}
  }

  Future<void> _logoutConfirm() async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Keluar dari Aplikasi?'),
        content: const Text('Anda harus masuk kembali untuk mengakses ujian.'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('BATAL')),
          TextButton(onPressed: () => Navigator.pop(ctx, true), child: const Text('KELUAR', style: TextStyle(color: Colors.red))),
        ],
      ),
    );
    if (confirm == true && mounted) {
      await ref.read(authProvider.notifier).logout();
      if (mounted) context.goNamed('login');
    }
  }

  @override
  Widget build(BuildContext context) {
    final auth = ref.watch(authProvider);
    final theme = Theme.of(context);

    return Scaffold(
      backgroundColor: theme.scaffoldBackgroundColor,
      appBar: AppBar(title: const Text('Profil', style: TextStyle(fontWeight: FontWeight.bold))),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Column(
          children: [
            // Avatar
            CircleAvatar(
              radius: 44,
              backgroundColor: theme.colorScheme.primary,
              child: Text((auth.fullName ?? '?')[0].toUpperCase(), style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 36)),
            ),
            const SizedBox(height: 12),
            Text(auth.fullName ?? '—', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 18, color: Color(0xFF0F172A))),
            const SizedBox(height: 4),
            Text('NIS: ${auth.nis ?? '—'}', style: const TextStyle(fontSize: 14, color: Color(0xFF64748B))),
            Text('Kelas: ${auth.className ?? '—'}', style: const TextStyle(fontSize: 14, color: Color(0xFF64748B))),
            const SizedBox(height: 28),

            // Personal Info Card
            _InfoCard(
              title: 'Informasi Pribadi',
              children: [
                _InfoRow(label: 'Nama Lengkap', value: auth.fullName ?? '—'),
                _InfoRow(label: 'NIS', value: auth.nis ?? '—'),
                _InfoRow(label: 'Kelas', value: auth.className ?? '—'),
                _InfoRow(label: 'Username', value: auth.username ?? '—'),
              ],
            ),
            const SizedBox(height: 14),

            // Device Info Card
            _InfoCard(
              title: 'Perangkat',
              children: [
                _InfoRow(label: 'Model', value: _deviceModel.isNotEmpty ? _deviceModel : 'Memuat...'),
                _InfoRow(label: 'OS', value: _osVersion.isNotEmpty ? _osVersion : 'Memuat...'),
              ],
            ),
            const SizedBox(height: 32),

            // Logout Button
            SizedBox(
              width: double.infinity,
              height: 48,
              child: ElevatedButton.icon(
                onPressed: _logoutConfirm,
                icon: const Icon(Icons.logout_rounded, size: 18),
                label: const Text('Keluar', style: TextStyle(fontWeight: FontWeight.bold)),
                style: ElevatedButton.styleFrom(
                  backgroundColor: Colors.red.shade600,
                  foregroundColor: Colors.white,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                ),
              ),
            ),
            const SizedBox(height: 20),
          ],
        ),
      ),
    );
  }
}

class _InfoCard extends StatelessWidget {
  final String title;
  final List<Widget> children;
  const _InfoCard({required this.title, required this.children});

  @override
  Widget build(BuildContext context) {
    return Card(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14), side: const BorderSide(color: Color(0xFFE2E8F0))),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(title, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: Color(0xFF334155))),
            const SizedBox(height: 12),
            ...children,
          ],
        ),
      ),
    );
  }
}

class _InfoRow extends StatelessWidget {
  final String label;
  final String value;
  const _InfoRow({required this.label, required this.value});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: const TextStyle(fontSize: 13, color: Color(0xFF64748B))),
          Text(value, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: Color(0xFF0F172A))),
        ],
      ),
    );
  }
}