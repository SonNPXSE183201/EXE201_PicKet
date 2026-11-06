import 'package:dart_frog/dart_frog.dart';
import 'package:picket_api/src/authenticated_route.dart';
import 'package:picket_api/src/resource_validation.dart';
import 'package:picket_api/src/transaction_contract.dart';

Future<Response> onRequest(RequestContext context, String id) =>
    handleAuthenticated(
      context,
      methods: {HttpMethod.patch, HttpMethod.delete},
      action: (gateway, token, request) async {
        final transactionId = validateUuid(id);
        if (request.method == HttpMethod.patch) {
          final input = UpdateTransactionRequest.fromJson(await request.json());
          final transaction = await gateway.updateTransaction(
            token,
            transactionId,
            input,
          );
          return Response.json(body: {'transaction': transaction.toJson()});
        }
        final expectedVersion = int.tryParse(
          request.uri.queryParameters['expectedVersion'] ?? '',
        );
        if (expectedVersion == null || expectedVersion < 1) {
          throw const FormatException('Invalid expected version.');
        }
        final transaction = await gateway.archiveTransaction(
          token,
          transactionId,
          expectedVersion,
        );
        return Response.json(body: {'transaction': transaction.toJson()});
      },
    );
