import 'package:picket_api/src/transaction_contract.dart';
import 'package:test/test.dart';

void main() {
  const accountId = '11111111-1111-4111-8111-111111111111';
  const categoryId = '22222222-2222-4222-8222-222222222222';
  const destinationId = '33333333-3333-4333-8333-333333333333';

  test('create transaction validates and maps RPC parameters', () {
    final request = CreateTransactionRequest.fromJson({
      'accountId': accountId,
      'categoryId': categoryId,
      'title': '  Bữa trưa ',
      'amount': 55000,
      'kind': 'expense',
      'occurredAt': '2026-10-08T05:00:00.000Z',
      'note': 'test',
    });
    expect(request.toRpcJson('request-0001'), {
      'p_idempotency_key': 'request-0001',
      'p_wallet_id': accountId,
      'p_category_id': categoryId,
      'p_title': 'Bữa trưa',
      'p_amount': 55000,
      'p_kind': 'expense',
      'p_occurred_at': '2026-10-08T05:00:00.000Z',
      'p_note': 'test',
    });
  });

  test('create transaction rejects unsupported and invalid values', () {
    expect(
      () => CreateTransactionRequest.fromJson({
        'accountId': accountId,
        'title': 'Transfer',
        'amount': 10,
        'kind': 'transfer',
        'occurredAt': '2026-10-08T05:00:00Z',
      }),
      throwsFormatException,
    );
    expect(
      () => CreateTransactionRequest.fromJson({
        'accountId': accountId,
        'title': 'Invalid',
        'amount': 0,
        'kind': 'expense',
        'occurredAt': 'not-a-date',
      }),
      throwsFormatException,
    );
  });

  test('transaction update maps only allowed fields', () {
    final request = UpdateTransactionRequest.fromJson({
      'expectedVersion': 4,
      'title': 'Tên mới',
      'categoryId': null,
    });
    expect(request.expectedVersion, 4);
    expect(request.patch, {'title': 'Tên mới', 'category_id': null});
    expect(
      () => UpdateTransactionRequest.fromJson({
        'expectedVersion': 1,
        'refundOf': accountId,
      }),
      throwsFormatException,
    );
  });

  test('idempotency keys use a restricted transport-safe format', () {
    expect(
      validateIdempotencyKey('mobile:request-0001'),
      'mobile:request-0001',
    );
    expect(() => validateIdempotencyKey('short'), throwsFormatException);
    expect(
      () => validateIdempotencyKey('contains whitespace'),
      throwsFormatException,
    );
  });

  test('transfer requires two different accounts and maps RPC parameters', () {
    final request = CreateTransferRequest.fromJson({
      'sourceAccountId': accountId,
      'destinationAccountId': destinationId,
      'title': ' Chuyển quỹ ',
      'amount': 100000,
      'occurredAt': '2026-10-08T06:00:00Z',
    });
    expect(request.toRpcJson('transfer-0001'), {
      'p_idempotency_key': 'transfer-0001',
      'p_source_wallet_id': accountId,
      'p_destination_wallet_id': destinationId,
      'p_title': 'Chuyển quỹ',
      'p_amount': 100000,
      'p_occurred_at': '2026-10-08T06:00:00.000Z',
      'p_note': '',
    });
    expect(
      () => CreateTransferRequest.fromJson({
        'sourceAccountId': accountId,
        'destinationAccountId': accountId,
        'title': 'Invalid',
        'amount': 1,
        'occurredAt': '2026-10-08T06:00:00Z',
      }),
      throwsFormatException,
    );
  });

  test('refund and split requests reject unsafe amounts and duplicates', () {
    final refund = CreateRefundRequest.fromJson({
      'amount': 20000,
      'occurredAt': '2026-10-08T06:00:00Z',
      'note': 'Một phần',
    });
    expect(refund.amount, 20000);
    final splits = SetTransactionSplitsRequest.fromJson({
      'expectedVersion': 2,
      'splits': [
        {'categoryId': categoryId, 'amount': 30000},
        {'categoryId': destinationId, 'amount': 25000},
      ],
    });
    expect(splits.splits.length, 2);
    expect(
      () => SetTransactionSplitsRequest.fromJson({
        'expectedVersion': 2,
        'splits': [
          {'categoryId': categoryId, 'amount': 1},
          {'categoryId': categoryId, 'amount': 2},
        ],
      }),
      throwsFormatException,
    );
  });
}
