import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:picket_api/src/admin_service.dart';
import 'package:picket_api/src/api_config.dart';
import 'package:picket_api/src/firebase/firebase_phone_token.dart';
import 'package:picket_api/src/otp/otp_service.dart';
import 'package:picket_api/src/supabase_gateway.dart';

const _symbols = r"""!@#$%^&*()_+-=[]{};':"\|,.<>/?`~""";

/// Same rule as the web and mobile forms: 12+ characters with lower, upper,
/// digit and symbol.
bool strongPassword(String value) =>
    value.length >= 12 &&
    value.length <= 200 &&
    RegExp('[a-z]').hasMatch(value) &&
    RegExp('[A-Z]').hasMatch(value) &&
    RegExp(r'\d').hasMatch(value) &&
    value.split('').any(_symbols.contains);

/// Sign-up by SMS: Firebase sends and checks the 6-digit code on the device,
/// this service checks the Firebase proof, creates the Supabase account with
/// the password chosen right after the code, and returns its session.
class PhoneSignupService {
  PhoneSignupService(
    this.config,
    this.store,
    this.env, {
    required this.verifier,
    http.Client? client,
  }) : _client = client ?? http.Client();
  final ApiConfig config;
  final AdminService store;
  final Map<String, String> env;
  final FirebasePhoneTokenVerifier verifier;
  final http.Client _client;

  String _hash(String value) {
    final key = env['OTP_HMAC_KEY'] ?? env['SUPABASE_SECRET_KEY'] ?? '';
    return otpHash(key, value).substring(0, 32);
  }

  Future<void> _requireSmsEnabled() async {
    final settings = await store.authRpc('auth_verification_public', {});
    if (settings is! Map || settings['sms'] != true) {
      throw const GatewayException(403, 'SMS verification is disabled.');
    }
  }

  Future<void> _limit(String bucket, int limit, int seconds) async {
    final allowed = await store.authRpc('auth_rate_hit', {
      'p_key': 'phone-signup:$bucket',
      'p_limit': limit,
      'p_window_seconds': seconds,
    });
    if (allowed != true) {
      throw const GatewayException(429, 'Too many requests. Try again later.');
    }
  }

  Future<void> _requireFreePhone(String phone) async {
    final owner = await store.authRpc('auth_phone_owner', {'p_phone': phone});
    if (owner is String) {
      throw const GatewayException(409, 'Phone already used.');
    }
  }

  String _reservation(String purpose, String phone) {
    final key = env['OTP_HMAC_KEY'] ?? env['SUPABASE_SECRET_KEY'] ?? '';
    return otpHash(key, 'phone-$purpose|$phone');
  }

  Future<VerifiedFirebasePhone> _useProof(
    String idToken,
    String phone,
    String purpose,
  ) async {
    final proof = await verifier.verify(idToken);
    if (proof.phone != phone) {
      throw const GatewayException(401, 'Invalid phone verification.');
    }
    final fresh = await store.authRpc('auth_firebase_proof_use', {
      'p_uid': proof.uid,
      'p_auth_time': proof.authTime,
      'p_phone': phone,
      'p_purpose': purpose,
    });
    if (fresh != true) {
      throw const GatewayException(401, 'Invalid phone verification.');
    }
    return proof;
  }

  Future<void> _consume(String purpose, String phone) async {
    final ok = await store.authRpc('auth_phone_signup_consume', {
      'p_destination_hash': _reservation(purpose, phone),
    });
    if (ok != true) {
      throw const GatewayException(403, 'Request a new code first.');
    }
  }

  /// Called before the device asks Firebase to send an SMS: applies PicKet's
  /// own limits (per number, per client, daily cap), rejects taken numbers and
  /// reserves the number for [complete] (15 minutes, single use).
  /// `purpose` is `signup` or `reset` (password recovery; ownership is not
  /// revealed here).
  Future<Map<String, Object>> start(
    String phone,
    String client, {
    String purpose = 'signup',
  }) async {
    if (purpose == 'signup') await _requireSmsEnabled();
    await _limit('start-phone:${_hash(phone)}', 3, 3600);
    await _limit('start-client:${_hash(client)}', 10, 3600);
    if (purpose == 'signup') await _requireFreePhone(phone);
    if (await store.authRpc('auth_sms_quota_hit', {}) != true) {
      throw const GatewayException(429, 'SMS limit reached for today.');
    }
    await store.authRpc('auth_phone_signup_reserve', {
      'p_destination_hash': _reservation(purpose, phone),
    });
    return {'ok': true};
  }

  Future<Map<String, dynamic>> complete({
    required String phone,
    required String idToken,
    required String password,
    required String client,
  }) async {
    await _requireSmsEnabled();
    await _limit('complete-client:${_hash(client)}', 20, 3600);
    if (!strongPassword(password)) {
      throw const FormatException('Weak password.');
    }
    // The single-use reservation makes this attempt exclusive for the number,
    // so an account left behind by an earlier timed-out attempt can go.
    await _consume('signup', phone);
    await _cleanupPending(phone);
    await _requireFreePhone(phone);
    await _useProof(idToken, phone, 'signup');
    final String userId;
    try {
      userId = await store.createPhoneUser(phone, password);
    } on GatewayException catch (error) {
      if (error.statusCode != 409) await _cleanupPending(phone);
      rethrow;
    } on Object {
      // Timeout or lost response: Supabase may have created the account.
      await _cleanupPending(phone);
      rethrow;
    }
    try {
      await store.authRpc('contact_claim_verified_phone', {
        'p_user': userId,
        'p_phone': phone,
        'p_via': 'firebase',
      });
      final session = await _signIn(phone, password);
      await deleteFirebaseUser(
        _client,
        env['FIREBASE_WEB_API_KEY'] ?? '',
        idToken,
      );
      return session;
    } on Object {
      await store.deleteUser(userId);
      rethrow;
    }
  }

  /// Password recovery for an account whose phone was verified: the owner
  /// proves the number again with Firebase and sets a new password.
  Future<Map<String, Object>> reset({
    required String phone,
    required String idToken,
    required String password,
    required String client,
  }) async {
    await _limit('reset-client:${_hash(client)}', 10, 3600);
    if (!strongPassword(password)) {
      throw const FormatException('Weak password.');
    }
    await _consume('reset', phone);
    await _useProof(idToken, phone, 'recovery');
    final target = await store.authRpc('auth_phone_recovery_target', {
      'p_phone': phone,
    });
    if (target is! String) {
      throw const GatewayException(404, 'No account uses this phone.');
    }
    await store.setUserPassword(target, password);
    await deleteFirebaseUser(
      _client,
      env['FIREBASE_WEB_API_KEY'] ?? '',
      idToken,
    );
    return {'ok': true};
  }

  Future<void> _cleanupPending(String phone) async {
    try {
      final pending = await store.authRpc('auth_pending_phone_signup', {
        'p_phone': phone,
      });
      if (pending is String) await store.deleteUser(pending);
    } on Object {
      // The 10-minute pending window lets a later attempt clean up again.
    }
  }

  Future<Map<String, dynamic>> _signIn(String phone, String password) async {
    final response = await _client
        .post(
          config.supabaseUrl.resolve('/auth/v1/token?grant_type=password'),
          headers: {
            'apikey': config.supabasePublishableKey,
            'content-type': 'application/json',
          },
          body: jsonEncode({'phone': phone.substring(1), 'password': password}),
        )
        .timeout(const Duration(seconds: 15));
    final session = response.statusCode == 200
        ? jsonDecode(response.body)
        : null;
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
