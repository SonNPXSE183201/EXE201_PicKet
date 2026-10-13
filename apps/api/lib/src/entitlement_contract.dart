import 'dart:io';

import 'package:picket_api/src/supabase_gateway.dart';

class EntitlementsResource {
  const EntitlementsResource({
    required this.tier,
    required this.ocrFallbackDailyLimit,
    required this.ocrFallbackUsed,
    required this.ocrFallbackRemaining,
  });

  factory EntitlementsResource.fromDatabase(Object? value) {
    if (value is! Map) {
      throw const GatewayException(
        HttpStatus.badGateway,
        'Supabase returned invalid entitlements.',
      );
    }
    final json = Map<String, dynamic>.from(value);
    final tier = json['tier'];
    final limit = json['ocr_fallback_daily_limit'];
    final used = json['ocr_fallback_used'];
    final remaining = json['ocr_fallback_remaining'];
    if (!{'free', 'plus', 'pro'}.contains(tier) ||
        limit is! int ||
        used is! int ||
        remaining is! int ||
        limit < 0 ||
        used < 0 ||
        remaining < 0 ||
        remaining > limit) {
      throw const GatewayException(
        HttpStatus.badGateway,
        'Supabase returned invalid entitlements.',
      );
    }
    return EntitlementsResource(
      tier: tier as String,
      ocrFallbackDailyLimit: limit,
      ocrFallbackUsed: used,
      ocrFallbackRemaining: remaining,
    );
  }

  final String tier;
  final int ocrFallbackDailyLimit;
  final int ocrFallbackUsed;
  final int ocrFallbackRemaining;

  Map<String, dynamic> toJson() => {
    'tier': tier,
    'ocrFallbackDailyLimit': ocrFallbackDailyLimit,
    'ocrFallbackUsed': ocrFallbackUsed,
    'ocrFallbackRemaining': ocrFallbackRemaining,
  };
}
