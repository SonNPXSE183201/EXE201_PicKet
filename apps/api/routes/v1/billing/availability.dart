import 'dart:io';
import 'package:dart_frog/dart_frog.dart';
import 'package:picket_api/src/authenticated_route.dart';

Future<Response> onRequest(RequestContext context) => handleAuthenticated(
  context,
  methods: {HttpMethod.get},
  action: (gateway, token, request) async {
    await gateway.authenticate(token);
    return Response.json(
      headers: {'cache-control': 'private, no-store'},
      body: {
        'newPurchasesEnabled':
            Platform.environment['GOOGLE_PLAY_BILLING_ENABLED'] == 'true',
      },
    );
  },
);
