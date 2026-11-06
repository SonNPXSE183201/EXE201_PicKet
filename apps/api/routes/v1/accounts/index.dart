import 'dart:io';

import 'package:dart_frog/dart_frog.dart';
import 'package:picket_api/src/account_contract.dart';
import 'package:picket_api/src/authenticated_route.dart';
import 'package:picket_api/src/resource_validation.dart';

Future<Response> onRequest(RequestContext context) => handleAuthenticated(
  context,
  methods: {HttpMethod.get, HttpMethod.post},
  action: (gateway, token, request) async {
    if (request.method == HttpMethod.get) {
      final accounts = await gateway.listAccounts(token);
      return Response.json(
        body: {
          'accounts': accounts.map((account) => account.toJson()).toList(),
        },
      );
    }
    final idempotencyKey = validateIdempotencyKey(
      request.headers['idempotency-key'],
    );
    final input = CreateAccountRequest.fromJson(await request.json());
    final account = await gateway.createAccount(token, input, idempotencyKey);
    return Response.json(
      statusCode: HttpStatus.created,
      body: {'account': account.toJson()},
    );
  },
);
