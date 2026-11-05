import 'dart:async';
import 'dart:io';

import 'package:dart_frog/dart_frog.dart';
import 'package:http/http.dart' as http;
import 'package:picket_api/src/admin_service.dart';
import 'package:picket_api/src/api_config.dart';
import 'package:picket_api/src/authenticated_route.dart';
import 'package:picket_api/src/supabase_gateway.dart';

// Verify active/unlocked account access before consumer business routes.
// Administrative capabilities do not remove personal application access.
Handler middleware(Handler handler) => (context) async {
  final path = context.request.uri.path;
  if (path.startsWith('/v1/admin/') ||
      path == '/v1/billing/payos/reconcile' ||
      path == '/v1/account/access' ||
      path == '/v1/announcements' ||
      path == '/v1/telemetry') {
    return handler(context);
  }
  final token = bearerToken(context.request.headers['authorization']);
  if (token == null) return handler(context);
  final gateway = SupabaseGateway(ApiConfig.fromEnvironment());
  try {
    final access = await gateway.accountAccess(token);
    if (access['mobileAllowed'] != true) {
      return apiError(403, 'Application access is not allowed.');
    }
    final response = await handler(context);
    final metric = response.statusCode == 429 && path.startsWith('/v1/ocr')
        ? 'ocr_quota_denied'
        : response.statusCode == 409
        ? 'sync_conflict'
        : response.statusCode >= 500
        ? 'http_error'
        : null;
    if (metric != null) {
      final service = AdminService(gateway.config);
      try {
        await service.rpc('admin_record_diagnostic', {'p_metric': metric});
      } on Object {
        /* Observability must not replace the original response. */
      } finally {
        service.close();
      }
    }
    return response;
  } on GatewayException catch (error) {
    return apiError(error.statusCode, error.message);
  } on TimeoutException {
    return apiError(504, 'Access verification timed out');
  } on SocketException {
    return apiError(503, 'Access verification unavailable');
  } on http.ClientException {
    return apiError(503, 'Access verification unavailable');
  } finally {
    gateway.close();
  }
};
