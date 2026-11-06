import 'package:picket_api/src/admin_action_contract.dart';
import 'package:test/test.dart';

void main() {
  test('requires action-specific confirmation', () {
    expect(
      () => AdminUserActionRequest.fromJson({
        'action': 'suspend',
        'confirmation': 'suspend',
      }),
      throwsFormatException,
    );
    final action = AdminUserActionRequest.fromJson({
      'action': 'suspend',
      'confirmation': 'SUSPEND',
    });
    expect(action.action, AdminUserAction.suspend);
  });

  test('grant plan requires an allow-listed tier', () {
    expect(
      () => AdminUserActionRequest.fromJson({
        'action': 'grant_plan',
        'confirmation': 'GRANT',
        'tier': 'staff',
      }),
      throwsFormatException,
    );
    final action = AdminUserActionRequest.fromJson({
      'action': 'grant_plan',
      'confirmation': 'GRANT',
      'tier': 'plus',
    });
    expect(action.tier, 'plus');
  });
}
