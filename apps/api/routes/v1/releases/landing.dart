import 'dart:async';
import 'dart:io';
import 'package:dart_frog/dart_frog.dart';
import 'package:http/http.dart' as http;
import 'package:picket_api/src/api_config.dart';
import 'package:picket_api/src/authenticated_route.dart';
import 'package:picket_api/src/supabase_gateway.dart';

/// release.json for the landing page, generated from the release registry.
Future<Response> onRequest(RequestContext context) async {
  if (context.request.method != HttpMethod.get) {
    return apiError(HttpStatus.methodNotAllowed, 'Method not allowed');
  }
  SupabaseGateway? gateway;
  try {
    gateway = SupabaseGateway(ApiConfig.fromEnvironment());
    final release = await gateway.landingRelease();
    if (release == null) return apiError(404, 'No live landing release.');
    return Response.json(
      body: release,
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
