import 'dart:async';
import 'dart:convert';
import 'package:dart_jsonwebtoken/dart_jsonwebtoken.dart';
import 'package:http/http.dart' as http;
import 'package:picket_api/src/supabase_gateway.dart';

/// A phone number whose ownership Firebase Phone Auth has just proven.
class VerifiedFirebasePhone {
  const VerifiedFirebasePhone({
    required this.uid,
    required this.phone,
    required this.authTime,
  });
  final String uid;
  final String phone;

  /// Seconds since epoch of the SMS verification; with [uid] it identifies
  /// one proof, which PicKet accepts only once.
  final int authTime;
}

/// Resolves a Firebase signing key id (`kid`) to a public key.
typedef FirebaseKeyResolver = Future<JWTKey?> Function(String kid);

const _certsUrl =
    'https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com';

/// Downloads Google's securetoken certificates and caches them for the
/// duration announced in `Cache-Control: max-age`.
class GoogleSecureTokenKeys {
  GoogleSecureTokenKeys({http.Client? client, DateTime Function()? now})
    : _client = client ?? http.Client(),
      _now = now ?? DateTime.now;
  final http.Client _client;
  final DateTime Function() _now;
  Map<String, JWTKey> _keys = const {};
  DateTime _expires = DateTime.fromMillisecondsSinceEpoch(0);

  Future<JWTKey?> resolve(String kid) async {
    if (_now().isAfter(_expires) || !_keys.containsKey(kid)) await _refresh();
    return _keys[kid];
  }

  Future<void> _refresh() async {
    final response = await _client
        .get(Uri.parse(_certsUrl))
        .timeout(const Duration(seconds: 10));
    if (response.statusCode != 200) {
      throw const GatewayException(503, 'Phone verification unavailable.');
    }
    final body = jsonDecode(response.body);
    if (body is! Map) {
      throw const GatewayException(503, 'Phone verification unavailable.');
    }
    final maxAge = RegExp(
      r'max-age=(\d+)',
    ).firstMatch(response.headers['cache-control'] ?? '')?.group(1);
    _keys = {
      for (final entry in body.entries)
        if (entry.key is String && entry.value is String)
          entry.key as String: RSAPublicKey.cert(entry.value as String),
    };
    _expires = _now().add(
      Duration(seconds: (int.tryParse(maxAge ?? '') ?? 3600).clamp(60, 86400)),
    );
  }

  void close() => _client.close();
}

/// Verifies a Firebase Auth ID token produced by phone sign-in, following
/// https://firebase.google.com/docs/auth/admin/verify-id-tokens, plus PicKet
/// rules: provider must be `phone` and sign-in must be recent.
class FirebasePhoneTokenVerifier {
  FirebasePhoneTokenVerifier({
    required this.projectId,
    required this.keys,
    DateTime Function()? now,
    this.maxAuthAge = const Duration(minutes: 10),
  }) : _now = now ?? DateTime.now;

  final String projectId;
  final FirebaseKeyResolver keys;
  final DateTime Function() _now;
  final Duration maxAuthAge;
  static const _skew = 60;
  static const invalid = GatewayException(401, 'Invalid phone verification.');

  Future<VerifiedFirebasePhone> verify(String token) async {
    if (projectId.isEmpty) {
      throw const GatewayException(503, 'Phone verification unavailable.');
    }
    final parts = token.split('.');
    if (parts.length != 3 || token.length > 4096) throw invalid;
    final Map<String, dynamic> header;
    try {
      final decoded = jsonDecode(
        utf8.decode(base64Url.decode(base64Url.normalize(parts[0]))),
      );
      if (decoded is! Map<String, dynamic>) throw invalid;
      header = decoded;
    } on FormatException {
      throw invalid;
    }
    final kid = header['kid'];
    if (header['alg'] != 'RS256' || kid is! String || kid.isEmpty) {
      throw invalid;
    }
    final key = await keys(kid);
    if (key == null) throw invalid;
    final Object? payload;
    try {
      payload = JWT
          .verify(
            token,
            key,
            checkHeaderType: false,
            checkExpiresIn: false,
            checkNotBefore: false,
            issuer: 'https://securetoken.google.com/$projectId',
            audience: Audience.one(projectId),
          )
          .payload;
    } on JWTException {
      throw invalid;
    }
    if (payload is! Map) throw invalid;
    final now = _now().millisecondsSinceEpoch ~/ 1000;
    final exp = payload['exp'];
    final iat = payload['iat'];
    final authTime = payload['auth_time'];
    final sub = payload['sub'];
    final phone = payload['phone_number'];
    final firebase = payload['firebase'];
    if (exp is! int || iat is! int || authTime is! int) throw invalid;
    if (exp <= now - _skew || iat > now + _skew || authTime > now + _skew) {
      throw invalid;
    }
    if (now - authTime > maxAuthAge.inSeconds) throw invalid;
    if (sub is! String || sub.isEmpty || sub.length > 128) throw invalid;
    if (firebase is! Map || firebase['sign_in_provider'] != 'phone') {
      throw invalid;
    }
    if (phone is! String || !RegExp(r'^\+[1-9][0-9]{7,14}$').hasMatch(phone)) {
      throw invalid;
    }
    return VerifiedFirebasePhone(uid: sub, phone: phone, authTime: authTime);
  }
}

/// Deletes the temporary Firebase user once the phone is recorded in Supabase,
/// so Firebase keeps no phone number. Failure is not fatal (the device also
/// deletes its Firebase user), so this never throws: it returns `null` when
/// the user is gone, otherwise why it could not be deleted, for the logs.
Future<String?> deleteFirebaseUser(
  http.Client client,
  String apiKey,
  String idToken,
) async {
  if (apiKey.isEmpty) return 'FIREBASE_WEB_API_KEY is not configured';
  try {
    final response = await client
        .post(
          Uri.parse(
            'https://identitytoolkit.googleapis.com/v1/accounts:delete?key=$apiKey',
          ),
          headers: {'content-type': 'application/json'},
          body: jsonEncode({'idToken': idToken}),
        )
        .timeout(const Duration(seconds: 10));
    if (response.statusCode < 300) return null;
    // Already deleted by the device.
    if (response.body.contains('USER_NOT_FOUND')) return null;
    return 'HTTP ${response.statusCode}';
  } on Object catch (error) {
    return error.runtimeType.toString();
  }
}
