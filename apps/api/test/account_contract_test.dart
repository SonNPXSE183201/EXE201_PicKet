import 'package:picket_api/src/account_contract.dart';
import 'package:test/test.dart';

void main() {
  test('create account normalizes valid input', () {
    final request = CreateAccountRequest.fromJson({
      'name': '  Tiền mặt  ',
      'kind': 'cash',
      'currencyCode': 'VND',
      'openingBalance': 100000,
    });

    expect(request.toDatabaseJson(), {
      'name': 'Tiền mặt',
      'kind': 'cash',
      'currency_code': 'VND',
      'opening_balance': 100000,
    });
    expect(request.toRpcJson('account-key-0001'), {
      'p_idempotency_key': 'account-key-0001',
      'p_name': 'Tiền mặt',
      'p_kind': 'cash',
      'p_currency_code': 'VND',
      'p_opening_balance': 100000,
    });
  });

  test('create account rejects invalid enum and unsafe money', () {
    expect(
      () => CreateAccountRequest.fromJson({
        'name': 'Ví',
        'kind': 'crypto',
        'currencyCode': 'VND',
        'openingBalance': 0,
      }),
      throwsFormatException,
    );
    expect(
      () => CreateAccountRequest.fromJson({
        'name': 'Ví',
        'kind': 'cash',
        'currencyCode': 'VND',
        'openingBalance': 9000000000001,
      }),
      throwsFormatException,
    );
  });

  test('update account requires version and allow-listed fields', () {
    final request = UpdateAccountRequest.fromJson({
      'expectedVersion': 3,
      'name': 'Ngân hàng',
      'kind': 'bank',
    });
    expect(request.expectedVersion, 3);
    expect(request.patch, {'name': 'Ngân hàng', 'kind': 'bank'});

    expect(
      () => UpdateAccountRequest.fromJson({
        'expectedVersion': 1,
        'userId': 'forbidden',
      }),
      throwsFormatException,
    );
  });

  test('resource identifiers must be UUIDs', () {
    expect(
      validateUuid('123e4567-e89b-12d3-a456-426614174000'),
      '123e4567-e89b-12d3-a456-426614174000',
    );
    expect(() => validateUuid('../other-user'), throwsFormatException);
  });
}
