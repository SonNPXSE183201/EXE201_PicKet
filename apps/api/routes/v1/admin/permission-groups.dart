import 'dart:convert';
import 'package:dart_frog/dart_frog.dart';
import 'package:picket_api/src/authenticated_route.dart';

Future<Response> onRequest(RequestContext context) => handleAuthenticated(
  context,
  methods: {HttpMethod.post},
  action: (gateway, token, request) async {
    final input = jsonDecode(await readLimitedBody(request, 16384));
    if (input is! Map<String, dynamic> ||
        input['body'] is! Map<String, dynamic> ||
        input['reason'] is! String) {
      throw const FormatException('Invalid group change.');
    }
    return Response.json(
      body: await gateway.paymentRpc(token, 'permission_group_update', {
        'p_body': input['body'],
        'p_reason': input['reason'],
      }),
      headers: {'cache-control': 'no-store'},
    );
  },
);
