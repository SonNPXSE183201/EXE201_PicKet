import 'package:picket_api/src/entitlement_contract.dart';
import 'package:test/test.dart';

void main() {
  test('maps server-authoritative entitlement counters', () {
    final result = EntitlementsResource.fromDatabase({
      'tier': 'plus',
      'ocr_fallback_daily_limit': 30,
      'ocr_fallback_used': 4,
      'ocr_fallback_remaining': 26,
    });
    expect(result.toJson(), {
      'tier': 'plus',
      'ocrFallbackDailyLimit': 30,
      'ocrFallbackUsed': 4,
      'ocrFallbackRemaining': 26,
    });
  });

  test('rejects invalid tier and quota counters', () {
    expect(
      () => EntitlementsResource.fromDatabase({
        'tier': 'admin',
        'ocr_fallback_daily_limit': 3,
        'ocr_fallback_used': 4,
        'ocr_fallback_remaining': -1,
      }),
      throwsA(anything),
    );
  });
}
