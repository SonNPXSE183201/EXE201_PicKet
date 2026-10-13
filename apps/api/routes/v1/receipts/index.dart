import 'dart:io';

import 'package:dart_frog/dart_frog.dart';
import 'package:picket_api/src/authenticated_route.dart';
import 'package:picket_api/src/receipt_contract.dart';

Future<Response> onRequest(RequestContext context) => handleAuthenticated(
  context,
  methods: {HttpMethod.get, HttpMethod.post},
  action: (gateway, token, request) async {
    if (request.method == HttpMethod.get) {
      final receipts = await gateway.listReceipts(token);
      return Response.json(
        body: {'receipts': receipts.map((item) => item.toJson()).toList()},
      );
    }
    final receipt = await gateway.createReceipt(
      token,
      CreateReceiptRequest.fromJson(await request.json()),
    );
    return Response.json(
      statusCode: HttpStatus.created,
      body: {'receipt': receipt.toJson()},
    );
  },
);
