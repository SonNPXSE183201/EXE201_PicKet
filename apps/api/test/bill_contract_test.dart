import 'package:picket_api/src/bill_contract.dart';
import 'package:test/test.dart';

void main() {
  const transactionId = '11111111-1111-4111-8111-111111111111';

  test('bill create normalizes valid input', () {
    final request = CreateBillRequest.fromJson({
      'title': ' Tiền điện ',
      'amount': 450000,
      'dueAt': '2026-10-31T17:00:00.000Z',
    });

    expect(request.toDatabaseJson(), {
      'title': 'Tiền điện',
      'amount': 450000,
      'due_at': '2026-10-31T17:00:00.000Z',
    });
    expect(request.toRpcJson('bill-key-0001'), {
      'p_idempotency_key': 'bill-key-0001',
      'p_title': 'Tiền điện',
      'p_amount': 450000,
      'p_due_at': '2026-10-31T17:00:00.000Z',
    });
  });

  test('bill update validates version, status and payment transaction', () {
    final request = UpdateBillRequest.fromJson({
      'expectedVersion': 2,
      'status': 'paid',
      'paidTransactionId': transactionId,
    });

    expect(request.expectedVersion, 2);
    expect(request.patch, {
      'status': 'paid',
      'paid_transaction_id': transactionId,
    });
  });

  test('bill rejects invalid money, date and update fields', () {
    expect(
      () => CreateBillRequest.fromJson({
        'title': 'Điện',
        'amount': 0,
        'dueAt': 'not-a-date',
      }),
      throwsFormatException,
    );
    expect(
      () => UpdateBillRequest.fromJson({
        'expectedVersion': 1,
        'status': 'unknown',
      }),
      throwsFormatException,
    );
    expect(
      () => UpdateBillRequest.fromJson({'expectedVersion': 0, 'title': 'Điện'}),
      throwsFormatException,
    );
  });
}
