import 'dart:io';
import 'package:dart_frog/dart_frog.dart';
import 'package:picket_api/src/authenticated_route.dart';
import 'package:picket_api/src/learning_ai_jobs.dart';

Future<Response> onRequest(RequestContext context) => handleAuthenticated(
  context,
  methods: {HttpMethod.post, HttpMethod.delete},
  maxContentLength: 1024,
  action: (gateway, token, request) async {
    if (request.method == HttpMethod.delete) {
      await gateway.deleteLearningAiHistory(token);
      return Response(
        statusCode: HttpStatus.noContent,
        headers: {'cache-control': 'private, no-store'},
      );
    }
    if (!learningAiEnabled()) {
      return apiError(
        HttpStatus.serviceUnavailable,
        'Educational generation is disabled.',
      );
    }
    final input = LearningAiRequest.fromJson(await request.json());
    final result = await gateway.enqueueLearningAi(
      token,
      input,
      request.headers['idempotency-key'] ?? '',
    );
    return Response.json(
      statusCode: HttpStatus.accepted,
      body: result,
      headers: {
        'cache-control': 'private, no-store',
        'location': '/v1/learning-ai/jobs/${result['id']}',
      },
    );
  },
);
