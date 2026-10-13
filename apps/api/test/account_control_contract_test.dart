import 'package:picket_api/src/account_control_contract.dart';
import 'package:test/test.dart';

void main() {
  test('delete account requires the exact confirmation payload', () {
    expect(
      DeleteAccountRequest.fromJson({'confirmation': 'DELETE'}),
      isA<DeleteAccountRequest>(),
    );
    expect(
      () => DeleteAccountRequest.fromJson({'confirmation': 'delete'}),
      throwsFormatException,
    );
    expect(
      () => DeleteAccountRequest.fromJson({
        'confirmation': 'DELETE',
        'userId': 'another-user',
      }),
      throwsFormatException,
    );
  });
}
