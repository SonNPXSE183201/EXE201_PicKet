import 'dart:io';
import 'package:flutter/material.dart';
import '../../../../core/theme/picket_theme.dart';
import '../../../../core/utils/formatters.dart';
import '../../../../core/widgets/picket_widgets.dart';
import '../../domain/entities/finance_data.dart';
import '../state/finance_controller.dart';
import 'entry_form_screen.dart';
import 'amount_editor_screen.dart';
import 'split_entry_screen.dart';
import '../../domain/usecases/finance_actions.dart';

class EntryDetailScreen extends StatelessWidget {
  const EntryDetailScreen({
    super.key,
    required this.controller,
    required this.id,
  });
  final FinanceController controller;
  final String id;
  @override
  Widget build(BuildContext context) => ListenableBuilder(
    listenable: controller,
    builder: (context, _) {
      final matches = controller.data.entries.where((e) => e.id == id);
      if (matches.isEmpty) {
        return Scaffold(
          appBar: AppBar(),
          body: const Center(child: Text('Giao dịch đã được xoá.')),
        );
      }
      final entry = matches.first;
      String walletName(String? id) =>
          controller.data.wallets.where((w) => w.id == id).firstOrNull?.name ??
          'Không xác định';
      return Scaffold(
        appBar: AppBar(
          title: const Text('Chi tiết giao dịch'),
          actions: [
            IconButton(
              tooltip: 'Chỉnh sửa',
              onPressed: () => Navigator.push(
                context,
                MaterialPageRoute<void>(
                  builder: (_) =>
                      EntryFormScreen(controller: controller, entry: entry),
                ),
              ),
              icon: const Icon(Icons.edit_outlined),
            ),
          ],
        ),
        body: SafeArea(
          child: ListView(
            padding: const EdgeInsets.all(24),
            children: [
              const SizedBox(height: 20),
              CircleAvatar(
                radius: 36,
                backgroundColor: PicketColors.peach,
                child: Icon(
                  categoryIcon(entry.category),
                  size: 32,
                  color: PicketColors.ink,
                ),
              ),
              const SizedBox(height: 20),
              Text(
                entry.title,
                textAlign: TextAlign.center,
                style: const TextStyle(
                  fontSize: 24,
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 12),
              Text(
                '${entry.type == EntryType.expense
                    ? '-'
                    : entry.type == EntryType.income
                    ? '+'
                    : ''}${money(entry.amount)}',
                textAlign: TextAlign.center,
                style: const TextStyle(
                  fontSize: 34,
                  fontWeight: FontWeight.w800,
                ),
              ),
              const SizedBox(height: 28),
              Surface(
                child: Column(
                  children: [
                    ListTile(
                      title: const Text('Danh mục'),
                      trailing: Text(entry.category),
                    ),
                    ListTile(
                      title: const Text('Ngày'),
                      trailing: Text(shortDate(entry.date)),
                    ),
                    ListTile(
                      title: const Text('Ví'),
                      trailing: Text(walletName(entry.walletId)),
                    ),
                    if (entry.type == EntryType.transfer)
                      ListTile(
                        title: const Text('Ví nhận'),
                        trailing: Text(walletName(entry.destinationId)),
                      ),
                  ],
                ),
              ),
              if (entry.note.isNotEmpty)
                Padding(
                  padding: const EdgeInsets.only(top: 20),
                  child: Surface(child: Text(entry.note)),
                ),
              if (entry.receiptPath != null)
                Padding(
                  padding: const EdgeInsets.only(top: 20),
                  child: ClipRRect(
                    borderRadius: BorderRadius.circular(20),
                    child: Image.file(
                      File(entry.receiptPath!),
                      errorBuilder: (_, _, _) =>
                          const Text('Không tìm thấy ảnh hoá đơn.'),
                    ),
                  ),
                ),
              const SizedBox(height: 24),
              if (entry.type == EntryType.expense) ...[
                OutlinedButton.icon(
                  onPressed: () => Navigator.push(
                    context,
                    MaterialPageRoute<void>(
                      builder: (_) => SplitEntryScreen(
                        controller: controller,
                        entry: entry,
                      ),
                    ),
                  ),
                  icon: const Icon(Icons.call_split),
                  label: const Text('Tách danh mục'),
                ),
                const SizedBox(height: 12),
                OutlinedButton.icon(
                  onPressed: () => Navigator.push(
                    context,
                    MaterialPageRoute<void>(
                      builder: (_) => AmountEditorScreen(
                        heading: 'Ghi nhận hoàn tiền',
                        initialName: 'Hoàn tiền',
                        help:
                            'Khoản hoàn làm giảm chi tiêu, không tính là thu nhập.',
                        onSave: (note, amount, _) => controller.update(
                          (data) => controller.actions.refund(
                            data,
                            entry,
                            amount,
                            note,
                          ),
                        ),
                      ),
                    ),
                  ),
                  icon: const Icon(Icons.undo),
                  label: const Text('Hoàn tiền'),
                ),
              ],
              if (entry.parts.isNotEmpty)
                ...entry.parts.map(
                  (part) => ListTile(
                    title: Text(part.category),
                    trailing: Text(money(part.amount)),
                  ),
                ),
              TextButton.icon(
                onPressed: controller.saving
                    ? null
                    : () async {
                        if (!await confirmDelete(
                          context,
                          'Số dư ví và ngân sách sẽ được tính lại. Hoá đơn liên kết sẽ trở về chưa thanh toán.',
                        )) {
                          return;
                        }
                        if (!context.mounted) return;
                        final saved = await performSave(
                          context,
                          () => controller.deleteEntry(entry.id),
                        );
                        if (saved && context.mounted) Navigator.pop(context);
                      },
                icon: const Icon(Icons.delete_outline),
                label: const Text('Xoá giao dịch'),
              ),
            ],
          ),
        ),
      );
    },
  );
}
