import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:secure_cbt_mobile/core/network/server_config_provider.dart';
import 'package:secure_cbt_mobile/core/theme/theme.dart';
import 'package:secure_cbt_mobile/core/widgets/bouncing_button.dart';

class ServerConfigDialog extends ConsumerStatefulWidget {
  const ServerConfigDialog({super.key});

  @override
  ConsumerState<ServerConfigDialog> createState() => _ServerConfigDialogState();
}

class _ServerConfigDialogState extends ConsumerState<ServerConfigDialog> {
  late final TextEditingController _urlController;
  bool _isTesting = false;
  bool? _testSuccess;
  String? _testMessage;

  @override
  void initState() {
    super.initState();
    final config = ref.read(serverConfigProvider);
    _urlController = TextEditingController(text: config.apiHost);
  }

  @override
  void dispose() {
    _urlController.dispose();
    super.dispose();
  }

  Future<void> _handleTest() async {
    final candidate = _urlController.text.trim();
    if (candidate.isEmpty) return;

    setState(() {
      _isTesting = true;
      _testSuccess = null;
      _testMessage = null;
    });

    final success =
        await ref.read(serverConfigProvider.notifier).testConnection(candidate);

    if (mounted) {
      setState(() {
        _isTesting = false;
        _testSuccess = success;
        _testMessage = success
            ? 'Terhubung dengan server CBT (OK)'
            : 'Gagal terhubung. Pastikan IP dan port benar.';
      });
    }
  }

  Future<void> _handleSave() async {
    final candidate = _urlController.text.trim();
    if (candidate.isEmpty) return;

    await ref.read(serverConfigProvider.notifier).setServerUrl(candidate);
    if (mounted) {
      Navigator.of(context).pop();
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Alamat server diatur ke $candidate'),
          backgroundColor: AppColors.success,
          behavior: SnackBarBehavior.floating,
        ),
      );
    }
  }

  Future<void> _handleReset() async {
    await ref.read(serverConfigProvider.notifier).resetToDefault();
    if (mounted) {
      Navigator.of(context).pop();
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Alamat server dikembalikan ke bawaan'),
          backgroundColor: AppColors.primary,
          behavior: SnackBarBehavior.floating,
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final config = ref.watch(serverConfigProvider);

    return Dialog(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
      backgroundColor: AppColors.surface,
      insetPadding: const EdgeInsets.symmetric(horizontal: 20, vertical: 24),
      child: SingleChildScrollView(
        padding: const EdgeInsets.all(22),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: AppColors.primaryContainer,
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: const Icon(
                    Icons.dns_rounded,
                    color: AppColors.primary,
                    size: 22,
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'Pengaturan Server CBT',
                        style: TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.w700,
                          color: AppColors.textPrimary,
                        ),
                      ),
                      const SizedBox(height: 2),
                      Row(
                        children: [
                          Container(
                            width: 7,
                            height: 7,
                            decoration: BoxDecoration(
                              shape: BoxShape.circle,
                              color: config.isCustom
                                  ? AppColors.warning
                                  : AppColors.success,
                            ),
                          ),
                          const SizedBox(width: 5),
                          Text(
                            config.isCustom ? 'Server Kustom' : 'Server Bawaan',
                            style: TextStyle(
                              fontSize: 12,
                              color: config.isCustom
                                  ? AppColors.warning
                                  : AppColors.textSecondary,
                              fontWeight: FontWeight.w500,
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 18),
            const Text(
              'Alamat IP / Domain Server:',
              style: TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w600,
                color: AppColors.textPrimary,
              ),
            ),
            const SizedBox(height: 6),
            TextField(
              controller: _urlController,
              keyboardType: TextInputType.url,
              autocorrect: false,
              enableSuggestions: false,
              style: const TextStyle(
                fontSize: 14,
                fontFamily: 'monospace',
                color: AppColors.textPrimary,
              ),
              decoration: InputDecoration(
                hintText: '192.168.1.100:3000',
                hintStyle: const TextStyle(color: AppColors.textMuted),
                filled: true,
                fillColor: AppColors.canvas,
                contentPadding:
                    const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: const BorderSide(color: AppColors.border),
                ),
                enabledBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: const BorderSide(color: AppColors.border),
                ),
                focusedBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: const BorderSide(color: AppColors.primary, width: 1.5),
                ),
              ),
            ),
            const SizedBox(height: 6),
            const Text(
              'Contoh: 192.168.1.100:3000 atau https://cbt.sekolah.sch.id',
              style: TextStyle(fontSize: 11.5, color: AppColors.textSecondary),
            ),
            const SizedBox(height: 14),

            // Test status banner
            if (_testMessage != null)
              Container(
                margin: const EdgeInsets.only(bottom: 12),
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                decoration: BoxDecoration(
                  color: _testSuccess == true
                      ? AppColors.successContainer
                      : AppColors.errorContainer,
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Row(
                  children: [
                    Icon(
                      _testSuccess == true
                          ? Icons.check_circle_rounded
                          : Icons.cancel_rounded,
                      size: 16,
                      color: _testSuccess == true
                          ? AppColors.success
                          : AppColors.error,
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        _testMessage!,
                        style: TextStyle(
                          fontSize: 12,
                          color: _testSuccess == true
                              ? AppColors.success
                              : AppColors.error,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ),
                  ],
                ),
              ),

            // Test Connection button
            OutlinedButton.icon(
              onPressed: _isTesting ? null : _handleTest,
              icon: _isTesting
                  ? const SizedBox(
                      width: 14,
                      height: 14,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    )
                  : const Icon(Icons.network_check_rounded, size: 18),
              label: Text(_isTesting ? 'Menguji Koneksi...' : 'Tes Koneksi'),
              style: OutlinedButton.styleFrom(
                foregroundColor: AppColors.primary,
                side: const BorderSide(color: AppColors.primaryContainer),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(10),
                ),
                padding: const EdgeInsets.symmetric(vertical: 10),
              ),
            ),
            const SizedBox(height: 16),

            // Dialog actions
            Row(
              children: [
                if (config.isCustom)
                  TextButton(
                    onPressed: _handleReset,
                    child: const Text(
                      'Bawaan',
                      style: TextStyle(color: AppColors.textSecondary),
                    ),
                  ),
                const Spacer(),
                TextButton(
                  onPressed: () => Navigator.of(context).pop(),
                  child: const Text('Batal'),
                ),
                const SizedBox(width: 8),
                BouncingButton(
                  onTap: _handleSave,
                  child: Container(
                    padding: const EdgeInsets.symmetric(
                        horizontal: 18, vertical: 10),
                    decoration: BoxDecoration(
                      color: AppColors.primary,
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: const Text(
                      'Simpan',
                      style: TextStyle(
                        color: Colors.white,
                        fontWeight: FontWeight.w600,
                        fontSize: 13.5,
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
