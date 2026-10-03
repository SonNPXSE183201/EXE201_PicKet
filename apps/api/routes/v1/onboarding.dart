import 'dart:io';

import 'package:dart_frog/dart_frog.dart';
import 'package:picket_api/src/authenticated_route.dart';
import 'package:picket_api/src/profile_contract.dart';

Future<Response> onRequest(RequestContext context) => handleAuthenticated(
  context,
  methods: {HttpMethod.post},
  action: (gateway, token, request) async {
    final input = CompleteOnboardingRequest.fromJson(await request.json());
    final walletId = await gateway.completeOnboarding(token, input);
    return Response.json(
      statusCode: HttpStatus.created,
      body: {'walletId': walletId},
    );
  },
);
