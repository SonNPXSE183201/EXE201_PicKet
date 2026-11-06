import 'package:picket_api/src/admin_contract.dart';
import 'package:test/test.dart';

void main() {
  test('maps a bounded admin overview', () {
    final overview = AdminOverviewResource.fromDatabase({
      'total_users': 1,
      'total_ledgers': 1,
      'users': [
        {
          'id': '11111111-1111-4111-8111-111111111111',
          'email': 'admin@example.test',
          'created_at': '2026-10-09T00:00:00Z',
          'banned_until': null,
          'revision': 2,
          'entry_count': 5,
        },
      ],
      'audit': [
        {
          'action': 'view_overview',
          'target': '0',
          'created_at': '2026-10-09T00:00:00Z',
        },
      ],
      'settings': {'maintenance': false, 'notice': ''},
    });
    expect(overview.totalUsers, 1);
    expect(overview.users.single.entryCount, 5);
    expect(overview.audit.single.action, 'view_overview');
  });

  test('rejects malformed or unbounded admin data', () {
    expect(
      () => AdminOverviewResource.fromDatabase({
        'total_users': 1,
        'total_ledgers': 0,
        'users': List.filled(26, <String, dynamic>{}),
        'audit': <Object?>[],
        'settings': {'maintenance': false, 'notice': ''},
      }),
      throwsA(anything),
    );
  });
}
