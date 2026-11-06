import 'package:dart_frog/dart_frog.dart';
import 'package:picket_api/src/authenticated_route.dart';
import 'package:picket_api/src/cashflow_settlement_contract.dart';
import 'package:picket_api/src/resource_validation.dart';

Future<Response> onRequest(RequestContext context) => handleAuthenticated(
  context,
  methods: {HttpMethod.get, HttpMethod.put},
  maxContentLength: 524288,
  action: (gateway, token, request) async {
    final input = request.method == HttpMethod.put
        ? validateSettlementMutation(await request.json())
        : null;
    final key = input == null
        ? null
        : validateIdempotencyKey(request.headers['idempotency-key']);
    return Response.json(
      body: await gateway.cashflowSettlements(token, input: input, key: key),
      headers: {'cache-control': 'private, no-store'},
    );
  },
);
