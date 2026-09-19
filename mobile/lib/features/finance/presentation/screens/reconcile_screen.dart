import '../../domain/usecases/reconciliation_actions.dart';
import 'package:flutter/material.dart';
import '../../../../core/utils/formatters.dart';
import '../../../../core/widgets/picket_widgets.dart';
import '../../domain/usecases/finance_actions.dart';
import '../state/finance_controller.dart';

class ReconcileScreen extends StatefulWidget {
  const ReconcileScreen({super.key, required this.controller});
  final FinanceController controller;
  @override
  State<ReconcileScreen> createState() => _ReconcileScreenState();
}

class _ReconcileScreenState extends State<ReconcileScreen> {
  late String walletId;
  final balance = TextEditingController(), reason = TextEditingController();
  final selected = <String>{};
  DateTime date = DateTime.now();
  bool busy = false;
  @override
  void initState() {
    super.initState();
    walletId = widget.controller.data.wallets.first.id;
    selected.addAll(
      widget.controller.data.entries
          .where((e) => e.isReconciledFor(walletId))
          .map((e) => e.id),
    );
  }

  @override
  void dispose() {
    balance.dispose();
    reason.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final data = widget.controller.data;
    final wallet = data.wallets.firstWhere((w) => w.id == walletId);
    final entries = data.entries
        .where(
          (e) =>
              (e.walletId == walletId || e.destinationId == walletId) &&
              !e.date.isAfter(
                DateTime(date.year, date.month, date.day, 23, 59, 59),
              ),
        )
        .toList();
    final total = walletBalance(
      data.copyWith(
        entries: entries.where((e) => selected.contains(e.id)).toList(),
      ),
      wallet,
    );
    final target = int.tryParse(balance.text);
    final difference = target == null ? null : target - total;
    return Scaffold(
      appBar: AppBar(title: const Text('Đối soát ví')),
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.all(20),
          children: [
            DropdownButtonFormField<String>(
              initialValue: walletId,
              items: data.wallets
                  .map(
                    (w) => DropdownMenuItem(value: w.id, child: Text(w.name)),
                  )
                  .toList(),
              onChanged: (v) => setState(() {
                walletId = v!;
                selected
                  ..clear()
                  ..addAll(
                    widget.controller.data.entries
                        .where((e) => e.isReconciledFor(walletId))
                        .map((e) => e.id),
                  );
              }),
            ),
            ListTile(
              title: const Text('Ngày sao kê'),
              trailing: Text(shortDate(date)),
              onTap: () async {
                final d = await showDatePicker(
                  context: context,
                  initialDate: date,
                  firstDate: DateTime(2000),
                  lastDate: DateTime.now(),
                );
                if (d != null && mounted) setState(() => date = d);
              },
            ),
            TextField(
              controller: balance,
              keyboardType: const TextInputType.numberWithOptions(signed: true),
              decoration: const InputDecoration(
                labelText: 'Số dư trên sao kê (VND)',
              ),
              onChanged: (_) => setState(() {}),
            ),
            const SizedBox(height: 16),
            Text(
              'Số dư từ giao dịch đã chọn: ${money(total)}',
              style: const TextStyle(fontWeight: FontWeight.bold),
            ),
            if (difference != null) Text('Chênh lệch: ${money(difference)}'),
            const SizedBox(height: 16),
            for (final e in entries)
              CheckboxListTile(
                title: Text(e.title),
                subtitle: Text(money(e.amount)),
                value: selected.contains(e.id),
                onChanged: (v) => setState(() {
                  if (v == true) {
                    selected.add(e.id);
                  } else {
                    selected.remove(e.id);
                  }
                }),
              ),
            TextField(
              controller: reason,
              decoration: const InputDecoration(
                labelText: 'Lý do điều chỉnh nếu có chênh lệch',
              ),
            ),
            const SizedBox(height: 16),
            FilledButton(
              onPressed: busy || difference == null
                  ? null
                  : () async {
                      if (difference != 0 && reason.text.trim().isEmpty) {
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(
                            content: Text(
                              'Nhập lý do trước khi tạo điều chỉnh.',
                            ),
                          ),
                        );
                        return;
                      }
                      setState(() => busy = true);
                      final ok = await performSave(
                        context,
                        () => widget.controller.update((data) {
                          return widget.controller.actions.reconcileWallet(
                            data,
                            walletId: walletId,
                            statementDate: date,
                            statementBalance: target!,
                            selectedIds: selected,
                            reason: reason.text,
                          );
                        }),
                      );
                      if (!context.mounted) return;
                      if (ok) {
                        Navigator.pop(context);
                      } else {
                        setState(() => busy = false);
                      }
                    },
              child: Text(
                difference == 0
                    ? 'Xác nhận đối soát'
                    : 'Xác nhận và tạo điều chỉnh',
              ),
            ),
          ],
        ),
      ),
    );
  }
}
