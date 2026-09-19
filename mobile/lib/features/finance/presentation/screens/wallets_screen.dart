import 'package:flutter/material.dart';
import '../../../../core/theme/picket_theme.dart';
import '../../../../core/utils/formatters.dart';
import '../../../../core/widgets/picket_widgets.dart';
import '../../domain/entities/finance_data.dart';
import '../../domain/usecases/finance_actions.dart';
import '../state/finance_controller.dart';
import 'amount_editor_screen.dart';
import 'transactions_screen.dart';

class WalletsScreen extends StatelessWidget {
  const WalletsScreen({super.key, required this.controller});
  final FinanceController controller;
  void edit(BuildContext context, [Wallet? wallet]) => Navigator.push(
    context,
    MaterialPageRoute<void>(
      builder: (_) => AmountEditorScreen(
        heading: wallet == null ? 'Thêm ví' : 'Chỉnh sửa ví',
        initialName: wallet?.name ?? '',
        initialAmount: wallet?.openingBalance ?? 0,
        amountLabel: 'Số dư ban đầu',
        allowZero: true,
        help:
            'Số dư hiện tại = số dư ban đầu + thu nhập − chi tiêu, có tính chuyển ví.',
        onSave: (name, amount, _) => controller.update(
          (data) => data.copyWith(
            wallets: [
              ...data.wallets.where((w) => w.id != wallet?.id),
              Wallet(
                id: wallet?.id ?? newId(),
                name: name,
                openingBalance: amount,
              ),
            ],
          ),
        ),
      ),
    ),
  );
  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(
      title: const Text('Ví của bạn'),
      actions: [
        IconButton(
          tooltip: 'Thêm ví',
          onPressed: () => edit(context),
          icon: const Icon(Icons.add),
        ),
      ],
    ),
    body: ListenableBuilder(
      listenable: controller,
      builder: (context, _) => ListView(
        padding: const EdgeInsets.all(20),
        children: [
          const Text(
            'Tiền ở đâu, rõ ở đó.',
            style: TextStyle(fontSize: 26, fontWeight: FontWeight.w800),
          ),
          const SizedBox(height: 20),
          for (final wallet in controller.data.wallets)
            Padding(
              padding: const EdgeInsets.only(bottom: 16),
              child: Surface(
                color: PicketColors.peach,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        const Icon(Icons.account_balance_wallet_outlined),
                        const SizedBox(width: 10),
                        Expanded(
                          child: Text(
                            wallet.name,
                            style: const TextStyle(fontWeight: FontWeight.bold),
                          ),
                        ),
                        IconButton(
                          tooltip: 'Sửa ví',
                          onPressed: () => edit(context, wallet),
                          icon: const Icon(Icons.edit_outlined),
                        ),
                      ],
                    ),
                    Text(
                      controller.data.hideBalance
                          ? '••••••'
                          : money(walletBalance(controller.data, wallet)),
                      style: const TextStyle(
                        fontSize: 28,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                    const SizedBox(height: 12),
                    TextButton(
                      onPressed: () => Navigator.push(
                        context,
                        MaterialPageRoute<void>(
                          builder: (_) => Scaffold(
                            appBar: AppBar(title: Text(wallet.name)),
                            body: ListenableBuilder(
                              listenable: controller,
                              builder: (_, _) => TransactionsScreen(
                                controller: controller,
                                walletId: wallet.id,
                              ),
                            ),
                          ),
                        ),
                      ),
                      child: const Text('Xem giao dịch →'),
                    ),
                  ],
                ),
              ),
            ),
          OutlinedButton.icon(
            onPressed: () => edit(context),
            icon: const Icon(Icons.add),
            label: const Text('Thêm một ví'),
          ),
        ],
      ),
    ),
  );
}
