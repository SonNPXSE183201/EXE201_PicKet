import 'dart:async';
import 'dart:io';
import 'package:dart_frog/dart_frog.dart';
import 'package:http/http.dart' as http;
import 'package:picket_api/src/api_config.dart';
import 'package:picket_api/src/authenticated_route.dart';
import 'package:picket_api/src/supabase_gateway.dart';

/// Update policy for the in-app updater:
/// `GET /v1/releases/policy?channel=play|apk[&versionCode=N]`.
/// `play` reads the live Play production release, `apk` the live landing
/// release. `versionCode` is validated but the decision stays on the client.
Future<Response> onRequest(RequestContext context) async {
  if (context.request.method != HttpMethod.get) {
    return apiError(HttpStatus.methodNotAllowed, 'Method not allowed');
  }
  final query = context.request.uri.queryParameters;
  final channel = query['channel'];
  if (channel != 'play' && channel != 'apk') {
    return apiError(HttpStatus.badRequest, 'channel must be play or apk');
  }
  final versionCode = query['versionCode'];
  if (versionCode != null) {
    final parsed = RegExp(r'^\d{1,10}$').hasMatch(versionCode)
        ? int.parse(versionCode)
        : 0;
    if (parsed < 1 || parsed > 2100000000) {
      return apiError(HttpStatus.badRequest, 'versionCode is invalid');
    }
  }
  SupabaseGateway? gateway;
  try {
    gateway = SupabaseGateway(ApiConfig.fromEnvironment());
    final policy = await gateway.releasePolicy(channel!);
    return Response.json(
      body: {
        'channel': channel,
        'latestVersionCode': policy?['latestVersionCode'],
        'minSupportedVersionCode': policy?['minSupportedVersionCode'],
      },
      headers: {'cache-control': 'public, max-age=300'},
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
    gateway?.close();
  }
}
