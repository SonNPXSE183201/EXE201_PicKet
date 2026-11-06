import 'package:dart_frog/dart_frog.dart';
import 'package:picket_api/src/authenticated_route.dart';
import 'package:picket_api/src/resource_validation.dart';

Future<Response> onRequest(RequestContext context, String id) =>
    handleAuthenticated(
      context,
      methods: {HttpMethod.get},
      action: (gateway, token, request) async {
        final job = await gateway.getOcrFallbackJob(token, validateUuid(id));
        return Response.json(body: {'job': job.toJson()});
      },
    );
