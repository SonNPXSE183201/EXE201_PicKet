import 'dart:async';
import 'dart:convert';
import 'package:dart_frog/dart_frog.dart';
import 'package:picket_api/src/authenticated_route.dart';
import 'package:picket_api/src/payos_service.dart';
import 'package:picket_api/src/supabase_gateway.dart';

Future<Response> onRequest(RequestContext context) async {
  if (context.request.method != HttpMethod.post) {
    return apiError(405, 'Method not allowed');
  }
  try {
    final input = jsonDecode(await readLimitedBody(context.request, 32768));
    if (input is! Map<String, dynamic>) {
      return apiError(400, 'Invalid payment event.');
    }
    await PayosService().webhook(input);
    return Response.json(body: {'success': true});
  } on FormatException {
    return apiError(400, 'Invalid payment event.');
  } on GatewayException catch (e) {
    return apiError(e.statusCode, e.message);
  } on TimeoutException {
    return apiError(503, 'Payment persistence unavailable.');
  }
}
