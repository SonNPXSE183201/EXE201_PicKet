import 'dart:async';
import 'dart:convert';
import 'dart:io';
import 'package:dart_frog/dart_frog.dart';
import 'package:http/http.dart' as http;
import 'package:picket_api/src/admin_service.dart';
import 'package:picket_api/src/api_config.dart';
import 'package:picket_api/src/authenticated_route.dart';
import 'package:picket_api/src/firebase/firebase_config.dart';
import 'package:picket_api/src/phone_signup.dart';
import 'package:picket_api/src/supabase_gateway.dart';

final _phone = RegExp(r'^\+[1-9][0-9]{7,14}$');

/// SMS sign-up (Firebase Phone Auth):
/// - `{"action":"start","phone":"+849..."}` before Firebase sends the code
/// - `{"action":"complete","phone":...,"idToken":...,"password":...}` after
///   the 6-digit code was confirmed and the user chose a password.
/// - `{"action":"reset-start","phone":...}` then
///   `{"action":"reset","phone":...,"idToken":...,"password":...}`: password
///   recovery for an account whose phone is verified.
Future<Response> onRequest(RequestContext context) async {
  final request = context.request;
  if (request.method != HttpMethod.post) {
    return apiError(HttpStatus.methodNotAllowed, 'Method not allowed');
  }
  AdminService? store;
  PhoneSignupService? service;
  try {
    final input = jsonDecode(await readLimitedBody(request, 8192));
    if (input is! Map ||
        input['phone'] is! String ||
        !_phone.hasMatch(input['phone'] as String)) {
      return apiError(HttpStatus.badRequest, 'Invalid phone number.');
    }
    final config = ApiConfig.fromEnvironment();
    store = AdminService(config);
    service = PhoneSignupService(
      config,
      store,
      Platform.environment,
      verifier: firebasePhoneVerifier(Platform.environment),
    );
    final client =
        request.headers['x-forwarded-for']?.split(',').first.trim() ??
        request.connectionInfo.remoteAddress.address;
    final phone = input['phone'] as String;
    final Map<String, Object?> body;
    if (input['action'] == 'start' && input.length == 2) {
      body = await service.start(phone, client);
    } else if (input['action'] == 'reset-start' && input.length == 2) {
      body = await service.start(phone, client, purpose: 'reset');
    } else if (input['action'] == 'reset' &&
        input['idToken'] is String &&
        input['password'] is String &&
        input.length == 4) {
      body = await service.reset(
        phone: phone,
        idToken: input['idToken'] as String,
        password: input['password'] as String,
        client: client,
      );
    } else if (input['action'] == 'complete' &&
        input['idToken'] is String &&
        input['password'] is String &&
        input.length == 4) {
      body = await service.complete(
        phone: phone,
        idToken: input['idToken'] as String,
        password: input['password'] as String,
        client: client,
      );
    } else {
      return apiError(HttpStatus.badRequest, 'Invalid sign-up request.');
    }
    return Response.json(body: body, headers: {'cache-control': 'no-store'});
  } on FormatException catch (error) {
    return apiError(
      HttpStatus.badRequest,
      error.message == 'Weak password.'
          ? 'Weak password.'
          : 'Invalid sign-up request.',
    );
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
    service?.close();
    store?.close();
  }
}
