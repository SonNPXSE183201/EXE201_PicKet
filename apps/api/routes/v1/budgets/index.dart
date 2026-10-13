import 'dart:io';
import 'package:dart_frog/dart_frog.dart';
import 'package:picket_api/src/authenticated_route.dart';
import 'package:picket_api/src/budget_contract.dart';
import 'package:picket_api/src/resource_validation.dart';

Future<Response> onRequest(RequestContext context) => handleAuthenticated(
  context,
  methods: {HttpMethod.get, HttpMethod.post},
  action: (gateway, token, request) async {
    if (request.method == HttpMethod.get) {
      final budgets = await gateway.listBudgets(token);
      return Response.json(
        body: {'budgets': budgets.map((item) => item.toJson()).toList()},
      );
    }
    final idempotencyKey = validateIdempotencyKey(
      request.headers['idempotency-key'],
    );
    final budget = await gateway.createBudget(
      token,
      CreateBudgetRequest.fromJson(await request.json()),
      idempotencyKey,
    );
    return Response.json(
      statusCode: HttpStatus.created,
      body: {'budget': budget.toJson()},
    );
  },
);
