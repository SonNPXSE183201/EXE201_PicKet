import 'dart:async';
import 'dart:io';
import 'package:dart_frog/dart_frog.dart';
import 'package:http/http.dart' as http;
import 'package:picket_api/src/api_config.dart';
import 'package:picket_api/src/authenticated_route.dart';
import 'package:picket_api/src/supabase_gateway.dart';

/// Announcements for app and web clients: promotions, incidents, maintenance.
/// Works without a session so guests and locked accounts still see notices.
Future<Response> onRequest(RequestContext context) async {
  final request = context.request;
  if (request.method != HttpMethod.get) {
    return apiError(HttpStatus.methodNotAllowed, 'Method not allowed');
  }
  final q = request.uri.queryParameters;
  final channel = q['channel'];
  final version = q['versionCode'] == null
      ? null
      : int.tryParse(q['versionCode']!);
  final locale = q['locale'] ?? 'vi';
  if (!{'play', 'apk', 'web'}.contains(channel) ||
      (q['versionCode'] != null && (version == null || version <= 0)) ||
      !RegExp(r'^[a-z]{2}(-[A-Za-z]{2})?$').hasMatch(locale)) {
    return apiError(HttpStatus.badRequest, 'Invalid announcement query.');
  }
  final token = bearerToken(request.headers['authorization']);
  SupabaseGateway? gateway;
  try {
    gateway = SupabaseGateway(ApiConfig.fromEnvironment());
    final feed = await gateway.announcementsFeed(token, {
      'p_channel': channel,
      'p_version_code': version,
      'p_locale': locale,
    });
    return Response.json(
      body: feed,
      headers: {
        'cache-control': token == null
            ? 'public, max-age=60'
            : 'private, max-age=30',
      },
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
