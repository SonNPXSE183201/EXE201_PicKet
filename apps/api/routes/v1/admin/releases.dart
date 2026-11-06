import 'dart:convert';
import 'package:dart_frog/dart_frog.dart';
import 'package:picket_api/src/authenticated_route.dart';

/// Release registry (Play tracks, APKPure, landing). Play tracks are written
/// only by readback; permission, MFA, revision and audit are in the database.
Future<Response> onRequest(RequestContext context) => handleAuthenticated(
  context,
  methods: {HttpMethod.get, HttpMethod.post},
  action: (gateway, token, request) async {
    if (request.method == HttpMethod.get) {
      return Response.json(
        body: await gateway.paymentRpc(token, 'release_list', {}),
        headers: {'cache-control': 'no-store'},
      );
    }
    final input = jsonDecode(await readLimitedBody(request, 8192));
    if (input is! Map ||
        input['reason'] is! String ||
        input['release'] is! Map) {
      throw const FormatException('Invalid release.');
    }
    return Response.json(
      body: await gateway.paymentRpc(token, 'release_save', {
        'p_body': input['release'],
        'p_reason': input['reason'],
      }),
      headers: {'cache-control': 'no-store'},
    );
  },
);
