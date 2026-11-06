import 'package:picket_api/src/budget_contract.dart';
import 'package:test/test.dart';

void main() {
  const categoryId = '11111111-1111-4111-8111-111111111111';
  test('budget create normalizes valid input', () {
    final request = CreateBudgetRequest.fromJson({
      'categoryId': categoryId,
      'name': ' Ăn uống ',
      'defaultLimit': 2000000,
      'alertPercent': 80,
    });
    expect(request.toDatabaseJson(), {
      'category_id': categoryId,
      'name': 'Ăn uống',
      'default_limit': 2000000,
      'alert_percent': 80,
    });
    expect(request.toRpcJson('budget-key-0001'), {
      'p_idempotency_key': 'budget-key-0001',
      'p_category_id': categoryId,
      'p_name': 'Ăn uống',
      'p_default_limit': 2000000,
      'p_alert_percent': 80,
    });
  });
  test('budget rejects unsafe values and stale update payloads', () {
    expect(
      () => CreateBudgetRequest.fromJson({
        'categoryId': categoryId,
        'name': 'A',
        'defaultLimit': 0,
        'alertPercent': 80,
      }),
      throwsFormatException,
    );
    expect(
      () => UpdateBudgetRequest.fromJson({'expectedVersion': 0, 'name': 'A'}),
      throwsFormatException,
    );
    expect(
      () => UpdateBudgetRequest.fromJson({
        'expectedVersion': 1,
        'categoryId': categoryId,
      }),
      throwsFormatException,
    );
  });
}
