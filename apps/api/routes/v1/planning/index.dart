import 'package:dart_frog/dart_frog.dart';
import 'package:picket_api/src/authenticated_route.dart';

const methods = {
  'simple',
  'envelope',
  'zero_based',
  'fifty_thirty_twenty',
  'event',
};
String validateMonth(Object? value) {
  if (value is! String || !RegExp(r'^\d{4}-(0[1-9]|1[0-2])$').hasMatch(value)) {
    throw const FormatException('Invalid month.');
  }
  return value;
}

Future<Response> onRequest(RequestContext context) => handleAuthenticated(
  context,
  methods: {HttpMethod.get, HttpMethod.patch},
  action: (gateway, token, request) async {
    if (request.method == HttpMethod.get) {
      final month = validateMonth(request.uri.queryParameters['month']);
      return Response.json(body: await gateway.getPlanning(token, month));
    }
    final body = await request.json();
    if (body is! Map || body.length != 1 || !methods.contains(body['method'])) {
      throw const FormatException('Invalid budget method.');
    }
    await gateway.setBudgetMethod(token, body['method'] as String);
    return Response.json(
      body: {'method': body['method'], 'periods': <Object>[], 'close': null},
    );
  },
);
