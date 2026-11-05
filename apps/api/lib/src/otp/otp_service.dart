import 'dart:convert';
import 'dart:math';
import 'package:crypto/crypto.dart';
import 'package:picket_api/src/admin_service.dart';
import 'package:picket_api/src/otp/sms_provider.dart';
import 'package:picket_api/src/supabase_gateway.dart';

/// Channels offered to clients. Email OTP is handled by Supabase Auth (Gmail
/// SMTP); SMS turns on by setting OTP_CHANNELS=sms,email plus a provider.
class OtpChannels {
  OtpChannels(this.env, {SmsProvider? sms})
    : sms = sms ?? smsProviderFromEnvironment(env);
  final Map<String, String> env;
  final SmsProvider? sms;
  List<String> get configured => (env['OTP_CHANNELS'] ?? 'email')
      .split(',')
      .map((c) => c.trim())
      .where((c) => c == 'email' || c == 'sms')
      .toList();
  bool get smsEnabled =>
      configured.contains('sms') &&
      sms != null &&
      (env['OTP_HMAC_KEY'] ?? '').length >= 32;
  Map<String, Object> describe() => {
    'email': configured.contains('email'),
    'sms': smsEnabled,
    'order': [
      for (final c in configured)
        if (c != 'sms' || smsEnabled) c,
    ],
  };
}

String otpHash(String key, String value) =>
    Hmac(sha256, utf8.encode(key)).convert(utf8.encode(value)).toString();

/// SMS one-time codes for phone ownership. Codes are 6 digits, stored only as
/// HMACs, valid 5 minutes, 5 attempts, 60 s resend cooldown, rate limited.
class OtpService {
  OtpService(this.channels, this.store, {Random? random})
    : _random = random ?? Random.secure();
  final OtpChannels channels;
  final AdminService store;
  final Random _random;
  String get _key => channels.env['OTP_HMAC_KEY']!;

  Future<Map<String, dynamic>> startPhoneVerification(
    String userId,
    String phone,
  ) async {
    if (!channels.smsEnabled) {
      throw const GatewayException(
        503,
        'SMS verification is not available yet.',
      );
    }
    final destination = otpHash(_key, 'sms|$phone');
    final allowed = await store.authRpc('auth_rate_hit', {
      'p_key': 'otp:sms:${destination.substring(0, 32)}',
      'p_limit': 5,
      'p_window_seconds': 3600,
    });
    if (allowed != true) {
      throw const GatewayException(429, 'Too many codes requested.');
    }
    final code = List.generate(6, (_) => _random.nextInt(10)).join();
    final challenge = await store.authRpc('otp_create', {
      'p_channel': 'sms',
      'p_destination_hash': destination,
      'p_user': userId,
      'p_purpose': 'verify_phone',
      'p_code_hash': otpHash(_key, 'verify_phone|$phone|$code'),
      'p_ttl_seconds': 300,
    });
    await channels.sms!.send(
      phone,
      'Ma xac minh Picket: $code. Het han sau 5 phut. Khong chia se ma nay.',
    );
    return Map<String, dynamic>.from(challenge! as Map);
  }

  Future<bool> verifyPhone(
    String userId,
    String phone,
    String challengeId,
    String code,
  ) async {
    if (!channels.smsEnabled) {
      throw const GatewayException(
        503,
        'SMS verification is not available yet.',
      );
    }
    if (!RegExp(r'^[0-9]{6}$').hasMatch(code)) return false;
    final result = await store.authRpc('otp_verify', {
      'p_id': challengeId,
      'p_code_hash': otpHash(_key, 'verify_phone|$phone|$code'),
      'p_user': userId,
    });
    if (result is! Map || result['ok'] != true) return false;
    await store.authRpc('contact_mark_phone_verified', {
      'p_user': userId,
      'p_phone': phone,
    });
    return true;
  }
}
