import 'package:dart_frog/dart_frog.dart';
import 'package:picket_api/src/authenticated_route.dart';
import 'package:picket_api/src/bill_contract.dart';
import 'package:picket_api/src/resource_validation.dart';

Future<Response> onRequest(RequestContext context, String id) =>
    handleAuthenticated(
      context,
      methods: {HttpMethod.patch, HttpMethod.delete},
      action: (gateway, token, request) async {
        final billId = validateUuid(id);
        if (request.method == HttpMethod.patch) {
          final bill = await gateway.updateBill(
            token,
            billId,
            UpdateBillRequest.fromJson(await request.json()),
          );
          return Response.json(body: {'bill': bill.toJson()});
        }
        final version = int.tryParse(
          request.uri.queryParameters['expectedVersion'] ?? '',
        );
        if (version == null || version < 1) {
          throw const FormatException('Invalid expected version.');
        }
        final bill = await gateway.archiveBill(token, billId, version);
        return Response.json(body: {'bill': bill.toJson()});
      },
    );
