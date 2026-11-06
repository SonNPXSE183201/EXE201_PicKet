import 'dart:io';
import 'package:dart_frog/dart_frog.dart';
import 'package:picket_api/src/authenticated_route.dart';
import 'package:picket_api/src/otp/otp_service.dart';

/// Which OTP channels the apps should offer. Email OTP is always delivered by
/// Supabase Auth; SMS appears once OTP_CHANNELS and a provider are configured.
Future<Response> onRequest(RequestContext context) async {
  if (context.request.method != HttpMethod.get) {
    return apiError(HttpStatus.methodNotAllowed, 'Method not allowed');
  }
  return Response.json(
    body: OtpChannels(Platform.environment).describe(),
    headers: {'cache-control': 'public, max-age=300'},
  );
}
