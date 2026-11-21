import 'package:picket_api/src/admin_service.dart';
import 'package:picket_api/src/otp/otp_service.dart';
import 'package:picket_api/src/supabase_gateway.dart';

final _email = RegExp(r'^[^@\s]+@[^@\s]+\.[^@\s]+$');

/// Normalizes a sign-up address (trimmed, lower case) or returns null when it
/// is not a plausible email.
String? normalizeSignupEmail(Object? value) {
  if (value is! String) return null;
  final email = value.trim().toLowerCase();
  if (email.length > 254 || !_email.hasMatch(email)) return null;
  return email;
}

/// Email sign-up: called before the app asks Supabase to send the 6-digit
/// code. Refuses addresses that already belong to a finished account (the
/// code would otherwise sign the owner in from the sign-up screen) and applies
/// PicKet's own per-address and per-client limits. One database round trip.
class EmailSignupService {
  EmailSignupService(this.store, this.env);
  final AdminService store;
  final Map<String, String> env;

  String _hash(String value) {
    final key = env['OTP_HMAC_KEY'] ?? env['SUPABASE_SECRET_KEY'] ?? '';
    return otpHash(key, value).substring(0, 32);
  }

  Future<Map<String, Object>> start(String email, String client) async {
    final status = await store.authRpc('auth_email_signup_start', {
      'p_email': email,
      'p_email_key': _hash('email|$email'),
      'p_client_key': _hash(client),
    });
    switch (status) {
      case 'ok':
        return {'ok': true};
      case 'email_disabled':
        throw const GatewayException(403, 'Email sign-up is disabled.');
      case 'rate_limited':
        throw const GatewayException(
          429,
          'Too many requests. Try again later.',
        );
      case 'email_taken':
        throw const GatewayException(409, 'Email already used.');
    }
    throw const GatewayException(502, 'Email verification unavailable.');
  }
}
