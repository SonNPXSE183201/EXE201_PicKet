import 'delete_account_screen.dart';
import 'package:flutter/material.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:local_auth/local_auth.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../../core/notifications/reminder_service.dart';
import '../../../core/security/device_lock.dart';
import '../../../core/widgets/picket_widgets.dart';
import '../../finance/presentation/state/finance_controller.dart';

class SecuritySettingsScreen extends StatefulWidget {
  const SecuritySettingsScreen({super.key, required this.controller});
  final FinanceController controller;
  @override
  State<SecuritySettingsScreen> createState() => _SecuritySettingsScreenState();
}

class _SecuritySettingsScreenState extends State<SecuritySettingsScreen> {
  bool? locked;
  bool busy = false;
  @override
  void initState() {
    super.initState();
    load();
  }

  Future<void> load() async {
    try {
      final value = await const FlutterSecureStorage().read(
        key: DeviceLock.storageKey,
      );
      if (mounted) setState(() => locked = value == 'true');
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Không đọc được cài đặt bảo vệ.')),
        );
      }
    }
  }

  Future<void> toggleLock(bool value) async {
    setState(() => busy = true);
    await performSave(context, () async {
      final ok = await LocalAuthentication().authenticate(
        localizedReason: 'Xác nhận thay đổi khóa Picket',
      );
      if (!ok) return;
      await const FlutterSecureStorage().write(
        key: DeviceLock.storageKey,
        value: '$value',
      );
      if (mounted) setState(() => locked = value);
    });
    if (mounted) setState(() => busy = false);
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(title: const Text('Bảo mật và đồng bộ')),
    body: ListenableBuilder(
      listenable: widget.controller,
      builder: (context, _) {
        final controller = widget.controller;
        return ListView(
          padding: const EdgeInsets.all(24),
          children: [
            SwitchListTile(
              title: const Text('Khóa bằng xác thực thiết bị'),
              subtitle: const Text(
                'Dùng sinh trắc học hoặc mã khóa khi mở lại ứng dụng.',
              ),
              value: locked ?? false,
              onChanged: busy || locked == null ? null : toggleLock,
            ),
            SwitchListTile(
              title: const Text('Nhắc hạn thanh toán'),
              value: controller.data.preferences['notifications'] == true,
              onChanged: controller.saving
                  ? null
                  : (value) => performSave(context, () async {
                      if (value &&
                          !await ReminderService.instance.requestPermission()) {
                        throw ArgumentError(
                          'Hãy cho phép thông báo trong cài đặt Android.',
                        );
                      }
                      await controller.update(
                        (data) => data.copyWith(
                          preferences: {
                            ...data.preferences,
                            'notifications': value,
                          },
                        ),
                      );
                    }),
            ),
            const Divider(),
            Text(
              controller.cloudEnabled
                  ? 'Dữ liệu được lưu trên thiết bị và đồng bộ với tài khoản của bạn.'
                  : 'Chế độ trên thiết bị. Hãy xuất bản sao trước khi gỡ ứng dụng.',
            ),
            if (controller.cloudEnabled) ...[
              const SizedBox(height: 16),
              Text(controller.syncMessage ?? 'Chưa có trạng thái đồng bộ.'),
              FilledButton.tonal(
                onPressed: controller.syncing ? null : controller.synchronize,
                child: Text(
                  controller.syncing ? 'Đang đồng bộ…' : 'Đồng bộ ngay',
                ),
              ),
              if (controller.hasSyncConflict) ...[
                const Text(
                  'Hai thiết bị đã sửa dữ liệu cùng lúc. Hãy xuất bản sao trước khi chọn bản dữ liệu cần giữ. Lựa chọn áp dụng cho toàn bộ sổ thu chi.',
                ),
                for (final keepLocal in [true, false])
                  TextButton(
                    onPressed: controller.saving || controller.syncing
                        ? null
                        : () async {
                            final accepted = await showDialog<bool>(
                              context: context,
                              builder: (dialogContext) => AlertDialog(
                                title: Text(
                                  keepLocal
                                      ? 'Giữ dữ liệu trên máy?'
                                      : 'Nhận dữ liệu máy chủ?',
                                ),
                                content: const Text(
                                  'Thay thế toàn bộ bản còn lại. Nên xuất bản sao của cả hai thiết bị trước khi tiếp tục.',
                                ),
                                actions: [
                                  TextButton(
                                    onPressed: () =>
                                        Navigator.pop(dialogContext, false),
                                    child: const Text('Hủy'),
                                  ),
                                  FilledButton(
                                    onPressed: () =>
                                        Navigator.pop(dialogContext, true),
                                    child: const Text('Xác nhận'),
                                  ),
                                ],
                              ),
                            );
                            if (accepted == true && context.mounted) {
                              await performSave(
                                context,
                                () => controller.resolveConflict(keepLocal),
                              );
                            }
                          },
                    child: Text(
                      keepLocal ? 'Giữ bản trên máy' : 'Dùng bản máy chủ',
                    ),
                  ),
              ],
              TextButton(
                onPressed: controller.saving || controller.syncing
                    ? null
                    : () => Navigator.push(
                        context,
                        MaterialPageRoute<void>(
                          builder: (_) =>
                              DeleteAccountScreen(controller: controller),
                        ),
                      ),
                child: const Text('Xóa tài khoản'),
              ),
              const SizedBox(height: 24),
              OutlinedButton(
                onPressed: controller.saving || controller.syncing
                    ? null
                    : () => performSave(context, () async {
                        await ReminderService.instance.cancel();
                        await Supabase.instance.client.auth.signOut(
                          scope: SignOutScope.local,
                        );
                        if (context.mounted) {
                          Navigator.of(
                            context,
                          ).popUntil((route) => route.isFirst);
                        }
                      }),
                child: const Text('Đăng xuất trên thiết bị này'),
              ),
            ],
          ],
        );
      },
    ),
  );
}
