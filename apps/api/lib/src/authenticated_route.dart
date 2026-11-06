import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:dart_frog/dart_frog.dart';
import 'package:http/http.dart' as http;
import 'package:picket_api/src/api_config.dart';
import 'package:picket_api/src/supabase_gateway.dart';

typedef AuthenticatedAction =
    Future<Response> Function(
      SupabaseGateway gateway,
      String accessToken,
      Request request,
    );

Future<Response> handleAuthenticated(
  RequestContext context, {
  required Set<HttpMethod> methods,
  required AuthenticatedAction action,
  int maxContentLength = 65536,
}) async {
  final request = context.request;
  if (!methods.contains(request.method)) {
    return apiError(HttpStatus.methodNotAllowed, 'Method not allowed');
  }
  final accessToken = bearerToken(request.headers['authorization']);
  if (accessToken == null) {
    return apiError(HttpStatus.unauthorized, 'Unauthorized');
  }
  final contentLength = int.tryParse(request.headers['content-length'] ?? '');
  if (contentLength != null && contentLength > maxContentLength) {
    return apiError(HttpStatus.requestEntityTooLarge, 'Request too large');
  }

  SupabaseGateway? gateway;
  try {
    gateway = SupabaseGateway(ApiConfig.fromEnvironment());
    return await action(gateway, accessToken, request);
  } on ApiConfigException catch (error) {
    return apiError(HttpStatus.serviceUnavailable, error.message);
  } on FormatException catch (error) {
    return apiError(HttpStatus.badRequest, error.message);
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

String? bearerToken(String? header) {
  final match = RegExp(
    r'^Bearer\s+(.+)$',
    caseSensitive: false,
  ).firstMatch(header ?? '');
  return match?.group(1)?.trim();
}

Response apiError(int status, String message) =>
    Response.json(statusCode: status, body: {'error': message});

/// Bound actual streamed bytes, including requests without Content-Length.
Future<String> readLimitedBody(Request request, int maximumBytes) async {
  final bytes = <int>[];
  await for (final chunk in request.bytes().timeout(
    const Duration(seconds: 10),
  )) {
    if (bytes.length + chunk.length > maximumBytes) {
      throw const GatewayException(413, 'Request too large');
    }
    bytes.addAll(chunk);
  }
  return utf8.decode(bytes);
}
