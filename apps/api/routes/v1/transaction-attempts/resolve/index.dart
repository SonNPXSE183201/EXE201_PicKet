import 'package:dart_frog/dart_frog.dart';
import 'package:picket_api/src/authenticated_route.dart';
import 'package:picket_api/src/transaction_contract.dart';

Future<Response> onRequest(RequestContext context) => handleAuthenticated(
  context,
  methods: {HttpMethod.post},
  action: (gateway, token, request) async {
    final body = await request.json();
    if (body is! Map<String, dynamic> || body['idempotencyKey'] is! String) {
      throw const FormatException('A transaction attempt key is required.');
    }
    final key = validateIdempotencyKey(body['idempotencyKey'] as String);
    return Response.json(
      body: await gateway.resolveTransactionAttempt(token, key),
    );
  },
);
