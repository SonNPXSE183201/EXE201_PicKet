import 'package:dart_frog/dart_frog.dart';
import 'package:picket_api/src/authenticated_route.dart';
import 'package:picket_api/src/learning_contract.dart';
import 'package:picket_api/src/resource_validation.dart';

Future<Response> onRequest(RequestContext context) => handleAuthenticated(
  context,
  methods: {HttpMethod.post},
  maxContentLength: 4096,
  action: (gateway, token, request) async {
    final key = validateIdempotencyKey(request.headers['idempotency-key']);
    final result = await gateway.submitLearningAttempt(
      token,
      LearningAttemptRequest.fromJson(await request.json()),
      key,
    );
    return Response.json(
      body: result.toJson(),
      headers: {'cache-control': 'private, no-store'},
    );
  },
);
