import 'dart:io';
import 'package:file_selector/file_selector.dart';
import 'package:flutter/material.dart';
import 'package:path_provider/path_provider.dart';
import 'package:share_plus/share_plus.dart';
import '../../../core/widgets/picket_widgets.dart';
import '../../finance/presentation/state/finance_controller.dart';
import '../data/backup_service.dart';

class BackupScreen extends StatefulWidget {
  const BackupScreen({super.key, required this.controller});
  final FinanceController controller;
  @override
  State<BackupScreen> createState() => _BackupScreenState();
}

class _BackupScreenState extends State<BackupScreen> {
  final password = TextEditingController();
  bool busy = false;
  @override
  void dispose() {
    password.dispose();
    super.dispose();
  }

  Future<void> perform(Future<void> Function() task) async {
    setState(() => busy = true);
    await performSave(context, task);
    if (mounted) setState(() => busy = false);
  }

  Future<void> share(String contents, String extension) async {
    final directory = await getTemporaryDirectory();
    final file = File(
      '${directory.path}/picket-${DateTime.now().millisecondsSinceEpoch}.$extension',
    );
    await file.writeAsString(contents, flush: true);
    await SharePlus.instance.share(
      ShareParams(files: [XFile(file.path)], title: 'Dữ liệu Picket'),
    );
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(title: const Text('Xuất và sao lưu dữ liệu')),
    body: SafeArea(
      child: ListView(
        padding: const EdgeInsets.all(24),
        children: [
          const Text(
            'Mang dữ liệu của bạn theo',
            style: TextStyle(fontSize: 26, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 16),
          const Text(
            'CSV chứa thông tin giao dịch dạng đọc được. Bản sao .picket gồm dữ liệu và ảnh, được mã hoá bằng mật khẩu riêng.',
          ),
          const SizedBox(height: 20),
          OutlinedButton.icon(
            onPressed: busy
                ? null
                : () => perform(
                    () => share(exportCsv(widget.controller.data), 'csv'),
                  ),
            icon: const Icon(Icons.table_view_outlined),
            label: const Text('Xuất giao dịch CSV'),
          ),
          const SizedBox(height: 24),
          TextField(
            controller: password,
            obscureText: true,
            decoration: const InputDecoration(
              labelText: 'Mật khẩu bản sao (ít nhất 12 ký tự)',
            ),
          ),
          const SizedBox(height: 16),
          FilledButton(
            onPressed: busy
                ? null
                : () => perform(() async {
                    await share(
                      await BackupService().export(
                        widget.controller.data,
                        password.text,
                      ),
                      'picket',
                    );
                  }),
            child: const Text('Tạo bản sao mã hoá'),
          ),
          const SizedBox(height: 16),
          OutlinedButton(
            onPressed: busy
                ? null
                : () => perform(() async {
                    final file = await openFile(
                      acceptedTypeGroups: [
                        const XTypeGroup(
                          label: 'Picket backup',
                          extensions: ['picket'],
                        ),
                      ],
                    );
                    if (file == null) return;
                    if (await file.length() > 100000000) {
                      throw ArgumentError('Bản sao quá lớn.');
                    }
                    final restored = await BackupService().restore(
                      await file.readAsString(),
                      password.text,
                    );
                    if (!context.mounted) return;
                    final confirmed = await showDialog<bool>(
                      context: context,
                      builder: (context) => AlertDialog(
                        title: const Text('Khôi phục bản sao?'),
                        content: Text(
                          'Thay dữ liệu hiện tại bằng ${restored.entries.length} giao dịch và ${restored.wallets.length} ví từ bản sao. Hãy xuất bản sao hiện tại trước nếu cần giữ lại.',
                        ),
                        actions: [
                          TextButton(
                            onPressed: () => Navigator.pop(context, false),
                            child: const Text('Huỷ'),
                          ),
                          FilledButton(
                            onPressed: () => Navigator.pop(context, true),
                            child: const Text('Khôi phục'),
                          ),
                        ],
                      ),
                    );
                    if (confirmed == true) {
                      await widget.controller.update((_) => restored);
                    }
                  }),
            child: const Text('Khôi phục từ bản sao'),
          ),
          if (busy)
            const Padding(
              padding: EdgeInsets.all(20),
              child: Center(child: CircularProgressIndicator()),
            ),
        ],
      ),
    ),
  );
}
