import 'dart:async';
import 'dart:convert';
import 'dart:io';
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

  String _reservation(String purpose, String phone) {
    final key = env['OTP_HMAC_KEY'] ?? env['SUPABASE_SECRET_KEY'] ?? '';
    return otpHash(key, 'phone-$purpose|$phone');
  }

  /// Maps a gate status from the database to the HTTP error it stands for.
  static void _throwForStatus(Object? status) {
    switch (status) {
      case 'ok':
        return;
      case 'sms_disabled':
        throw const GatewayException(403, 'SMS verification is disabled.');
      case 'rate_limited':
        throw const GatewayException(
          429,
          'Too many requests. Try again later.',
        );
      case 'phone_taken':
        throw const GatewayException(409, 'Phone already used.');
      case 'quota_reached':
        throw const GatewayException(429, 'SMS limit reached for today.');
      case 'no_reservation':
        throw const GatewayException(403, 'Request a new code first.');
      case 'weak_password':
        throw const FormatException('Weak password.');
    }
    throw const GatewayException(502, 'Phone verification unavailable.');
  }

  /// Checks the proof's phone and burns it (single use).
  Future<void> _useProof(
    VerifiedFirebasePhone proof,
    String phone,
    String purpose,
  ) async {
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
  }

  /// Starts verifying the Firebase token without waiting; failures surface
  /// only when the result is awaited, after the database gate has passed.
  Future<VerifiedFirebasePhone> _verifyInBackground(String idToken) {
    return verifier.verify(idToken)..ignore();
  }

  /// Deletes the temporary Firebase user after the response is ready.
  void _deleteFirebaseUserLater(String idToken) {
    unawaited(
      deleteFirebaseUser(
        _client,
        env['FIREBASE_WEB_API_KEY'] ?? '',
        idToken,
      ).catchError((Object error) {
        stderr.writeln('Firebase user delete failed: $error');
      }),
    );
  }

  /// Called before the device asks Firebase to send an SMS: applies PicKet's
  /// own limits (per number, per client, daily cap), rejects taken numbers and
  /// reserves the number for [complete] (15 minutes, single use).
  /// `purpose` is `signup` or `reset` (password recovery; ownership is not
  /// revealed here). One database round trip.
  Future<Map<String, Object>> start(
    String phone,
    String client, {
    String purpose = 'signup',
  }) async {
    final status = await store.authRpc('auth_phone_signup_start', {
      'p_phone': phone,
      'p_phone_key': _hash(phone),
      'p_client_key': _hash(client),
      'p_reservation': _reservation(purpose, phone),
      'p_purpose': purpose,
    });
    _throwForStatus(status);
    return {'ok': true};
  }

  Future<Map<String, dynamic>> complete({
    required String phone,
    required String idToken,
    required String password,
    required String client,
  }) async {
    // The token check (certificates + signature) overlaps with the gate; its
    // outcome is only looked at once the gate has passed.
    final proofFuture = _verifyInBackground(idToken);
    final gate = await store.authRpc('auth_phone_signup_complete_gate', {
      'p_phone': phone,
      'p_client_key': _hash(client),
      'p_reservation': _reservation('signup', phone),
      'p_password_ok': strongPassword(password),
    });
    final result = gate is Map ? gate : const <String, Object?>{};
    _throwForStatus(result['status']);
    // The single-use reservation makes this attempt exclusive for the number,
    // so an account left behind by an earlier timed-out attempt can go.
    final pending = result['pending'];
    final proof = await proofFuture;
    await Future.wait([
      _useProof(proof, phone, 'signup'),
      if (pending is String) _deletePending(pending),
    ]);
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
      final claim = store.authRpc('contact_claim_verified_phone', {
        'p_user': userId,
        'p_phone': phone,
        'p_via': 'firebase',
      });
      final signIn = _signIn(phone, password);
      await Future.wait<Object?>([claim, signIn]);
      _deleteFirebaseUserLater(idToken);
      return await signIn;
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
    final proofFuture = _verifyInBackground(idToken);
    final status = await store.authRpc('auth_phone_reset_gate', {
      'p_client_key': _hash(client),
      'p_reservation': _reservation('reset', phone),
      'p_password_ok': strongPassword(password),
    });
    _throwForStatus(status);
    final proof = await proofFuture;
    if (proof.phone != phone) {
      throw const GatewayException(401, 'Invalid phone verification.');
    }
    // The target lookup is read-only and independent; the proof result is
    // checked first so its outcome decides the error.
    final targetFuture = store.authRpc('auth_phone_recovery_target', {
      'p_phone': phone,
    })..ignore();
    await _useProof(proof, phone, 'recovery');
    final target = await targetFuture;
    if (target is! String) {
      throw const GatewayException(404, 'No account uses this phone.');
    }
    await store.setUserPassword(target, password);
    _deleteFirebaseUserLater(idToken);
    return {'ok': true};
  }

  Future<void> _deletePending(String id) async {
    try {
      await store.deleteUser(id);
    } on Object {
      // The 10-minute pending window lets a later attempt clean up again.
    }
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
