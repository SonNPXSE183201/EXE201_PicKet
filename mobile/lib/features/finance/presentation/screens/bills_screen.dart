import 'package:flutter/material.dart';
import '../../../../core/theme/picket_theme.dart';
import '../../../../core/utils/formatters.dart';
import '../../../../core/widgets/picket_widgets.dart';
import '../../domain/entities/finance_data.dart';
import '../../domain/usecases/finance_actions.dart';
import '../state/finance_controller.dart';
import 'amount_editor_screen.dart';
import 'subscriptions_screen.dart';

class BillsScreen extends StatelessWidget {
  const BillsScreen({super.key, required this.controller});
  final FinanceController controller;
  void edit(BuildContext context, [Bill? bill]) => Navigator.push(
    context,
    MaterialPageRoute<void>(
      builder: (_) => AmountEditorScreen(
        heading: bill == null ? 'Thêm hoá đơn' : 'Sửa hoá đơn',
        initialName: bill?.title ?? '',
        initialAmount: bill?.amount ?? 0,
        initialDate: bill?.dueDate ?? DateTime.now(),
        help:
            'Theo dõi một kỳ thanh toán. Khi thanh toán, Picket tạo khoản chi vào ví bạn chọn.',
        onSave: (name, amount, date) => controller.update(
          (data) => data.copyWith(
            bills: [
              ...data.bills.where((b) => b.id != bill?.id),
              Bill(
                id: bill?.id ?? newId(),
                title: name,
                amount: amount,
                dueDate: date,
              ),
            ],
          ),
        ),
      ),
    ),
  );
  Future<void> pay(BuildContext context, Bill bill) async {
    final walletId = await showModalBottomSheet<String>(
      context: context,
      showDragHandle: true,
      builder: (context) => SafeArea(
        child: ListView(
          shrinkWrap: true,
          children: [
            Padding(
              padding: const EdgeInsets.all(20),
              child: Text(
                'Thanh toán ${money(bill.amount)}',
                style: const TextStyle(
                  fontSize: 22,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ),
            for (final wallet in controller.data.wallets)
              ListTile(
                leading: const Icon(Icons.account_balance_wallet_outlined),
                title: Text(wallet.name),
                subtitle: Text(money(walletBalance(controller.data, wallet))),
                onTap: () => Navigator.pop(context, wallet.id),
              ),
          ],
        ),
      ),
    );
    if (walletId != null && context.mounted) {
      await performSave(context, () => controller.pay(bill, walletId));
    }
  }

  @override
  Widget build(BuildContext context) {
    final bills = [...controller.data.bills]
      ..sort((a, b) => a.dueDate.compareTo(b.dueDate));
    final unpaid = bills
        .where((b) => b.paidEntryId == null)
        .fold(0, (sum, b) => sum + b.amount);
    return ListView(
      padding: const EdgeInsets.all(20),
      children: [
        const Text(
          'Nhẹ đầu, đúng hạn',
          style: TextStyle(fontSize: 27, fontWeight: FontWeight.w800),
        ),
        const SizedBox(height: 8),
        const Text('Những khoản cần nhớ, ở cùng một chỗ.'),
        TextButton.icon(
          onPressed: () => Navigator.push(
            context,
            MaterialPageRoute<void>(
              builder: (_) => SubscriptionsScreen(controller: controller),
            ),
          ),
          icon: const Icon(Icons.repeat),
          label: const Text('Quản lý thuê bao'),
        ),
        const SizedBox(height: 24),
        Surface(
          color: PicketColors.peach,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text('Tổng chưa thanh toán'),
              const SizedBox(height: 8),
              Text(
                money(unpaid),
                style: const TextStyle(
                  fontSize: 30,
                  fontWeight: FontWeight.w800,
                ),
              ),
            ],
          ),
        ),
        if (bills.isEmpty)
          const EmptyState(
            title: 'Chưa có hoá đơn',
            description:
                'Thêm tiền điện, internet hoặc khoản thuê bao để theo dõi hạn thanh toán.',
            icon: Icons.event_available_outlined,
          ),
        for (final bill in bills)
          Padding(
            padding: const EdgeInsets.only(top: 16),
            child: Surface(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      const Icon(Icons.receipt_long_outlined),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Text(
                          bill.title,
                          style: const TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                      if (bill.paidEntryId == null)
                        IconButton(
                          tooltip: 'Sửa hoá đơn',
                          onPressed: () => edit(context, bill),
                          icon: const Icon(Icons.edit_outlined),
                        ),
                      IconButton(
                        tooltip: 'Xoá hoá đơn',
                        onPressed: () async {
                          if (!await confirmDelete(
                            context,
                            'Xoá lịch theo dõi hoá đơn. Khoản chi đã thanh toán vẫn được giữ lại.',
                          )) {
                            return;
                          }
                          if (context.mounted) {
                            await performSave(
                              context,
                              () => controller.update(
                                (data) => data.copyWith(
                                  bills: data.bills
                                      .where((b) => b.id != bill.id)
                                      .toList(),
                                ),
                              ),
                            );
                          }
                        },
                        icon: const Icon(Icons.delete_outline),
                      ),
                    ],
                  ),
                  Text(
                    money(bill.amount),
                    style: const TextStyle(
                      fontSize: 24,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Text('Hạn ${shortDate(bill.dueDate)}'),
                  const SizedBox(height: 12),
                  if (bill.paidEntryId != null)
                    const Text(
                      '✓ Đã thanh toán',
                      style: TextStyle(
                        color: PicketColors.income,
                        fontWeight: FontWeight.bold,
                      ),
                    )
                  else
                    Row(
                      children: [
                        Expanded(
                          child: Text(
                            bill.dueDate.isBefore(
                                  DateUtils.dateOnly(DateTime.now()),
                                )
                                ? 'Đã quá hạn'
                                : 'Chưa thanh toán',
                            style: const TextStyle(color: PicketColors.expense),
                          ),
                        ),
                        FilledButton(
                          onPressed: controller.saving
                              ? null
                              : () => pay(context, bill),
                          child: const Text('Thanh toán'),
                        ),
                      ],
                    ),
                ],
              ),
            ),
          ),
        const SizedBox(height: 24),
        OutlinedButton.icon(
          onPressed: () => edit(context),
          icon: const Icon(Icons.add),
          label: const Text('Thêm hoá đơn'),
        ),
        const SizedBox(height: 90),
      ],
    );
  }
}
