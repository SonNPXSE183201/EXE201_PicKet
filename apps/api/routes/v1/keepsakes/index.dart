import 'dart:io';

import 'package:dart_frog/dart_frog.dart';
import 'package:picket_api/src/authenticated_route.dart';

Future<Response> onRequest(RequestContext context) => handleAuthenticated(
  context,
  methods: {HttpMethod.get, HttpMethod.post},
  action: (gateway, token, request) async {
    if (request.method == HttpMethod.get) {
      final items = await gateway.listKeepsakes(token);
      return Response.json(
        body: {'keepsakes': items.map((item) => item.toJson()).toList()},
      );
    }
    final item = await gateway.createKeepsake(token, await request.json());
    return Response.json(
      statusCode: HttpStatus.created,
      body: {'keepsake': item.toJson()},
    );
  },
);
