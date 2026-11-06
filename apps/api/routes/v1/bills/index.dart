import 'dart:io';

import 'package:dart_frog/dart_frog.dart';
import 'package:picket_api/src/authenticated_route.dart';
import 'package:picket_api/src/bill_contract.dart';
import 'package:picket_api/src/resource_validation.dart';

Future<Response> onRequest(RequestContext context) => handleAuthenticated(
  context,
  methods: {HttpMethod.get, HttpMethod.post},
  action: (gateway, token, request) async {
    if (request.method == HttpMethod.get) {
      final bills = await gateway.listBills(token);
      return Response.json(
        body: {'bills': bills.map((item) => item.toJson()).toList()},
      );
    }
    final idempotencyKey = validateIdempotencyKey(
      request.headers['idempotency-key'],
    );
    final bill = await gateway.createBill(
      token,
      CreateBillRequest.fromJson(await request.json()),
      idempotencyKey,
    );
    return Response.json(
      statusCode: HttpStatus.created,
      body: {'bill': bill.toJson()},
    );
  },
);
