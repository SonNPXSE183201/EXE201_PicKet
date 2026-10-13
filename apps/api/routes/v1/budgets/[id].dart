import 'package:dart_frog/dart_frog.dart';
import 'package:picket_api/src/authenticated_route.dart';
import 'package:picket_api/src/budget_contract.dart';
import 'package:picket_api/src/resource_validation.dart';

Future<Response> onRequest(RequestContext context, String id) =>
    handleAuthenticated(
      context,
      methods: {HttpMethod.patch, HttpMethod.delete},
      action: (gateway, token, request) async {
        final budgetId = validateUuid(id);
        if (request.method == HttpMethod.patch) {
          final budget = await gateway.updateBudget(
            token,
            budgetId,
            UpdateBudgetRequest.fromJson(await request.json()),
          );
          return Response.json(body: {'budget': budget.toJson()});
        }
        final version = int.tryParse(
          request.uri.queryParameters['expectedVersion'] ?? '',
        );
        if (version == null || version < 1) {
          throw const FormatException('Invalid expected version.');
        }
        final budget = await gateway.archiveBudget(token, budgetId, version);
        return Response.json(body: {'budget': budget.toJson()});
      },
    );
