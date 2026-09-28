import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/features/capture/domain/receipt_parser.dart';
import 'package:mobile/features/finance/domain/entities/finance_data.dart';
import 'package:mobile/features/finance/domain/usecases/finance_actions.dart';
import 'package:mobile/features/settings/data/backup_service.dart';
import 'finance_test.dart' show MemoryRepository;

void main() {
  final actions = FinanceActions(MemoryRepository());
  final date = DateTime.now();
  final purchase = Entry(
    id: 'purchase',
    title: 'Shopping',
    amount: 100000,
    type: EntryType.expense,
    walletId: 'cash',
    category: 'Mua sắm',
    date: date,
    parts: const [
      EntryPart(category: 'Ăn uống', amount: 40000),
      EntryPart(category: 'Mua sắm', amount: 60000),
    ],
  );
  final data = FinanceData(
    wallets: const [Wallet(id: 'cash', name: 'Cash', openingBalance: 500000)],
    entries: [purchase],
  );
  test(
    'Partial refund reduces spending, preserves split and rejects excess',
    () {
      final refunded = actions.refund(data, purchase, 50000, 'Return');
      expect(monthlyTotal(refunded, EntryType.expense, date), 50000);
      expect(monthlyTotal(refunded, EntryType.income, date), 0);
      expect(
        budgetSpent(
          refunded,
          const Budget(id: 'food', category: 'Ăn uống', limit: 100000),
          date,
        ),
        20000,
      );
      expect(
        () => actions.refund(refunded, purchase, 50001, ''),
        throwsArgumentError,
      );
      expect(
        () => actions.removeEntry(refunded, purchase.id),
        throwsArgumentError,
      );
    },
  );
  test('Split amount must exactly equal purchase amount', () {
    expect(
      () => actions.upsertEntry(
        data,
        purchase.copyWith(
          parts: const [EntryPart(category: 'Ăn uống', amount: 1)],
        ),
      ),
      throwsArgumentError,
    );
  });
  test('Month close locks past transactions and cannot repeat rollover', () {
    final old = DateTime(date.year, date.month - 1);
    final closed = actions.closeMonth(data, old, 'Reviewed', true);
    expect(
      () => actions.closeMonth(closed, old, '', true),
      throwsArgumentError,
    );
    expect(
      () => actions.upsertEntry(
        closed,
        Entry(
          id: 'old',
          title: 'Old',
          amount: 1,
          type: EntryType.expense,
          walletId: 'cash',
          category: 'Ăn uống',
          date: old,
        ),
      ),
      throwsArgumentError,
    );
  });
  test('Receipt parser uses payable total rather than tendered cash', () {
    final draft = parseReceipt(
      'CỬA HÀNG ABC\n15/09/2026\nThanh toán: 125.000 đ\nTiền khách: 200.000\nTiền thừa: 75.000',
    );
    expect(draft.amount, 125000);
    expect(draft.date, DateTime(2026, 9, 15));
    expect(parseReceipt('Shop\n31/02/2026\nitem 900.000').date, isNull);
    expect(parseReceipt('Shop\nitem 900.000').amount, isNull);
  });
  test('Receipt parser uses OCR geometry and exposes fallback confidence', () {
    final draft = parseReceiptLines(const [
      ReceiptTextLine(
        text: 'CỬA HÀNG ABC',
        confidence: 0.96,
        top: 20,
        bottom: 60,
      ),
      ReceiptTextLine(
        text: 'Tạm tính 140.000',
        confidence: 0.94,
        top: 500,
        bottom: 540,
      ),
      ReceiptTextLine(
        text: 'Tiền khách 200.000',
        confidence: 0.95,
        top: 600,
        bottom: 640,
      ),
      ReceiptTextLine(
        text: 'TỔNG CỘNG 125.000 đ',
        confidence: 0.93,
        top: 700,
        bottom: 750,
      ),
    ]);
    expect(draft.merchant, 'CỬA HÀNG ABC');
    expect(draft.amount, 125000);
    expect(draft.amountConfidence, greaterThanOrEqualTo(0.9));
    expect(draft.needsFallback, isFalse);

    final weak = parseReceiptLines(const [
      ReceiptTextLine(text: 'SHOP', confidence: 0.4),
    ]);
    expect(weak.needsFallback, isTrue);
    expect(weak.reviewReason, isNotNull);
  });
  test('CSV neutralizes formulas and escapes quotes', () {
    expect(csvCell('=SUM(A1)'), '"\'=SUM(A1)"');
    expect(csvCell('a"b'), '"a""b"');
  });
  test('Backup rejects missing wallet references', () {
    expect(
      () => validateSnapshot(data.copyWith(wallets: [])),
      throwsFormatException,
    );
    expect(() => validateSnapshot(data), returnsNormally);
  });
}
