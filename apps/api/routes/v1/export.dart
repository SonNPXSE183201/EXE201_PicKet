import 'package:dart_frog/dart_frog.dart';
import 'package:picket_api/src/authenticated_route.dart';
import 'package:picket_api/src/export_contract.dart';

Future<Response> onRequest(RequestContext context) => handleAuthenticated(
  context,
  methods: {HttpMethod.get},
  action: (gateway, token, request) async {
    final snapshot = await gateway.loadSnapshot(token);
    final export = FinanceExportEnvelope.fromSnapshot(snapshot);
    return Response.json(
      headers: {
        'Cache-Control': 'no-store, private',
        'Content-Disposition': 'attachment; filename="picket-export.json"',
      },
      body: export.toJson(),
    );
  },
);
