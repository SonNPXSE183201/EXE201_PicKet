import 'package:dart_frog/dart_frog.dart';
import 'package:picket_api/src/account_contract.dart';
import 'package:picket_api/src/authenticated_route.dart';

Future<Response> onRequest(RequestContext context, String id) =>
    handleAuthenticated(
      context,
      methods: {HttpMethod.patch, HttpMethod.delete},
      action: (gateway, token, request) async {
        final accountId = validateUuid(id);
        if (request.method == HttpMethod.patch) {
          final input = UpdateAccountRequest.fromJson(await request.json());
          final account = await gateway.updateAccount(token, accountId, input);
          return Response.json(body: {'account': account.toJson()});
        }
        final expectedVersion = int.tryParse(
          request.uri.queryParameters['expectedVersion'] ?? '',
        );
        if (expectedVersion == null || expectedVersion < 1) {
          throw const FormatException('Invalid expected version.');
        }
        final account = await gateway.archiveAccount(
          token,
          accountId,
          expectedVersion,
        );
        return Response.json(body: {'account': account.toJson()});
      },
    );
