import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:picket_api/src/admin_service.dart';
import 'package:picket_api/src/api_config.dart';
import 'package:picket_api/src/otp/otp_service.dart';
import 'package:picket_api/src/supabase_gateway.dart';

/// Password sign-in with a phone number. The phone resolves to the account,
/// then Supabase Auth checks the password, so the API never stores or compares
/// passwords itself. Unknown phone and wrong password give the same answer.
class PhoneLoginService {
  PhoneLoginService(this.config, this.store, this.env, {http.Client? client})
    : _client = client ?? http.Client();
  final ApiConfig config;
  final AdminService store;
  final Map<String, String> env;
  final http.Client _client;
  static const invalid = GatewayException(401, 'Invalid phone or password.');

  Future<Map<String, dynamic>> login(
    String phone,
    String password,
    String client,
  ) async {
    final key = env['OTP_HMAC_KEY'] ?? env['SUPABASE_SECRET_KEY'] ?? '';
    for (final (bucket, limit) in [
      ('phone:${otpHash(key, phone).substring(0, 32)}', 5),
      ('client:${otpHash(key, client).substring(0, 32)}', 20),
    ]) {
      final allowed = await store.authRpc('auth_rate_hit', {
        'p_key': 'login:$bucket',
        'p_limit': limit,
        'p_window_seconds': 900,
      });
      if (allowed != true) {
        throw const GatewayException(429, 'Too many sign-in attempts.');
      }
    }
    final account = await store.authRpc('auth_phone_lookup', {
      'p_phone': phone,
    });
    if (account is! Map || account['userId'] == null) throw invalid;
    final grant = account['email'] is String
        ? {'email': account['email'], 'password': password}
        : account['authPhone'] is String
        ? {'phone': account['authPhone'], 'password': password}
        : null;
    if (grant == null) throw invalid;
    final response = await _client
        .post(
          config.supabaseUrl.resolve('/auth/v1/token?grant_type=password'),
          headers: {
            'apikey': config.supabasePublishableKey,
            'content-type': 'application/json',
          },
          body: jsonEncode(grant),
        )
        .timeout(const Duration(seconds: 15));
    if (response.statusCode == 400 || response.statusCode == 401) throw invalid;
    if (response.statusCode != 200) {
      throw const GatewayException(502, 'Sign-in service unavailable.');
    }
    final session = jsonDecode(response.body);
    if (session is! Map<String, dynamic> ||
        session['access_token'] is! String ||
        session['refresh_token'] is! String) {
      throw const GatewayException(502, 'Sign-in service unavailable.');
    }
    return {
      'access_token': session['access_token'],
      'refresh_token': session['refresh_token'],
      'expires_in': session['expires_in'],
      'expires_at': session['expires_at'],
      'token_type': session['token_type'],
    };
  }

  void close() => _client.close();
}
