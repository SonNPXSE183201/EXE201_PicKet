import 'dart:async';
import 'dart:convert';
import 'dart:io';
import 'package:dart_frog/dart_frog.dart';
import 'package:http/http.dart' as http;
import 'package:picket_api/src/admin_service.dart';
import 'package:picket_api/src/api_config.dart';
import 'package:picket_api/src/authenticated_route.dart';
import 'package:picket_api/src/email_signup.dart';
import 'package:picket_api/src/supabase_gateway.dart';

/// Email sign-up pre-check: `{"action":"start","email":"..."}` before the app
/// asks Supabase to send the code. 409 when the address already has an
/// account (the app tells the user to sign in instead).
Future<Response> onRequest(RequestContext context) async {
  final request = context.request;
  if (request.method != HttpMethod.post) {
    return apiError(HttpStatus.methodNotAllowed, 'Method not allowed');
  }
  AdminService? store;
  try {
    final input = jsonDecode(await readLimitedBody(request, 1024));
    final email = input is Map ? normalizeSignupEmail(input['email']) : null;
    if (input is! Map ||
        input['action'] != 'start' ||
        input.length != 2 ||
        email == null) {
      return apiError(HttpStatus.badRequest, 'Invalid email address.');
    }
    store = AdminService(ApiConfig.fromEnvironment());
    final client =
        request.headers['x-forwarded-for']?.split(',').first.trim() ??
        request.connectionInfo.remoteAddress.address;
    final body = await EmailSignupService(
      store,
      Platform.environment,
    ).start(email, client);
    return Response.json(body: body, headers: {'cache-control': 'no-store'});
  } on FormatException {
    return apiError(HttpStatus.badRequest, 'Invalid email address.');
  } on ApiConfigException catch (error) {
    return apiError(HttpStatus.serviceUnavailable, error.message);
  } on GatewayException catch (error) {
    return apiError(error.statusCode, error.message);
  } on TimeoutException {
    return apiError(HttpStatus.gatewayTimeout, 'Upstream request timed out');
  } on SocketException {
    return apiError(HttpStatus.serviceUnavailable, 'Upstream unavailable');
  } on http.ClientException {
    return apiError(HttpStatus.serviceUnavailable, 'Upstream unavailable');
  } finally {
    store?.close();
  }
}
