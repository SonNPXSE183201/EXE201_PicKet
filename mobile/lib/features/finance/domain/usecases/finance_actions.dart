import 'amount_allocation.dart';
import 'snapshot_validation.dart';
import '../entities/finance_data.dart';
import '../repositories/finance_repository.dart';
import 'package:uuid/uuid.dart';

const categories = [
  'Ăn uống',
  'Mua sắm',
  'Di chuyển',
  'Nhà ở',
  'Hoá đơn',
  'Giải trí',
  'Sức khoẻ',
  'Giáo dục',
  'Lương',
  'Khác',
];
const maxAmount = 9000000000000;
String newId() => const Uuid().v4();
String monthKey(DateTime date) => '${date.year}-${date.month}';
List<String> allCategories(FinanceData data) =>
    {...categories, ...data.customCategories}.toList();

class FinanceActions {
  FinanceActions(this.repository);
  final FinanceRepository repository;
  Future<FinanceData> load() async {
    final data = await repository.load();
    validateSnapshot(data);
    return data;
  }

  Future<void> save(FinanceData data) {
    validateSnapshot(data);
    return repository.save(data);
  }

  FinanceData upsertBudget(FinanceData data, Budget budget) {
    validateAmount(budget.limit);
    if (data.budgets.any(
      (b) => b.id != budget.id && b.category == budget.category,
    )) {
      throw ArgumentError(
        'Danh mục này đã có ngân sách. Hãy chỉnh sửa ngân sách hiện có.',
      );
    }
    return data.copyWith(
      budgets: [...data.budgets.where((b) => b.id != budget.id), budget],
    );
  }

  void validateAmount(int amount, {bool allowZero = false}) {
    if (amount < (allowZero ? 0 : 1) || amount > maxAmount) {
      throw ArgumentError('Số tiền không hợp lệ.');
    }
  }

  FinanceData upsertEntry(FinanceData data, Entry entry) {
    validateAmount(entry.amount);
    final previous = data.entries.where((e) => e.id == entry.id).firstOrNull;
    if (previous != null &&
        (previous.amount != entry.amount ||
            previous.walletId != entry.walletId ||
            previous.destinationId != entry.destinationId ||
            previous.type != entry.type ||
            previous.date != entry.date)) {
      entry = entry.copyWith(reconciled: false, reconciledWalletIds: const []);
    }
    if (data.closedMonths.any(
      (m) =>
          m.month == monthKey(entry.date) ||
          (previous != null && m.month == monthKey(previous.date)),
    )) {
      throw ArgumentError(
        'Kỳ đã chốt. Không thể thay đổi giao dịch trong kỳ này.',
      );
    }
    if (entry.parts.isNotEmpty &&
        (entry.type == EntryType.transfer ||
            entry.parts.any((p) => p.amount <= 0) ||
            entry.parts.fold(0, (sum, p) => sum + p.amount) != entry.amount)) {
      throw ArgumentError('Tổng các phần phải bằng số tiền giao dịch.');
    }
    if (entry.refundOf != null) {
      final original = data.entries
          .where((e) => e.id == entry.refundOf && e.type == EntryType.expense)
          .firstOrNull;
      final otherRefunds = data.entries
          .where((e) => e.refundOf == entry.refundOf && e.id != entry.id)
          .fold(0, (sum, e) => sum + e.amount);
      if (original == null ||
          entry.type != EntryType.income ||
          otherRefunds + entry.amount > original.amount) {
        throw ArgumentError('Tiền hoàn không được vượt khoản chi gốc.');
      }
    }
    final refunded = data.entries
        .where((e) => e.refundOf == entry.id)
        .fold(0, (sum, e) => sum + e.amount);
    if (refunded > 0 &&
        (entry.type != EntryType.expense || entry.amount < refunded)) {
      throw ArgumentError(
        'Giao dịch đã có hoàn tiền. Không thể thay đổi loại hoặc giảm dưới số đã hoàn.',
      );
    }
    if (refunded > 0 &&
        previous != null &&
        (entry.amount != previous.amount ||
            entry.walletId != previous.walletId ||
            entry.category != previous.category ||
            entry.parts.length != previous.parts.length ||
            List.generate(entry.parts.length, (i) => i).any(
              (i) =>
                  entry.parts[i].category != previous.parts[i].category ||
                  entry.parts[i].amount != previous.parts[i].amount,
            ))) {
      throw ArgumentError(
        'Khoản chi đã có hoàn tiền. Hãy xóa khoản hoàn trước khi đổi số tiền, ví hoặc phân bổ.',
      );
    }
    if (entry.title.trim().isEmpty) {
      throw ArgumentError('Hãy nhập tên giao dịch.');
    }
    if (!data.wallets.any((w) => w.id == entry.walletId)) {
      throw ArgumentError('Ví không tồn tại.');
    }
    if (entry.type == EntryType.transfer &&
        (entry.destinationId == entry.walletId ||
            !data.wallets.any((w) => w.id == entry.destinationId))) {
      throw ArgumentError('Hãy chọn hai ví khác nhau.');
    }
    return data.copyWith(
      entries: [...data.entries.where((e) => e.id != entry.id), entry],
      bills: data.bills.map((bill) {
        if (bill.paidEntryId != entry.id) return bill;
        return Bill(
          id: bill.id,
          title: entry.type == EntryType.expense ? entry.title : bill.title,
          amount: entry.type == EntryType.expense ? entry.amount : bill.amount,
          dueDate: bill.dueDate,
          paidEntryId: entry.type == EntryType.expense ? entry.id : null,
        );
      }).toList(),
    );
  }

  FinanceData removeEntry(FinanceData data, String id) {
    final entry = data.entries.where((e) => e.id == id).firstOrNull;
    if (data.entries.any((e) => e.refundOf == id)) {
      throw ArgumentError('Xoá các khoản hoàn tiền liên kết trước.');
    }
    if (entry != null &&
        data.closedMonths.any((m) => m.month == monthKey(entry.date))) {
      throw ArgumentError('Không thể xoá giao dịch trong kỳ đã chốt.');
    }
    return data.copyWith(
      entries: data.entries.where((e) => e.id != id).toList(),
      bills: data.bills
          .map(
            (b) => b.paidEntryId == id
                ? Bill(
                    id: b.id,
                    title: b.title,
                    amount: b.amount,
                    dueDate: b.dueDate,
                  )
                : b,
          )
          .toList(),
    );
  }

  FinanceData payBill(FinanceData data, Bill bill, String walletId) {
    final current = data.bills.firstWhere((b) => b.id == bill.id);
    if (current.paidEntryId != null) return data;
    final entry = Entry(
      id: newId(),
      title: current.title,
      amount: current.amount,
      type: EntryType.expense,
      walletId: walletId,
      category: 'Hoá đơn',
      date: DateTime.now(),
    );
    final updated = upsertEntry(data, entry);
    return updated.copyWith(
      bills: updated.bills
          .map(
            (b) => b.id == bill.id
                ? Bill(
                    id: b.id,
                    title: b.title,
                    amount: b.amount,
                    dueDate: b.dueDate,
                    paidEntryId: entry.id,
                  )
                : b,
          )
          .toList(),
    );
  }
}

int walletBalance(FinanceData data, Wallet wallet) =>
    data.entries.fold(wallet.openingBalance, (balance, e) {
      if (e.walletId == wallet.id) {
        balance += e.type == EntryType.income ? e.amount : -e.amount;
      }
      if (e.type == EntryType.transfer && e.destinationId == wallet.id) {
        balance += e.amount;
      }
      return balance;
    });
bool inMonth(DateTime date, DateTime month) =>
    date.year == month.year && date.month == month.month;
int monthlyTotal(FinanceData data, EntryType type, DateTime month) {
  return data.entries.where((e) => inMonth(e.date, month)).fold(0, (sum, e) {
    if (type == EntryType.expense && e.refundOf != null) return sum - e.amount;
    if (e.type == type && e.refundOf == null) return sum + e.amount;
    return sum;
  });
}

int categoryAmount(Entry entry, String category) => entry.parts.isEmpty
    ? (entry.category == category ? entry.amount : 0)
    : entry.parts
          .where((p) => p.category == category)
          .fold(0, (sum, p) => sum + p.amount);
int budgetSpent(FinanceData data, Budget budget, DateTime month) => data.entries
    .where((e) => inMonth(e.date, month))
    .fold(
      0,
      (sum, e) =>
          sum +
          (e.type == EntryType.expense
              ? categoryAmount(e, budget.category)
              : e.refundOf != null
              ? -categoryAmount(e, budget.category)
              : 0),
    );

extension AdvancedFinanceActions on FinanceActions {
  FinanceData refund(
    FinanceData data,
    Entry original,
    int amount,
    String note,
  ) {
    validateAmount(amount);
    original = data.entries.firstWhere((entry) => entry.id == original.id);
    if (original.type != EntryType.expense) {
      throw ArgumentError('Chỉ hoàn tiền cho khoản chi.');
    }
    final priorRefunds = data.entries
        .where((entry) => entry.refundOf == original.id)
        .toList();
    final remaining =
        original.amount -
        priorRefunds.fold<int>(0, (sum, entry) => sum + entry.amount);
    if (amount > remaining) {
      throw ArgumentError('Tiền hoàn vượt số còn lại của khoản chi.');
    }
    final parts = <EntryPart>[];
    if (original.parts.isNotEmpty) {
      final categories = original.parts
          .map((part) => part.category)
          .toSet()
          .toList();
      final balances = categories
          .map(
            (category) =>
                categoryAmount(original, category) -
                priorRefunds.fold<int>(
                  0,
                  (sum, refund) => sum + categoryAmount(refund, category),
                ),
          )
          .toList();
      final allocated = allocateAmount(amount, balances);
      for (var i = 0; i < categories.length; i++) {
        if (allocated[i] > 0) {
          parts.add(EntryPart(category: categories[i], amount: allocated[i]));
        }
      }
    }
    return upsertEntry(
      data,
      Entry(
        id: newId(),
        title: 'Hoàn tiền · ${original.title}',
        amount: amount,
        type: EntryType.income,
        walletId: original.walletId,
        category: original.category,
        date: DateTime.now(),
        note: note,
        refundOf: original.id,
        parts: parts,
      ),
    );
  }

  FinanceData transferBudget(
    FinanceData data,
    Budget source,
    Budget destination,
    int amount,
    DateTime month,
  ) {
    validateAmount(amount);
    if (source.id == destination.id ||
        source.limitAt(month) - budgetSpent(data, source, month) < amount ||
        data.closedMonths.any((m) => m.month == monthKey(month))) {
      throw ArgumentError(
        'Không đủ hạn mức còn lại, trùng ngân sách hoặc kỳ đã chốt.',
      );
    }
    return data.copyWith(
      budgets: data.budgets.map((b) {
        if (b.id != source.id && b.id != destination.id) return b;
        return Budget(
          id: b.id,
          category: b.category,
          limit: b.limit,
          alertPercent: b.alertPercent,
          monthLimits: {
            ...b.monthLimits,
            monthKey(month):
                b.limitAt(month) + (b.id == source.id ? -amount : amount),
          },
        );
      }).toList(),
    );
  }

  FinanceData closeMonth(
    FinanceData data,
    DateTime month,
    String note,
    bool rollover,
  ) {
    if (data.closedMonths.any((m) => m.month == monthKey(month))) {
      throw ArgumentError('Kỳ này đã chốt.');
    }
    if (!DateTime(month.year, month.month + 1).isBefore(DateTime.now())) {
      throw ArgumentError('Chỉ chốt kỳ đã kết thúc.');
    }
    final next = DateTime(month.year, month.month + 1);
    final budgets = rollover
        ? data.budgets.map((b) {
            final remaining = (b.limitAt(month) - budgetSpent(data, b, month))
                .clamp(0, maxAmount);
            return Budget(
              id: b.id,
              category: b.category,
              limit: b.limit,
              alertPercent: b.alertPercent,
              monthLimits: {
                ...b.monthLimits,
                monthKey(next): b.limitAt(next) + remaining,
              },
            );
          }).toList()
        : data.budgets;
    return data.copyWith(
      budgets: budgets,
      closedMonths: [
        ...data.closedMonths,
        MonthClose(
          month: monthKey(month),
          income: monthlyTotal(data, EntryType.income, month),
          expense: monthlyTotal(data, EntryType.expense, month),
          note: note,
          closedAt: DateTime.now(),
        ),
      ],
    );
  }

  FinanceData paySubscription(
    FinanceData data,
    SubscriptionPlan subscription,
    String walletId,
  ) {
    final current = data.subscriptions.firstWhere(
      (s) => s.id == subscription.id,
    );
    if (!current.active || current.nextDate != subscription.nextDate) {
      throw ArgumentError('Kỳ thuê bao đã thay đổi.');
    }
    final target = DateTime(
      current.nextDate.year,
      current.nextDate.month + current.cycleMonths,
    );
    final lastDay = DateTime(target.year, target.month + 1, 0).day;
    final next = DateTime(
      target.year,
      target.month,
      current.nextDate.day.clamp(1, lastDay),
    );
    final result = upsertEntry(
      data,
      Entry(
        id: newId(),
        title: 'Thuê bao · ${current.name}',
        amount: current.amount,
        type: EntryType.expense,
        walletId: walletId,
        category: 'Hoá đơn',
        date: DateTime.now(),
      ),
    );
    return result.copyWith(
      subscriptions: result.subscriptions
          .map(
            (s) => s.id != current.id
                ? s
                : SubscriptionPlan(
                    id: s.id,
                    name: s.name,
                    amount: s.amount,
                    nextDate: next,
                    cycleMonths: s.cycleMonths,
                    active: s.active,
                    note: s.note,
                    alertDays: s.alertDays,
                  ),
          )
          .toList(),
    );
  }
}
