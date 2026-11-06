import 'dart:async';
import 'dart:convert';
import 'dart:io';
import 'package:dart_frog/dart_frog.dart';
import 'package:http/http.dart' as http;
import 'package:picket_api/src/admin_service.dart';
import 'package:picket_api/src/api_config.dart';
import 'package:picket_api/src/authenticated_route.dart';
import 'package:picket_api/src/phone_login.dart';
import 'package:picket_api/src/supabase_gateway.dart';

final _phone = RegExp(r'^\+[1-9][0-9]{7,14}$');

/// Phone number + password sign-in for accounts that attached a phone.
Future<Response> onRequest(RequestContext context) async {
  final request = context.request;
  if (request.method != HttpMethod.post) {
    return apiError(HttpStatus.methodNotAllowed, 'Method not allowed');
  }
  AdminService? store;
  PhoneLoginService? service;
  try {
    final input = jsonDecode(await readLimitedBody(request, 1024));
    if (input is! Map ||
        input['phone'] is! String ||
        input['password'] is! String ||
        !_phone.hasMatch(input['phone'] as String) ||
        (input['password'] as String).isEmpty ||
        (input['password'] as String).length > 200) {
      return apiError(HttpStatus.badRequest, 'Invalid sign-in request.');
    }
    final config = ApiConfig.fromEnvironment();
    store = AdminService(config);
    service = PhoneLoginService(config, store, Platform.environment);
    final forwarded = request.headers['x-forwarded-for']
        ?.split(',')
        .first
        .trim();
    final session = await service.login(
      input['phone'] as String,
      input['password'] as String,
      forwarded ?? request.connectionInfo.remoteAddress.address,
    );
    return Response.json(body: session, headers: {'cache-control': 'no-store'});
  } on FormatException {
    return apiError(HttpStatus.badRequest, 'Invalid sign-in request.');
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
