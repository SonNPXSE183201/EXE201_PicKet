import 'dart:convert';
import 'package:dart_frog/dart_frog.dart';
import 'package:picket_api/src/authenticated_route.dart';
import 'package:picket_api/src/resource_validation.dart';

Future<Response> onRequest(RequestContext context) => handleAuthenticated(
  context,
  methods: {HttpMethod.get, HttpMethod.post},
  maxContentLength: 3000,
  action: (gateway, token, request) async {
    var body = <String, dynamic>{};
    if (request.method == HttpMethod.get) {
      final id = request.uri.queryParameters['id'];
      if (id != null) body['p_id'] = validateUuid(id);
    } else {
      final raw = await readLimitedBody(request, 3000);
      if (raw.length > 3000) return apiError(413, 'Request too large');
      final input = jsonDecode(raw);
      if (input is! Map) throw const FormatException('Invalid export request');
      body = {
        'p_section': input['section'],
        'p_filters': input['filters'] ?? <String, dynamic>{},
        'p_reason': input['reason'],
        'p_request_id': input['requestId'],
      };
    }
    return Response.json(
      body: await gateway.adminRpc(token, 'admin_exports', body),
      headers: {'cache-control': 'no-store'},
    );
  },
);
