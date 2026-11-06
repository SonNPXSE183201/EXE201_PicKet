import 'package:dart_frog/dart_frog.dart';
import 'package:picket_api/src/authenticated_route.dart';
import 'package:picket_api/src/cashflow_schedule_contract.dart';
import 'package:picket_api/src/resource_validation.dart';

Future<Response> onRequest(RequestContext context, String id) =>
    handleAuthenticated(
      context,
      methods: {HttpMethod.put, HttpMethod.delete},
      maxContentLength: 4096,
      action: (gateway, token, request) async {
        final key = validateIdempotencyKey(request.headers['idempotency-key']);
        final mutation = CashflowScheduleMutation.fromJson(
          await request.json(),
          id,
          remove: request.method == HttpMethod.delete,
        );
        return Response.json(
          body: await gateway.cashflowSchedules(
            token,
            mutation: mutation,
            key: key,
          ),
          headers: {'cache-control': 'private, no-store'},
        );
      },
    );
