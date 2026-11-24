import 'dart:async';
import 'dart:io';
import 'package:dart_frog/dart_frog.dart';
import 'package:http/http.dart' as http;
import 'package:picket_api/src/admin_service.dart';
import 'package:picket_api/src/api_config.dart';
import 'package:picket_api/src/authenticated_route.dart';
import 'package:picket_api/src/supabase_gateway.dart';

/// End-of-month forecast settings for the app. The forecast is a paid benefit:
/// `allowed` says whether this caller (signed in, on an access plan) may see it
/// and `scenario` whether their plan has the purchase scenario. Without a token
/// (local mode) both are false. If the settings cannot be read the answer keeps
/// the forecast locked rather than giving it away.
Map<String, Object> fallbackForecastSettings({required bool signedIn}) => {
  'enabled': true,
  'minHistoryDays': 14,
  'lookbackMonths': 3,
  'signedIn': signedIn,
  'allowed': false,
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
      : fallbackForecastSettings(signedIn: token != null);
  return Response.json(
    body: body,
    headers: {
      'cache-control': token == null
          ? 'public, max-age=60'
          : 'private, max-age=60',
    },
  );
}
