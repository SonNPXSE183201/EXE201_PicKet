import 'package:dart_frog/dart_frog.dart';
import 'package:picket_api/src/authenticated_route.dart';
import 'package:picket_api/src/learning_ai_consent.dart';

// Revocation must remain available even when new AI generation is disabled.
Future<Response> onRequest(RequestContext context) => handleAuthenticated(
  context,
  methods: {HttpMethod.get, HttpMethod.put},
  maxContentLength: 1024,
  action: (gateway, token, request) async {
    final accepted = request.method == HttpMethod.put
        ? parseLearningAiConsent(await request.json())
        : null;
    return Response.json(
      body: await gateway.learningAiConsent(token, accepted: accepted),
      headers: {'cache-control': 'private, no-store'},
    );
  },
);
