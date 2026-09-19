import '../entities/finance_data.dart';
import 'finance_actions.dart';

extension ReconciliationActions on FinanceActions {
  FinanceData reconcileWallet(
    FinanceData data, {
    required String walletId,
    required DateTime statementDate,
    required int statementBalance,
    required Set<String> selectedIds,
    required String reason,
  }) {
    if (statementBalance.abs() > maxAmount) {
      throw ArgumentError('Số dư sao kê không hợp lệ.');
    }
    final wallet = data.wallets.firstWhere((wallet) => wallet.id == walletId);
    final end = DateTime(
      statementDate.year,
      statementDate.month,
      statementDate.day + 1,
    );
    final eligible = data.entries
        .where(
          (entry) =>
              (entry.walletId == walletId || entry.destinationId == walletId) &&
              entry.date.isBefore(end),
        )
        .toList();
    final eligibleIds = eligible.map((entry) => entry.id).toSet();
    final clearedBalance = walletBalance(
      data.copyWith(
        entries: eligible
            .where((entry) => selectedIds.contains(entry.id))
            .toList(),
      ),
      wallet,
    );
    final difference = statementBalance - clearedBalance;
    if (difference != 0 && reason.trim().isEmpty) {
      throw ArgumentError('Nhập lý do trước khi tạo điều chỉnh.');
    }
    var result = data.copyWith(
      entries: data.entries.map((entry) {
        if (!eligibleIds.contains(entry.id)) return entry;
        final wallets = entry.clearedWalletIds.toSet()..remove(walletId);
        if (selectedIds.contains(entry.id)) wallets.add(walletId);
        return entry.copyWith(
          reconciled: false,
          reconciledWalletIds: wallets.toList(),
        );
      }).toList(),
    );
    if (difference != 0) {
      result = upsertEntry(
        result,
        Entry(
          id: newId(),
          title: 'Điều chỉnh đối soát',
          amount: difference.abs(),
          type: difference > 0 ? EntryType.income : EntryType.expense,
          walletId: walletId,
          category: 'Khác',
          date: statementDate,
          note: reason.trim(),
          reconciledWalletIds: [walletId],
        ),
      );
    }
    return result;
  }
}
