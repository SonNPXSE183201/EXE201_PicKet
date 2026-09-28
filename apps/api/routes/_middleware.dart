import 'package:dart_frog/dart_frog.dart';
import 'package:picket_api/src/api_config.dart';

Handler middleware(Handler handler) {
  final cors = CorsConfig.fromEnvironment();
  return handler
      .use(requestLogger())
      .use(
        (innerHandler) => (context) async {
          final origin = context.request.headers['origin'];
          final allowedOrigin = cors.allowOrigin(origin);
          final headers = <String, String>{
            'access-control-allow-methods': 'GET,PUT,OPTIONS',
            'access-control-allow-headers': 'authorization,content-type',
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
