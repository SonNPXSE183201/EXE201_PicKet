import '../entities/finance_data.dart';
import 'finance_actions.dart' show maxAmount;

void validateSnapshot(FinanceData data) {
  if (data.onboarded && data.wallets.isEmpty) {
    throw const FormatException('Missing wallet');
  }
  final walletIds = data.wallets.map((w) => w.id).toSet();
  final entryIds = data.entries.map((e) => e.id).toSet();
  if (walletIds.length != data.wallets.length ||
      entryIds.length != data.entries.length) {
    throw const FormatException('Duplicate IDs');
  }
  for (final ids in [
    data.budgets.map((b) => b.id),
    data.bills.map((b) => b.id),
    data.keepsakes.map((i) => i.id),
    data.subscriptions.map((s) => s.id),
    data.closedMonths.map((m) => m.month),
  ]) {
    if (ids.any((id) => id.isEmpty) || ids.toSet().length != ids.length) {
      throw const FormatException('Invalid or duplicate entity ID');
    }
  }
  if (data.budgets.map((b) => b.category).toSet().length !=
      data.budgets.length) {
    throw const FormatException('Duplicate category budgets');
  }
  for (final item in data.keepsakes) {
    if (item.amount < 0 ||
        item.amount > maxAmount ||
        item.title.trim().isEmpty) {
      throw const FormatException('Invalid keepsake');
    }
  }
  for (final wallet in data.wallets) {
    if (wallet.openingBalance.abs() > maxAmount || wallet.name.trim().isEmpty) {
      throw const FormatException('Invalid wallet');
    }
  }
  for (final entry in data.entries) {
    if (entry.id.isEmpty ||
        entry.title.trim().isEmpty ||
        entry.category.trim().isEmpty ||
        entry.amount <= 0 ||
        entry.amount > maxAmount ||
        !walletIds.contains(entry.walletId)) {
      throw const FormatException('Invalid entry');
    }
    if (entry.type == EntryType.transfer &&
        (!walletIds.contains(entry.destinationId) ||
            entry.destinationId == entry.walletId)) {
      throw const FormatException('Invalid transfer');
    }
    if (entry.parts.isNotEmpty &&
        (entry.parts.any((p) => p.amount <= 0) ||
            entry.parts.fold(0, (sum, p) => sum + p.amount) != entry.amount)) {
      throw const FormatException('Invalid split');
    }
    if (entry.refundOf != null) {
      final original = data.entries
          .where((e) => e.id == entry.refundOf && e.type == EntryType.expense)
          .firstOrNull;
      if (original == null ||
          entry.type != EntryType.income ||
          data.entries
                  .where((e) => e.refundOf == original.id)
                  .fold(0, (sum, e) => sum + e.amount) >
              original.amount) {
        throw const FormatException('Invalid refund');
      }
    }
  }
  for (final budget in data.budgets) {
    if (budget.limit <= 0 ||
        budget.limit > maxAmount ||
        budget.monthLimits.values.any((v) => v < 0 || v > maxAmount)) {
      throw const FormatException('Invalid budget');
    }
  }
  for (final bill in data.bills) {
    if (bill.amount <= 0 ||
        bill.amount > maxAmount ||
        (bill.paidEntryId != null && !entryIds.contains(bill.paidEntryId))) {
      throw const FormatException('Invalid bill');
    }
  }
  for (final subscription in data.subscriptions) {
    if (subscription.amount <= 0 ||
        subscription.amount > maxAmount ||
        subscription.alertDays < 0 ||
        subscription.alertDays > 365 ||
        ![1, 3, 12].contains(subscription.cycleMonths)) {
      throw const FormatException('Invalid subscription');
    }
  }
}
