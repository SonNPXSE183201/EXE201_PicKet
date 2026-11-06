import 'package:dart_frog/dart_frog.dart';
import 'package:picket_api/src/authenticated_route.dart';

Future<Response> onRequest(RequestContext context) => handleAuthenticated(
  context,
  methods: {HttpMethod.get},
  action: (gateway, token, request) async {
    final entitlements = await gateway.currentEntitlements(token);
    return Response.json(body: entitlements.toJson());
  },
);
