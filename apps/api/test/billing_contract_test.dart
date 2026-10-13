import 'package:picket_api/src/billing_contract.dart';
import 'package:test/test.dart';

void main() {
  test('accepts a known Google Play subscription and purchase token', () {
    final request = VerifyPlayPurchaseRequest.fromJson({
      'productId': 'picket_plus_monthly',
      'purchaseToken': 'play-token',
    });

    expect(request.toFunctionJson(), {
      'productId': 'picket_plus_monthly',
      'purchaseToken': 'play-token',
    });
  });

  test('rejects unknown products, missing tokens and extra fields', () {
    for (final payload in <Map<String, Object?>>[
      {'productId': 'picket_unknown', 'purchaseToken': 'play-token'},
      {'productId': 'picket_pro_yearly', 'purchaseToken': ''},
      {
        'productId': 'picket_pro_yearly',
        'purchaseToken': 'play-token',
        'tier': 'pro',
      },
    ]) {
      expect(
        () => VerifyPlayPurchaseRequest.fromJson(payload),
        throwsFormatException,
      );
    }
  });

  test('maps a verified server response without trusting client tier data', () {
    final result = PlayPurchaseVerification.fromJson({
      'verified': true,
      'active': true,
      'tier': 'pro',
      'expiresAt': '2026-11-13T00:00:00.000Z',
    });

    expect(result.toJson(), {
      'verified': true,
      'active': true,
      'tier': 'pro',
      'expiresAt': '2026-11-13T00:00:00.000Z',
    });
  });
}
