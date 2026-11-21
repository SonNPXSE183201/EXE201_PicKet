import 'dart:async';
import 'dart:io';
import 'package:dart_frog/dart_frog.dart';
import 'package:http/http.dart' as http;
import 'package:picket_api/src/admin_service.dart';
import 'package:picket_api/src/api_config.dart';
import 'package:picket_api/src/authenticated_route.dart';
import 'package:picket_api/src/supabase_gateway.dart';

/// End-of-month forecast settings for the app. With a bearer token the answer
/// says whether the caller's plan has the purchase scenario; without one
/// (local mode) the scenario is off. Falls back to defaults if the settings
/// cannot be read, so the forecast never disappears because of this call.
const fallbackForecastSettings = <String, Object>{
  'enabled': true,
  'minHistoryDays': 14,
  'lookbackMonths': 3,
  'scenario': false,
  'revision': 0,
};

Future<Response> onRequest(RequestContext context) async {
  if (context.request.method != HttpMethod.get) {
    return apiError(HttpStatus.methodNotAllowed, 'Method not allowed');
  }
  final token = bearerToken(context.request.headers['authorization']);
  Object? settings;
  SupabaseGateway? gateway;
  AdminService? store;
  try {
    final config = ApiConfig.fromEnvironment();
    if (token != null) {
      gateway = SupabaseGateway(config);
      settings = await gateway.paymentRpc(
        token,
        'forecast_settings_public',
        {},
      );
    } else {
      store = AdminService(config);
      settings = await store.authRpc('forecast_settings_public', {});
    }
  } on GatewayException catch (error) {
    if (error.statusCode == HttpStatus.unauthorized) {
      return apiError(error.statusCode, error.message);
    }
  } on ApiConfigException {
    // Defaults below.
  } on TimeoutException {
    // Defaults below.
  } on SocketException {
    // Defaults below.
  } on http.ClientException {
    // Defaults below.
  } finally {
    gateway?.close();
    store?.close();
  }
  final body = settings is Map && settings['enabled'] is bool
      ? settings
      : fallbackForecastSettings;
  return Response.json(
    body: body,
    headers: {
      'cache-control': token == null
          ? 'public, max-age=60'
          : 'private, max-age=60',
    },
  );
}
