import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/features/finance/domain/entities/finance_data.dart';
import 'package:mobile/features/finance/domain/repositories/finance_repository.dart';
import 'package:mobile/features/finance/domain/usecases/finance_actions.dart';
import 'package:mobile/features/finance/presentation/state/finance_controller.dart';

class MemoryRepository implements FinanceRepository {
  FinanceData value = const FinanceData();
  bool fail = false;
  @override
  Future<FinanceData> load() async => value;
  @override
  Future<void> save(FinanceData data) async {
    if (fail) throw StateError('disk full');
    value = FinanceData.fromJson(data.toJson());
  }
}

void main() {
  late FinanceActions actions;
  late FinanceData data;
  final date = DateTime(2026, 9, 14);
  const cash = Wallet(id: 'cash', name: 'Tiền mặt', openingBalance: 1000000);
  const bank = Wallet(id: 'bank', name: 'Ngân hàng', openingBalance: 2000000);
  Entry entry({
    EntryType type = EntryType.expense,
    int amount = 100000,
    String? destination,
    String id = 'tx',
  }) => Entry(
    id: id,
    title: 'Cà phê',
    amount: amount,
    type: type,
    walletId: 'cash',
    destinationId: destination,
    category: 'Ăn uống',
    date: date,
  );
  setUp(() {
    actions = FinanceActions(MemoryRepository());
    data = const FinanceData(wallets: [cash, bank]);
  });
  test('Transfer conserves total balance and is excluded from reports', () {
    data = actions.upsertEntry(
      data,
      entry(type: EntryType.transfer, destination: 'bank'),
    );
    expect(walletBalance(data, cash), 900000);
    expect(walletBalance(data, bank), 2100000);
    expect(monthlyTotal(data, EntryType.expense, date), 0);
    expect(monthlyTotal(data, EntryType.income, date), 0);
    expect(
      () => actions.upsertEntry(
        data,
        entry(type: EntryType.transfer, destination: 'cash'),
      ),
      throwsArgumentError,
    );
  });
  test('Editing replaces prior impact; deleting restores opening balance', () {
    data = actions.upsertEntry(data, entry());
    data = actions.upsertEntry(data, entry(amount: 250000));
    expect(data.entries, hasLength(1));
    expect(walletBalance(data, cash), 750000);
    expect(
      budgetSpent(
        data,
        const Budget(id: 'b', category: 'Ăn uống', limit: 200000),
        date,
      ),
      250000,
    );
    expect(
      budgetSpent(
        data,
        const Budget(id: 'b', category: 'Ăn uống', limit: 200000),
        DateTime(2026, 10),
      ),
      0,
    );
    data = actions.removeEntry(data, 'tx');
    expect(walletBalance(data, cash), 1000000);
  });
  test('Bill payment is idempotent and deleting linked entry reopens bill', () {
    final bill = Bill(
      id: 'bill',
      title: 'Internet',
      amount: 200000,
      dueDate: date,
    );
    data = data.copyWith(bills: [bill]);
    data = actions.payBill(data, bill, cash.id);
    data = actions.payBill(data, bill, cash.id);
    expect(data.entries, hasLength(1));
    expect(walletBalance(data, cash), 800000);
    expect(data.bills.single.paidEntryId, data.entries.single.id);
    data = actions.removeEntry(data, data.entries.single.id);
    expect(data.bills.single.paidEntryId, isNull);
    expect(walletBalance(data, cash), 1000000);
  });
  test('Reject invalid amounts and missing wallet', () {
    expect(
      () => actions.upsertEntry(data, entry(amount: 0)),
      throwsArgumentError,
    );
    expect(
      () => actions.upsertEntry(data, entry(amount: -1)),
      throwsArgumentError,
    );
    expect(
      () => actions.upsertEntry(const FinanceData(), entry()),
      throwsArgumentError,
    );
  });
  test(
    'Failed persistence leaves previous state intact; saved data reloads',
    () async {
      final repo = MemoryRepository();
      final controller = FinanceController(FinanceActions(repo));
      await controller.load();
      await controller.update(
        (_) => data.copyWith(name: 'An', onboarded: true),
      );
      repo.fail = true;
      await expectLater(controller.saveEntry(entry()), throwsStateError);
      expect(controller.data.entries, isEmpty);
      expect(controller.saving, false);
      repo.fail = false;
      await controller.saveEntry(entry());
      final reloaded = FinanceController(FinanceActions(repo));
      await reloaded.load();
      expect(reloaded.data.name, 'An');
      expect(reloaded.data.entries.single.amount, 100000);
      controller.dispose();
      reloaded.dispose();
    },
  );
  test(
    'Duplicate category budget is rejected without replacing existing budget',
    () {
      const first = Budget(id: 'first', category: 'Ăn uống', limit: 100000);
      data = actions.upsertBudget(data, first);
      expect(
        () => actions.upsertBudget(
          data,
          const Budget(id: 'second', category: 'Ăn uống', limit: 200000),
        ),
        throwsArgumentError,
      );
      expect(data.budgets.single.limit, 100000);
    },
  );
  test(
    'Editing a bill payment updates bill amount; changing to income reopens it',
    () {
      final bill = Bill(
        id: 'bill',
        title: 'Internet',
        amount: 200000,
        dueDate: date,
      );
      data = actions.payBill(data.copyWith(bills: [bill]), bill, cash.id);
      final id = data.entries.single.id;
      data = actions.upsertEntry(data, entry(id: id, amount: 250000));
      expect(data.bills.single.amount, 250000);
      data = actions.upsertEntry(data, entry(id: id, type: EntryType.income));
      expect(data.bills.single.paidEntryId, isNull);
    },
  );
  test('Versioned snapshot preserves all entities and media references', () {
    data = data.copyWith(
      name: 'An',
      onboarded: true,
      hideBalance: true,
      entries: [entry()],
      budgets: const [Budget(id: 'b', category: 'Ăn uống', limit: 500000)],
      bills: [
        Bill(
          id: 'bill',
          title: 'Internet',
          amount: 100000,
          dueDate: date,
          paidEntryId: 'tx',
        ),
      ],
      keepsakes: [
        Keepsake(
          id: 'k',
          title: 'Sách',
          amount: 100000,
          date: date,
          note: 'Kỷ niệm',
          photoPath: '/local/photo.jpg',
        ),
      ],
    );
    final restored = FinanceData.fromJson(data.toJson());
    expect(restored.toJson(), data.toJson());
    expect(() => FinanceData.fromJson({'version': 99}), throwsFormatException);
  });
}
