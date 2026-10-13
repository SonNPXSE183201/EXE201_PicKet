import 'dart:io';

import 'package:dart_frog/dart_frog.dart';
import 'package:picket_api/src/authenticated_route.dart';
import 'package:picket_api/src/category_contract.dart';
import 'package:picket_api/src/resource_validation.dart';

Future<Response> onRequest(RequestContext context) => handleAuthenticated(
  context,
  methods: {HttpMethod.get, HttpMethod.post},
  action: (gateway, token, request) async {
    if (request.method == HttpMethod.get) {
      final categories = await gateway.listCategories(token);
      return Response.json(
        body: {
          'categories': categories
              .map((category) => category.toJson())
              .toList(),
        },
      );
    }
    final idempotencyKey = validateIdempotencyKey(
      request.headers['idempotency-key'],
    );
    final input = CreateCategoryRequest.fromJson(await request.json());
    final category = await gateway.createCategory(token, input, idempotencyKey);
    return Response.json(
      statusCode: HttpStatus.created,
      body: {'category': category.toJson()},
    );
  },
);
