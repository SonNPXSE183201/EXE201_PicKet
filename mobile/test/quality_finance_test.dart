import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/features/finance/domain/entities/finance_data.dart';
import 'package:mobile/features/finance/domain/usecases/finance_actions.dart';
import 'package:mobile/features/finance/domain/usecases/amount_allocation.dart';
import 'package:mobile/features/finance/domain/usecases/reconciliation_actions.dart';
import 'finance_test.dart' show MemoryRepository;

void main() {
  final actions = FinanceActions(MemoryRepository());
  test('Repeated tiny refunds never over-refund a split category', () {
    final now = DateTime.now();
    final original = Entry(
      id: 'e',
      title: 'Tiny split',
      amount: 2,
      type: EntryType.expense,
      walletId: 'w',
      category: 'Ăn uống',
      date: now,
      parts: const [
        EntryPart(category: 'Ăn uống', amount: 1),
        EntryPart(category: 'Mua sắm', amount: 1),
      ],
    );
    var data = FinanceData(
      wallets: const [Wallet(id: 'w', name: 'Cash', openingBalance: 10)],
      entries: [original],
    );
    data = actions.refund(data, original, 1, 'First');
    data = actions.refund(data, original, 1, 'Second');
    for (final category in ['Ăn uống', 'Mua sắm']) {
      expect(
        budgetSpent(
          data,
          Budget(id: category, category: category, limit: 10),
          now,
        ),
        0,
      );
    }
    expect(monthlyTotal(data, EntryType.expense, now), 0);
  });
  test(
    'Large proportional amounts do not overflow native integer multiplication',
    () {
      final result = allocateAmount(8000000000000, [
        3000000000000,
        6000000000000,
      ]);
      expect(result.fold(0, (sum, value) => sum + value), 8000000000000);
      expect(result[0], inInclusiveRange(0, 3000000000000));
      expect(result[1], inInclusiveRange(0, 6000000000000));
    },
  );
  test(
    'Reconciliation clears transfer sides separately even in a closed month',
    () {
      final now = DateTime.now(),
          date = DateTime(DateTime.now().year, DateTime.now().month - 1, 10);
      final transfer = Entry(
        id: 't',
        title: 'Transfer',
        amount: 200,
        type: EntryType.transfer,
        walletId: 'a',
        destinationId: 'b',
        category: 'Khác',
        date: date,
      );
      var data = FinanceData(
        wallets: const [
          Wallet(id: 'a', name: 'A', openingBalance: 1000),
          Wallet(id: 'b', name: 'B', openingBalance: 1000),
        ],
        entries: [transfer],
        closedMonths: [
          MonthClose(
            month: monthKey(date),
            income: 0,
            expense: 0,
            note: 'Closed',
            closedAt: now,
          ),
        ],
      );
      data = actions.reconcileWallet(
        data,
        walletId: 'a',
        statementDate: date,
        statementBalance: 800,
        selectedIds: {'t'},
        reason: '',
      );
      expect(data.entries.single.isReconciledFor('a'), true);
      expect(data.entries.single.isReconciledFor('b'), false);
      data = actions.reconcileWallet(
        data,
        walletId: 'b',
        statementDate: date,
        statementBalance: 1200,
        selectedIds: {'t'},
        reason: '',
      );
      expect(data.entries.single.isReconciledFor('a'), true);
      expect(data.entries.single.isReconciledFor('b'), true);
      expect(data.entries.length, 1);
    },
  );
  test('Financial edits invalidate prior reconciliation', () {
    final date = DateTime.now();
    final data = FinanceData(
      wallets: const [Wallet(id: 'w', name: 'Cash', openingBalance: 1000)],
      entries: [
        Entry(
          id: 'e',
          title: 'Original',
          amount: 100,
          type: EntryType.expense,
          walletId: 'w',
          category: 'Khác',
          date: date,
          reconciledWalletIds: const ['w'],
        ),
      ],
    );
    final next = actions.upsertEntry(
      data,
      Entry(
        id: 'e',
        title: 'Edited',
        amount: 200,
        type: EntryType.expense,
        walletId: 'w',
        category: 'Khác',
        date: date,
        reconciledWalletIds: const ['w'],
      ),
    );
    expect(next.entries.single.isReconciledFor('w'), false);
  });
}
