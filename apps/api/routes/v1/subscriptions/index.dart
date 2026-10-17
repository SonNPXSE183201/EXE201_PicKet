import 'dart:io';
import 'package:dart_frog/dart_frog.dart';
import 'package:picket_api/src/authenticated_route.dart';
import 'package:picket_api/src/resource_validation.dart';
import 'package:picket_api/src/subscription_contract.dart';

Future<Response> onRequest(RequestContext context) => handleAuthenticated(
  context,
  methods: {HttpMethod.get, HttpMethod.post},
  action: (gateway, token, request) async {
    if (request.method == HttpMethod.get) {
      final items = await gateway.listSubscriptions(token);
      return Response.json(
        body: {'subscriptions': items.map((item) => item.toJson()).toList()},
      );
    }
    final key = validateIdempotencyKey(request.headers['idempotency-key']);
    final item = await gateway.createSubscription(
      token,
      CreateSubscriptionRequest.fromJson(await request.json()),
      key,
    );
    return Response.json(
      statusCode: HttpStatus.created,
      body: {'subscription': item.toJson()},
    );
  },
);
