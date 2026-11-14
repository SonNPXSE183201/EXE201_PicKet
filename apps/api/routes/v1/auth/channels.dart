import 'dart:io';
import 'package:dart_frog/dart_frog.dart';
import 'package:picket_api/src/admin_service.dart';
import 'package:picket_api/src/api_config.dart';
import 'package:picket_api/src/authenticated_route.dart';
import 'package:picket_api/src/otp/otp_service.dart';

/// Which OTP channels the apps should offer.
/// - `email`/`sms`/`order`: legacy fields kept for installed clients.
/// - `verification`: sign-up channels chosen by admins (email OTP via
///   Supabase, SMS OTP via Firebase). Falls back to email-only if the settings
///   cannot be read.
Future<Response> onRequest(RequestContext context) async {
  if (context.request.method != HttpMethod.get) {
    return apiError(HttpStatus.methodNotAllowed, 'Method not allowed');
  }
  final env = Platform.environment;
  var verification = <String, Object?>{
    'email': true,
    'sms': false,
    'smsProvider': 'firebase',
  };
  AdminService? store;
  try {
    store = AdminService(ApiConfig.fromEnvironment());
    final settings = await store.authRpc('auth_verification_public', {});
    if (settings is Map &&
        settings['email'] is bool &&
        settings['sms'] is bool &&
        (settings['email'] == true || settings['sms'] == true)) {
      verification = {
        'email': settings['email'],
        // SMS needs a configured Firebase project on the server as well.
        'sms':
            settings['sms'] == true &&
            (env['FIREBASE_PROJECT_ID'] ?? '').isNotEmpty,
        'smsProvider': 'firebase',
      };
      if (verification['email'] != true && verification['sms'] != true) {
        verification['email'] = true;
      }
    }
  } on Object {
    // Keep the email-only fallback.
  } finally {
    store?.close();
  }
  return Response.json(
    body: {...OtpChannels(env).describe(), 'verification': verification},
    headers: {'cache-control': 'public, max-age=60'},
  );
}
