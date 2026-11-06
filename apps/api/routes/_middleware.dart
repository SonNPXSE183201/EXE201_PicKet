import 'dart:convert';
import 'dart:io';

import 'package:dart_frog/dart_frog.dart';
import 'package:picket_api/src/api_config.dart';

Handler middleware(Handler handler) {
  // Validate all required public runtime configuration before serving health.
  // A deployment with a missing/unsafe environment must fail to start instead
  // of appearing healthy until the first authenticated request.
  ApiConfig.fromEnvironment();
  final cors = CorsConfig.fromEnvironment();
  return handler
      .use(
        (inner) => (context) async {
          final watch = Stopwatch()..start();
          final response = await inner(context);
          final route = context.request.uri.path.replaceAll(
            RegExp('[0-9a-fA-F]{8}-[0-9a-fA-F-]{27,}'),
            ':id',
          );
          // Search queries may contain emails. Never log query strings,
          // request bodies, headers, credentials or account identifiers.
          stdout.writeln(
            jsonEncode({
              'method': context.request.method.name,
              'route': route,
              'status': response.statusCode,
              'durationMs': watch.elapsedMilliseconds,
            }),
          );
          return response;
        },
      )
      .use(
        (innerHandler) => (context) async {
          final origin = context.request.headers['origin'];
          final allowedOrigin = cors.allowOrigin(origin);
          final headers = <String, String>{
            'access-control-allow-methods': 'GET,POST,PATCH,PUT,DELETE,OPTIONS',
            'access-control-allow-headers':
                'authorization,content-type,idempotency-key',
            'access-control-max-age': '600',
            'x-content-type-options': 'nosniff',
            'vary': 'Origin',
            if (allowedOrigin != null)
              'access-control-allow-origin': allowedOrigin,
          };
          if (context.request.method == HttpMethod.options) {
            return Response(statusCode: 204, headers: headers);
          }
          final response = await innerHandler(context);
          return response.copyWith(headers: {...response.headers, ...headers});
        },
      );
}
