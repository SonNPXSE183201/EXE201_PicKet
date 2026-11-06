import 'package:picket_api/src/profile_contract.dart';
import 'package:test/test.dart';

void main() {
  group('CompleteOnboardingRequest', () {
    test('normalizes valid input for the database RPC', () {
      final request = CompleteOnboardingRequest.fromJson({
        'displayName': ' An ',
        'persona': 'Đi làm',
        'goal': 'Hiểu chi tiêu',
        'currencyCode': 'vnd',
        'walletName': ' Tiền mặt ',
        'openingBalance': 1000000,
      });

      expect(request.toRpcJson(), {
        'display_name': 'An',
        'persona': 'Đi làm',
        'goal': 'Hiểu chi tiêu',
        'currency_code': 'VND',
        'wallet_name': 'Tiền mặt',
        'opening_balance': 1000000,
      });
    });

    test('rejects missing or invalid values', () {
      expect(
        () => CompleteOnboardingRequest.fromJson({}),
        throwsFormatException,
      );
      expect(
        () => CompleteOnboardingRequest.fromJson({
          'displayName': 'An',
          'persona': 'Đi làm',
          'goal': 'Tiết kiệm',
          'currencyCode': 'VN',
          'walletName': 'Tiền mặt',
          'openingBalance': 0,
        }),
        throwsFormatException,
      );
    });
  });

  test('profile patch rejects mass assignment fields', () {
    expect(profilePatch({'display_name': 'An'}), {'display_name': 'An'});
    expect(() => profilePatch({'id': 'another-user'}), throwsFormatException);
  });

  test('preferences patch validates and normalizes currency', () {
    expect(preferencesPatch({'currency_code': 'usd', 'hide_balance': true}), {
      'currency_code': 'USD',
      'hide_balance': true,
    });
  });
}
