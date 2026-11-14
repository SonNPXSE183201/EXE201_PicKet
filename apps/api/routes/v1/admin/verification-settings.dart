import 'dart:convert';
import 'package:dart_frog/dart_frog.dart';
import 'package:picket_api/src/authenticated_route.dart';

/// Sign-up verification channels (email OTP / SMS OTP). Permission
/// (auth.verification.manage), MFA, revision check and audit are enforced by
/// the database functions.
Future<Response> onRequest(RequestContext context) => handleAuthenticated(
  context,
  methods: {HttpMethod.get, HttpMethod.post},
  action: (gateway, token, request) async {
    if (request.method == HttpMethod.get) {
      return Response.json(
        body: await gateway.paymentRpc(
          token,
          'auth_verification_settings_get',
          {},
        ),
        headers: {'cache-control': 'no-store'},
      );
    }
    final input = jsonDecode(await readLimitedBody(request, 1024));
    if (input is! Map ||
        input.keys.any(
          (k) => !{
            'emailEnabled',
            'smsEnabled',
            'smsDailyLimit',
            'revision',
            'reason',
          }.contains(k),
        ) ||
        input['emailEnabled'] is! bool ||
        input['smsEnabled'] is! bool ||
        input['smsDailyLimit'] is! int ||
        input['revision'] is! int ||
        input['reason'] is! String) {
      throw const FormatException('Invalid verification settings.');
    }
    return Response.json(
      body: await gateway.paymentRpc(token, 'auth_verification_settings_save', {
        'p_email': input['emailEnabled'],
        'p_sms': input['smsEnabled'],
        'p_sms_daily_limit': input['smsDailyLimit'],
        'p_revision': input['revision'],
        'p_reason': input['reason'],
      }),
      headers: {'cache-control': 'no-store'},
    );
  },
);
