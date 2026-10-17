import 'package:dart_frog/dart_frog.dart';
import 'package:picket_api/src/authenticated_route.dart';

Future<Response> onRequest(RequestContext context) => handleAuthenticated(
  context,
  methods: {HttpMethod.post},
  action: (gateway, token, request) async {
    final body = await request.json();
    if (body is! Map ||
        body.keys.any((key) => !{'month', 'rollover', 'note'}.contains(key)) ||
        body['month'] is! String ||
        !RegExp(r'^\d{4}-(0[1-9]|1[0-2])$').hasMatch(body['month'] as String) ||
        body['rollover'] is! bool ||
        body['note'] is! String ||
        (body['note'] as String).length > 1000) {
      throw const FormatException('Invalid month close.');
    }
    final result = await gateway.closeBudgetMonth(token, {
      'p_month': '${body['month']}-01',
      'p_rollover': body['rollover'],
      'p_note': body['note'],
    });
    return Response.json(body: result);
  },
);
