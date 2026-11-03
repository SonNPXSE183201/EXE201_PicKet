import 'dart:async';
import 'dart:convert';
import 'package:dart_frog/dart_frog.dart';
import 'package:picket_api/src/authenticated_route.dart';
import 'package:picket_api/src/quick_login_service.dart';
import 'package:picket_api/src/supabase_gateway.dart';

Future<Response> onRequest(RequestContext context) async {
  if (context.request.method != HttpMethod.post) {
    return apiError(405, 'Method not allowed');
  }
  try {
    final input = jsonDecode(await readLimitedBody(context.request, 16384));
    if (input is! Map<String, dynamic>) {
      throw const FormatException('Invalid quick login request.');
    }
    final service = QuickLoginService();
    Map<String, dynamic> result;
    if (input['action'] == 'save' &&
        input['pin'] is String &&
        input['refreshToken'] is String) {
      final token = bearerToken(context.request.headers['authorization']);
      if (token == null) return apiError(401, 'Unauthorized');
      result = await service.save(
        token,
        input['refreshToken'] as String,
        input['pin'] as String,
      );
    } else if (input['action'] == 'lock' &&
        input['deviceToken'] is String &&
        input['refreshToken'] is String &&
        (input['deviceToken'] as String).length == 44) {
      final token = bearerToken(context.request.headers['authorization']);
      if (token == null) return apiError(401, 'Unauthorized');
      result = await service.lock(
        token,
        input['deviceToken'] as String,
        input['refreshToken'] as String,
      );
    } else if (input['action'] == 'unlock' &&
        input['deviceToken'] is String &&
        input['pin'] is String &&
        (input['deviceToken'] as String).length == 44) {
      result = await service.unlock(
        input['deviceToken'] as String,
        input['pin'] as String,
      );
    } else if (input['action'] == 'revoke' &&
        input['deviceToken'] is String &&
        (input['deviceToken'] as String).length == 44) {
      await service.revoke(input['deviceToken'] as String);
      result = {'revoked': true};
    } else {
      throw const FormatException('Invalid quick login request.');
    }
    return Response.json(body: result, headers: {'cache-control': 'no-store'});
  } on FormatException {
    return apiError(400, 'Invalid quick login request.');
  } on GatewayException catch (e) {
    return apiError(e.statusCode, e.message);
  } on TimeoutException {
    return apiError(503, 'Quick login unavailable.');
  }
}
