import 'dart:io';

import 'package:dart_frog/dart_frog.dart';
import 'package:picket_api/src/authenticated_route.dart';
import 'package:picket_api/src/transaction_contract.dart';

Future<Response> onRequest(RequestContext context) => handleAuthenticated(
  context,
  methods: {HttpMethod.get, HttpMethod.post},
  action: (gateway, token, request) async {
    if (request.method == HttpMethod.get) {
      final requestedLimit = int.tryParse(
        request.uri.queryParameters['limit'] ?? '100',
      );
      if (requestedLimit == null ||
          requestedLimit < 1 ||
          requestedLimit > 100) {
        throw const FormatException('Limit must be between 1 and 100.');
      }
      final offset = int.tryParse(request.uri.queryParameters['offset'] ?? '0');
      if (offset == null || offset < 0 || offset > 1000000) {
        throw const FormatException('Offset must be between 0 and 1000000.');
      }
      final transactions = await gateway.listTransactions(
        token,
        limit: requestedLimit,
        offset: offset,
      );
      return Response.json(
        body: {
          'transactions': transactions
              .map((transaction) => transaction.toJson())
              .toList(),
        },
      );
    }
    final idempotencyKey = validateIdempotencyKey(
      request.headers['idempotency-key'],
    );
    final input = CreateTransactionRequest.fromJson(await request.json());
    final transaction = await gateway.createTransaction(
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
