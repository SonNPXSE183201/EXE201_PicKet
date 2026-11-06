import 'dart:async';
import 'dart:convert';
import 'dart:io';
import 'package:dart_frog/dart_frog.dart';
import 'package:picket_api/src/admin_service.dart';
import 'package:picket_api/src/api_config.dart';
import 'package:picket_api/src/authenticated_route.dart';
import 'package:picket_api/src/supabase_gateway.dart';
import 'package:picket_api/src/telemetry_contract.dart';

DateTime _window = DateTime.now();
int _count = 0;
Future<Response> onRequest(RequestContext context) async {
  if (context.request.method != HttpMethod.post) {
    return apiError(405, 'Method not allowed');
  }
  if (Platform.environment['ADMIN_TELEMETRY_ENABLED'] != 'true') {
    return Response(statusCode: 204);
  }
  final now = DateTime.now();
  if (now.difference(_window).inMinutes >= 1) {
    _window = now;
    _count = 0;
  }
  if (++_count > 600) return apiError(429, 'Telemetry rate limit');
  final token = bearerToken(context.request.headers['authorization']);
  final config = ApiConfig.fromEnvironment();
  try {
    if (token == null &&
        context.request.headers['origin'] != 'https://picketfinance.com') {
      return apiError(403, 'Origin required');
    }
    final raw = await readLimitedBody(context.request, 1500);
    if (raw.length > 1500) return apiError(413, 'Request too large');
    final event = telemetryEvent(jsonDecode(raw), anonymous: token == null);
    if (token != null) {
      final gateway = SupabaseGateway(config);
      try {
        await gateway.collectEvent(token, event);
      } finally {
        gateway.close();
      }
    } else {
      final service = AdminService(config);
      try {
        await service.rpc('collect_app_event', {'p_event': event});
      } finally {
        service.close();
      }
    }
    return Response(statusCode: 204, headers: {'cache-control': 'no-store'});
  } on FormatException {
    return apiError(400, 'Invalid telemetry event.');
  } on GatewayException catch (e) {
    return apiError(e.statusCode, 'Telemetry unavailable');
  } on TimeoutException {
    return apiError(408, 'Request timed out');
  } on ApiConfigException {
    return apiError(503, 'Telemetry unavailable');
  }
}
