import 'package:dart_frog/dart_frog.dart';
import 'package:picket_api/src/authenticated_route.dart';

Future<Response> onRequest(RequestContext context, String id) =>
    handleAuthenticated(
      context,
      methods: {HttpMethod.get},
      action: (gateway, token, request) async => Response.json(
        body: await gateway.learningAiJob(token, id),
        headers: {'cache-control': 'private, no-store'},
      ),
    );
