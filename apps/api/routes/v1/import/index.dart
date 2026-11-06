import 'dart:convert';

import 'package:dart_frog/dart_frog.dart';
import 'package:picket_api/src/authenticated_route.dart';
import 'package:picket_api/src/import_contract.dart';

Future<Response> onRequest(RequestContext context) => handleAuthenticated(
  context,
  methods: {HttpMethod.post, HttpMethod.put},
  maxContentLength: 11000000,
  action: (gateway, token, request) async {
    final raw = await request.body();
    if (utf8.encode(raw).length > 11000000) {
      return apiError(413, 'Request too large');
    }
    final json = jsonDecode(raw);
    if (request.method == HttpMethod.post) {
      final export = FinanceImportEnvelope.fromJson(json);
      return Response.json(body: export.summary.toJson());
    }
    final restore = RestoreFinanceRequest.fromJson(json);
    final revision = await gateway.saveSnapshot(token, restore.snapshot);
    return Response.json(body: {'restored': true, 'revision': revision});
  },
);
