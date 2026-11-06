import 'package:dart_frog/dart_frog.dart';
import 'package:picket_api/src/authenticated_route.dart';
import 'package:picket_api/src/receipt_contract.dart';
import 'package:picket_api/src/resource_validation.dart';

Future<Response> onRequest(RequestContext context, String id) =>
    handleAuthenticated(
      context,
      methods: {HttpMethod.get, HttpMethod.put},
      action: (gateway, token, request) async {
        final receiptId = validateUuid(id);
        final receipt = request.method == HttpMethod.get
            ? await gateway.getReceipt(token, receiptId)
            : await gateway.updateReceipt(
                token,
                receiptId,
                UpdateReceiptRequest.fromJson(await request.json()),
              );
        return Response.json(body: {'receipt': receipt.toJson()});
      },
    );
