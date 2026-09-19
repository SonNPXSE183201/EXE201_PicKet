import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../../core/notifications/reminder_service.dart';
import '../../../core/widgets/picket_widgets.dart';
import '../../finance/data/repositories_impl/cloud_finance_repository.dart';
import '../../finance/presentation/state/finance_controller.dart';
import '../data/account_service.dart';

class DeleteAccountScreen extends StatefulWidget {
  const DeleteAccountScreen({super.key, required this.controller});
  final FinanceController controller;
  @override
  State<DeleteAccountScreen> createState() => _DeleteAccountScreenState();
}

class _DeleteAccountScreenState extends State<DeleteAccountScreen> {
  final password = TextEditingController(),
      confirmation = TextEditingController();
  bool busy = false;
  @override
  void dispose() {
    password.dispose();
    confirmation.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => PopScope(
    canPop: !busy,
    child: Scaffold(
      appBar: AppBar(title: const Text('Xóa tài khoản')),
      body: ListView(
        padding: const EdgeInsets.all(24),
        children: [
          const Text(
            'Xóa vĩnh viễn tài khoản, sổ thu chi và ảnh đã đồng bộ. Hãy xuất bản sao trước nếu cần giữ dữ liệu. Thao tác này không tự hủy gói đăng ký Google Play; hãy hủy gia hạn trong Google Play trước.',
          ),
          const SizedBox(height: 24),
          TextField(
            controller: password,
            obscureText: true,
            decoration: const InputDecoration(labelText: 'Mật khẩu hiện tại'),
          ),
          const SizedBox(height: 16),
          TextField(
            controller: confirmation,
            decoration: const InputDecoration(
              labelText: 'Nhập XOA để xác nhận',
            ),
          ),
          const SizedBox(height: 24),
          FilledButton(
            onPressed:
                busy || widget.controller.saving || widget.controller.syncing
                ? null
                : () async {
                    if (confirmation.text.trim() != 'XOA' ||
                        password.text.isEmpty) {
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(
                          content: Text('Nhập mật khẩu và XOA để xác nhận.'),
                        ),
                      );
                      return;
                    }
                    setState(() => busy = true);
                    await performSave(
                      context,
                      () => widget.controller.runExclusive(() async {
                        await ReminderService.instance.cancel();
                        await AccountService(Supabase.instance.client).delete(
                          password.text,
                          widget.controller.actions.repository
                              as CloudFinanceRepository,
                          widget.controller.data,
                        );
                      }),
                    );
                    if (mounted) setState(() => busy = false);
                  },
            child: Text(busy ? 'Đang xóa…' : 'Xóa vĩnh viễn'),
          ),
        ],
      ),
    ),
  );
}
