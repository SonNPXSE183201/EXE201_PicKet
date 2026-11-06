import 'dart:io';

import 'package:dart_frog/dart_frog.dart';
import 'package:picket_api/src/authenticated_route.dart';
import 'package:picket_api/src/transaction_contract.dart';

Future<Response> onRequest(RequestContext context) => handleAuthenticated(
  context,
  methods: {HttpMethod.post},
  action: (gateway, token, request) async {
    final idempotencyKey = validateIdempotencyKey(
      request.headers['idempotency-key'],
    );
    final input = CreateTransferRequest.fromJson(await request.json());
    final transaction = await gateway.createTransfer(
      token,
      input,
      idempotencyKey,
    );
    return Response.json(
      statusCode: HttpStatus.created,
      body: {'transaction': transaction.toJson()},
    );
  },
);
