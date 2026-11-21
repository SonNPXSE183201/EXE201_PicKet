import 'dart:convert';
import 'dart:io';
import 'package:dart_frog/dart_frog.dart';
import 'package:http/http.dart' as http;
import 'package:picket_api/src/admin_service.dart';
import 'package:picket_api/src/authenticated_route.dart';
import 'package:picket_api/src/firebase/firebase_config.dart';
import 'package:picket_api/src/firebase/firebase_phone_token.dart';
import 'package:picket_api/src/otp/otp_service.dart';
import 'package:picket_api/src/supabase_gateway.dart';

final _phone = RegExp(r'^\+[1-9][0-9]{7,14}$');

/// Attach a phone to the signed-in account and, once SMS is configured,
/// verify ownership with a code:
/// - `{"phone": "+849..."}` attaches (unverified)
/// - `{"phone": ..., "action": "send"}` sends an SMS code
/// - `{"phone": ..., "action": "verify", "challengeId": ..., "code": "123456"}`
/// - `{"phone": ..., "action": "firebase", "idToken": ...}` marks the phone
///   verified with a Firebase Phone Auth proof (6-digit SMS code on device).
Future<Response> onRequest(RequestContext context) => handleAuthenticated(
  context,
  methods: {HttpMethod.post},
  action: (gateway, token, request) async {
    final input = jsonDecode(await readLimitedBody(request, 8192));
    if (input is! Map ||
        input['phone'] is! String ||
        !_phone.hasMatch(input['phone'] as String)) {
      throw const FormatException('Invalid phone number.');
    }
    final phone = input['phone'] as String;
    final action = input['action'] ?? 'attach';
    if (action == 'attach') {
      return Response.json(
        body: await gateway.paymentRpc(token, 'contact_set_phone', {
          'p_phone': phone,
        }),
        headers: {'cache-control': 'no-store'},
      );
    }
    final userId = await gateway.authenticate(token);
    final store = AdminService(gateway.config);
    try {
      if (action == 'firebase' && input['idToken'] is String) {
        final settings = await store.authRpc('auth_verification_public', {});
        if (settings is! Map || settings['sms'] != true) {
          throw const GatewayException(403, 'SMS verification is disabled.');
        }
        final proof = await firebasePhoneVerifier(
          Platform.environment,
        ).verify(input['idToken'] as String);
        if (proof.phone != phone) {
          throw const GatewayException(401, 'Invalid phone verification.');
        }
        final fresh = await store.authRpc('auth_firebase_proof_use', {
          'p_uid': proof.uid,
          'p_auth_time': proof.authTime,
          'p_phone': phone,
          'p_purpose': 'attach',
        });
        if (fresh != true) {
          throw const GatewayException(401, 'Invalid phone verification.');
        }
        final result = await store.authRpc('contact_claim_verified_phone', {
          'p_user': userId,
          'p_phone': phone,
          'p_via': 'firebase',
        });
        final client = http.Client();
        try {
          await deleteFirebaseUser(
            client,
            Platform.environment['FIREBASE_WEB_API_KEY'] ?? '',
            input['idToken'] as String,
          );
        } finally {
          client.close();
        }
        return Response.json(
          body: {'verified': true, 'contact': result},
          headers: {'cache-control': 'no-store'},
        );
      }
      final otp = OtpService(OtpChannels(Platform.environment), store);
      if (action == 'send') {
        return Response.json(
          body: await otp.startPhoneVerification(userId, phone),
          headers: {'cache-control': 'no-store'},
        );
      }
      if (action == 'verify' &&
          input['challengeId'] is String &&
          input['code'] is String) {
        final ok = await otp.verifyPhone(
          userId,
          phone,
          input['challengeId'] as String,
          input['code'] as String,
        );
        return ok
            ? Response.json(body: {'verified': true})
            : apiError(
                HttpStatus.unprocessableEntity,
                'Invalid or expired code.',
              );
      }
      throw const FormatException('Invalid phone action.');
    } on GatewayException {
      rethrow;
    } finally {
      store.close();
    }
  },
);
