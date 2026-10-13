import 'package:dart_frog/dart_frog.dart';
import 'package:picket_api/src/authenticated_route.dart';
import 'package:picket_api/src/resource_validation.dart';
import 'package:picket_api/src/transaction_contract.dart';

Future<Response> onRequest(RequestContext context, String id) =>
    handleAuthenticated(
      context,
      methods: {HttpMethod.get, HttpMethod.put},
      action: (gateway, token, request) async {
        final transactionId = validateUuid(id);
        if (request.method == HttpMethod.get) {
          final splits = await gateway.listTransactionSplits(
            token,
            transactionId,
          );
          return Response.json(
            body: {
              'splits': splits.map((item) => item.toJson()).toList(),
            },
          );
        }
        final input = SetTransactionSplitsRequest.fromJson(
          await request.json(),
        );
        final result = await gateway.setTransactionSplits(
          token,
          transactionId,
          input,
        );
        return Response.json(
          body: {
            'transaction': result.transaction.toJson(),
            'splits': result.splits.map((item) => item.toJson()).toList(),
          },
        );
      },
    );
