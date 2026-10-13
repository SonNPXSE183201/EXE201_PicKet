import 'dart:io';

import 'package:dart_frog/dart_frog.dart';
import 'package:picket_api/src/authenticated_route.dart';
import 'package:picket_api/src/resource_validation.dart';
import 'package:picket_api/src/transaction_contract.dart';

Future<Response> onRequest(RequestContext context, String id) =>
    handleAuthenticated(
      context,
      methods: {HttpMethod.post},
      action: (gateway, token, request) async {
        final transactionId = validateUuid(id);
        final idempotencyKey = validateIdempotencyKey(
          request.headers['idempotency-key'],
        );
        final input = CreateRefundRequest.fromJson(await request.json());
        final transaction = await gateway.createRefund(
          token,
          transactionId,
          input,
          idempotencyKey,
        );
        return Response.json(
          statusCode: HttpStatus.created,
          body: {'transaction': transaction.toJson()},
        );
      },
    );
