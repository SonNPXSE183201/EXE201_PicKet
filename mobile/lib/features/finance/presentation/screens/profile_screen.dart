import 'package:supabase_flutter/supabase_flutter.dart';
import '../../../admin/data/admin_repository.dart';
import '../../../admin/presentation/admin_screen.dart';
import '../../../billing/presentation/pricing_screen.dart';
import 'package:flutter/material.dart';
import '../../../../core/theme/picket_theme.dart';
import '../../../../core/widgets/picket_widgets.dart';
import '../state/finance_controller.dart';
import 'wallets_screen.dart';
import 'activity_tools_screen.dart';
import '../../../settings/presentation/backup_screen.dart';
import '../../../settings/presentation/notifications_screen.dart';
import '../../../settings/presentation/security_settings_screen.dart';
import 'keepsakes_screen.dart';
import 'insights_screen.dart';

class ProfileScreen extends StatelessWidget {
  const ProfileScreen({super.key, required this.controller});
  final FinanceController controller;
  Future<void> editName(BuildContext context) async {
    final name = TextEditingController(text: controller.data.name);
    final accepted = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Tên hiển thị'),
        content: TextField(controller: name, maxLength: 80),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Hủy'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(context, true),
            child: const Text('Lưu'),
          ),
        ],
      ),
    );
    if (accepted == true && context.mounted) {
      await performSave(
        context,
        () => controller.update((data) {
          if (name.text.trim().isEmpty) {
            throw ArgumentError('Nhập tên hiển thị.');
          }
          return data.copyWith(name: name.text.trim());
        }),
      );
    }
    name.dispose();
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(title: const Text('Góc của bạn')),
    body: ListenableBuilder(
      listenable: controller,
      builder: (context, _) => ListView(
        padding: const EdgeInsets.all(24),
        children: [
          const CircleAvatar(
            radius: 40,
            backgroundColor: PicketColors.peach,
            child: Icon(
              Icons.person_outline,
              size: 44,
              color: PicketColors.ink,
            ),
          ),
          const SizedBox(height: 16),
          Text(
            controller.data.name,
            textAlign: TextAlign.center,
            style: const TextStyle(fontSize: 28, fontWeight: FontWeight.bold),
          ),
          TextButton(
            onPressed: () => editName(context),
            child: const Text('Chỉnh sửa hồ sơ'),
          ),
          const SizedBox(height: 8),
          const Text(
            'Mỗi ngày một chút, chủ động hơn với tiền.',
            textAlign: TextAlign.center,
          ),
          if (controller.cloudEnabled)
            FutureBuilder<bool>(
              future: AdminRepository(Supabase.instance.client).isStaff(),
              builder: (context, snapshot) => snapshot.data == true
                  ? ListTile(
                      leading: const Icon(Icons.admin_panel_settings_outlined),
                      title: const Text('Quản trị'),
                      onTap: () => Navigator.push(
                        context,
                        MaterialPageRoute<void>(
                          builder: (_) => const AdminScreen(),
                        ),
                      ),
                    )
                  : const SizedBox.shrink(),
            ),
          const SizedBox(height: 28),
          Surface(
            child: Column(
              children: [
                ListTile(
                  leading: const Icon(Icons.workspace_premium_outlined),
                  title: const Text('Gói Picket'),
                  enabled: controller.cloudEnabled,
                  onTap: () => Navigator.push(
                    context,
                    MaterialPageRoute<void>(
                      builder: (_) => const PricingScreen(),
                    ),
                  ),
                ),
                ListTile(
                  leading: const Icon(Icons.security),
                  title: const Text('Bảo mật và đồng bộ'),
                  onTap: () => Navigator.push(
                    context,
                    MaterialPageRoute<void>(
                      builder: (_) =>
                          SecuritySettingsScreen(controller: controller),
                    ),
                  ),
                ),
                ListTile(
                  leading: const Icon(Icons.backup_outlined),
                  title: const Text('Xuất dữ liệu và sao lưu'),
                  onTap: () => Navigator.push(
                    context,
                    MaterialPageRoute<void>(
                      builder: (_) => BackupScreen(controller: controller),
                    ),
                  ),
                ),
                ListTile(
                  leading: const Icon(Icons.notifications_outlined),
                  title: const Text('Thông báo'),
                  onTap: () => Navigator.push(
                    context,
                    MaterialPageRoute<void>(
                      builder: (_) =>
                          NotificationsScreen(controller: controller),
                    ),
                  ),
                ),
                ListTile(
                  leading: const Icon(Icons.category_outlined),
                  title: const Text('Danh mục'),
                  onTap: () => Navigator.push(
                    context,
                    MaterialPageRoute<void>(
                      builder: (_) => CategoriesScreen(controller: controller),
                    ),
                  ),
                ),
                ListTile(
                  leading: const Icon(Icons.account_balance_wallet_outlined),
                  title: const Text('Quản lý ví'),
                  trailing: const Icon(Icons.chevron_right),
                  onTap: () => Navigator.push(
                    context,
                    MaterialPageRoute<void>(
                      builder: (_) => WalletsScreen(controller: controller),
                    ),
                  ),
                ),
                ListTile(
                  leading: const Icon(Icons.photo_album_outlined),
                  title: const Text('Bộ sưu tập riêng tư'),
                  trailing: const Icon(Icons.chevron_right),
                  onTap: () => Navigator.push(
                    context,
                    MaterialPageRoute<void>(
                      builder: (_) => KeepsakesScreen(controller: controller),
                    ),
                  ),
                ),
                ListTile(
                  leading: const Icon(Icons.bar_chart),
                  title: const Text('Báo cáo thu chi'),
                  trailing: const Icon(Icons.chevron_right),
                  onTap: () => Navigator.push(
                    context,
                    MaterialPageRoute<void>(
                      builder: (_) => InsightsScreen(controller: controller),
                    ),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 20),
          Surface(
            child: SwitchListTile(
              contentPadding: EdgeInsets.zero,
              title: const Text('Ẩn số dư'),
              subtitle: const Text('Trên trang chủ và thẻ ví'),
              value: controller.data.hideBalance,
              onChanged: controller.saving
                  ? null
                  : (value) => performSave(
                      context,
                      () => controller.update(
                        (data) => data.copyWith(hideBalance: value),
                      ),
                    ),
            ),
          ),
          const SizedBox(height: 20),
          const Surface(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Icon(Icons.lock_outline, color: PicketColors.mauve),
                SizedBox(height: 12),
                Text(
                  'Kho dữ liệu riêng tư',
                  style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                ),
                SizedBox(height: 8),
                Text(
                  'Dữ liệu tài chính được mã hóa trên thiết bị. Bạn có thể xuất CSV hoặc tạo bản sao lưu mã hóa kèm ảnh trong phần sao lưu.',
                  style: TextStyle(height: 1.5),
                ),
                SizedBox(height: 12),
                Text(
                  'Picket · Android · 1.0.0',
                  style: TextStyle(color: PicketColors.muted, fontSize: 12),
                ),
              ],
            ),
          ),
        ],
      ),
    ),
  );
}
