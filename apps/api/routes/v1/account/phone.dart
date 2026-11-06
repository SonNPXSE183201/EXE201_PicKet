import 'dart:convert';
import 'dart:io';
import 'package:dart_frog/dart_frog.dart';
import 'package:picket_api/src/admin_service.dart';
import 'package:picket_api/src/authenticated_route.dart';
import 'package:picket_api/src/otp/otp_service.dart';
import 'package:picket_api/src/supabase_gateway.dart';

final _phone = RegExp(r'^\+[1-9][0-9]{7,14}$');

/// Attach a phone to the signed-in account and, once SMS is configured,
/// verify ownership with a code:
/// - `{"phone": "+849..."}` attaches (unverified)
/// - `{"phone": ..., "action": "send"}` sends an SMS code
/// - `{"phone": ..., "action": "verify", "challengeId": ..., "code": "123456"}`
Future<Response> onRequest(RequestContext context) => handleAuthenticated(
  context,
  methods: {HttpMethod.post},
  action: (gateway, token, request) async {
    final input = jsonDecode(await readLimitedBody(request, 1024));
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
