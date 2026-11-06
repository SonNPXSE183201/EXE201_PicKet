import 'package:dart_frog/dart_frog.dart';
import 'package:picket_api/src/authenticated_route.dart';
import 'package:picket_api/src/learning_activity.dart';

Future<Response> onRequest(RequestContext context) => handleAuthenticated(
  context,
  methods: {HttpMethod.get, HttpMethod.put},
  maxContentLength: 32768,
  action: (gateway, token, request) async => Response.json(
    body: await gateway.learningActivity(
      token,
      events: request.method == HttpMethod.put
          ? validateLearningActivityRequest(await request.json())
          : null,
    ),
    headers: {'cache-control': 'private, no-store'},
  ),
);
