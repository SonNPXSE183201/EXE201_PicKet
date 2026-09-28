import 'dart:async';
import 'dart:io';

import 'package:dart_frog/dart_frog.dart';
import 'package:picket_api/src/api_config.dart';
import 'package:picket_api/src/finance_contract.dart';
import 'package:picket_api/src/supabase_gateway.dart';

Future<Response> onRequest(RequestContext context) async {
  final request = context.request;
  if (request.method != HttpMethod.get && request.method != HttpMethod.put) {
    return _error(HttpStatus.methodNotAllowed, 'Method not allowed');
  }
  final accessToken = _bearer(request.headers['authorization']);
  if (accessToken == null) {
    return _error(HttpStatus.unauthorized, 'Unauthorized');
  }

  SupabaseGateway? gateway;
  try {
    gateway = SupabaseGateway(ApiConfig.fromEnvironment());
    if (request.method == HttpMethod.get) {
      final snapshot = await gateway.loadSnapshot(accessToken);
      return Response.json(body: snapshot.toJson());
    }
    final contentLength = int.tryParse(
      request.headers['content-length'] ?? '',
    );
    if (contentLength != null && contentLength > 11000000) {
      return _error(HttpStatus.requestEntityTooLarge, 'Request too large');
    }
    final saveRequest = SaveSnapshotRequest.fromJson(await request.json());
    final revision = await gateway.saveSnapshot(accessToken, saveRequest);
    return Response.json(body: {'revision': revision});
  } on ApiConfigException catch (error) {
    return _error(HttpStatus.serviceUnavailable, error.message);
  } on FormatException catch (error) {
    return _error(HttpStatus.badRequest, error.message);
  } on GatewayException catch (error) {
    return _error(error.statusCode, error.message);
  } on TimeoutException {
    return _error(HttpStatus.gatewayTimeout, 'Upstream request timed out');
  } finally {
    gateway?.close();
  }
}

String? _bearer(String? header) {
  final match = RegExp(
    r'^Bearer\s+(.+)$',
    caseSensitive: false,
  ).firstMatch(header ?? '');
  return match?.group(1)?.trim();
}

Response _error(int status, String message) =>
    Response.json(statusCode: status, body: {'error': message});
