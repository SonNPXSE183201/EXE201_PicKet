import 'package:picket_api/src/cashflow_schedule_contract.dart';
import 'package:test/test.dart';

const id = '44444444-1234-4321-8123-123456789011';
Map<String, dynamic> valid() => {
  'expectedRevision': 0,
  'schedule': {
    'id': id,
    'startDay': '2026-10-24',
    'frequency': 'monthly',
    'amount': -19000,
    'currency': 'VND',
    'active': true,
  },
};
void main() {
  test('wallet scope round trips and malformed identities reject', () {
    final input = valid();
    (input['schedule'] as Map)['walletId'] = id;
    expect(
      CashflowScheduleMutation.fromJson(input, id).schedule['walletId'],
      id,
    );
    for (final wallet in [42, '', 'other-wallet']) {
      (input['schedule'] as Map)['walletId'] = wallet;
      expect(
        () => CashflowScheduleMutation.fromJson(input, id),
        throwsFormatException,
      );
    }
  });
  test('schedule request preserves scope and stable mutation key', () {
    final result = CashflowScheduleMutation.fromJson(
      valid(),
      id,
    ).toRpcJson('schedule-test-key');
    expect(result['p_expected_revision'], 0);
    expect(result['p_action'], 'save');
    expect(result['p_request_key'], 'schedule-test-key');
  });
  test(
    'schedule rejects invalid dates amounts fields and URL identity mismatch',
    () {
      for (final change in [
        {'startDay': '2026-02-30'},
        {'amount': 0},
        {'amount': 1.5},
        {'currency': 'usd'},
        {'active': 'true'},
        {'owner': 'other'},
        {'id': '44444444-1234-4321-8123-123456789012'},
      ]) {
        final input = valid();
        (input['schedule'] as Map).addAll(change);
        expect(
          () => CashflowScheduleMutation.fromJson(input, id),
          throwsFormatException,
        );
      }
    },
  );
  test('remove accepts only revision and URL identity', () {
    final result = CashflowScheduleMutation.fromJson(
      {'expectedRevision': 2},
      id,
      remove: true,
    ).toRpcJson('schedule-delete-key');
    expect(result['p_action'], 'remove');
    expect(result['p_schedule'], {'id': id});
    expect(
      () => CashflowScheduleMutation.fromJson(
        {'expectedRevision': -1},
        id,
        remove: true,
      ),
      throwsFormatException,
    );
  });
}
