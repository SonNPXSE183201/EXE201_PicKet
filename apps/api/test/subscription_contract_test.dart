import 'package:picket_api/src/subscription_contract.dart';
import 'package:test/test.dart';

void main() {
  const walletId = '11111111-1111-4111-8111-111111111111';
  const categoryId = '22222222-2222-4222-8222-222222222222';

  test('subscription create normalizes a valid monthly schedule', () {
    final request = CreateSubscriptionRequest.fromJson({
      'walletId': walletId,
      'categoryId': categoryId,
      'title': ' Netflix ',
      'amount': 260000,
      'cadence': 'monthly',
      'nextDueAt': '2026-11-15T12:00:00.000Z',
      'cycleMonths': 1,
      'note': ' Gói gia đình ',
      'alertDays': 3,
    });

    expect(request.toRpcJson('subscription-key-0001'), {
      'p_idempotency_key': 'subscription-key-0001',
      'p_wallet_id': walletId,
      'p_category_id': categoryId,
      'p_title': 'Netflix',
      'p_amount': 260000,
      'p_cadence': 'monthly',
      'p_next_due_at': '2026-11-15T12:00:00.000Z',
      'p_cycle_months': 1,
      'p_note': 'Gói gia đình',
      'p_alert_days': 3,
    });
  });

  test('subscription rejects invalid schedule and stale updates', () {
    expect(
      () => CreateSubscriptionRequest.fromJson({
        'title': 'Netflix',
        'amount': 1,
        'cadence': 'daily',
        'nextDueAt': 'invalid',
        'cycleMonths': 0,
        'alertDays': 500,
      }),
      throwsFormatException,
    );
    expect(
      () => UpdateSubscriptionRequest.fromJson({
        'expectedVersion': 0,
        'active': false,
      }),
      throwsFormatException,
    );
  });
}
