import 'dart:convert';
import 'package:dart_frog/dart_frog.dart';
import 'package:picket_api/src/authenticated_route.dart';

Future<Response> onRequest(RequestContext context) => handleAuthenticated(
  context,
  methods: {HttpMethod.get, HttpMethod.post},
  action: (gateway, token, request) async {
    if (request.method == HttpMethod.get) {
      return Response.json(
        body: await gateway.paymentRpc(token, 'permission_list', {
          'p_user': request.uri.queryParameters['userId'],
        }),
        headers: {'cache-control': 'no-store'},
      );
    }
    final input = jsonDecode(await readLimitedBody(request, 8192));
    if (input is! Map<String, dynamic> ||
        input['userId'] is! String ||
        input['permission'] is! String ||
        input['allowed'] is! bool ||
        input['revision'] is! int ||
        input['reason'] is! String ||
        input.keys.any(
          (k) => !{
            'userId',
            'permission',
            'allowed',
            'expiresAt',
            'revision',
            'reason',
          }.contains(k),
        )) {
      throw const FormatException('Invalid permission update.');
    }
    return Response.json(
      body: await gateway.paymentRpc(token, 'permission_update', {
        'p_user': input['userId'],
        'p_permission': input['permission'],
        'p_allowed': input['allowed'],
        'p_expires': input['expiresAt'],
        'p_revision': input['revision'],
        'p_reason': input['reason'],
      }),
      headers: {'cache-control': 'no-store'},
    );
  },
);
