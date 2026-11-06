import 'dart:convert';
import 'package:dart_frog/dart_frog.dart';
import 'package:picket_api/src/authenticated_route.dart';

/// Admin announcements. Permission (announcements.manage), MFA, revision and
/// audit are enforced in the database.
Future<Response> onRequest(RequestContext context) => handleAuthenticated(
  context,
  methods: {HttpMethod.get, HttpMethod.post},
  action: (gateway, token, request) async {
    if (request.method == HttpMethod.get) {
      return Response.json(
        body: await gateway.paymentRpc(token, 'announcement_list', {}),
        headers: {'cache-control': 'no-store'},
      );
    }
    final input = jsonDecode(await readLimitedBody(request, 8192));
    if (input is! Map ||
        input['reason'] is! String ||
        input['announcement'] is! Map) {
      throw const FormatException('Invalid announcement.');
    }
    return Response.json(
      body: await gateway.paymentRpc(token, 'announcement_save', {
        'p_body': input['announcement'],
        'p_reason': input['reason'],
      }),
      headers: {'cache-control': 'no-store'},
    );
  },
);
