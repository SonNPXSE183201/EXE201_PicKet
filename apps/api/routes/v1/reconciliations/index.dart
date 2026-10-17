import 'package:dart_frog/dart_frog.dart';
import 'package:picket_api/src/authenticated_route.dart';
import 'package:picket_api/src/resource_validation.dart';

Future<Response> onRequest(RequestContext context) => handleAuthenticated(
  context,
  methods: {HttpMethod.post},
  action: (gateway, token, request) async {
    final body = await request.json();
    const fields = {
      'requestId',
      'accountId',
      'statementDate',
      'statementBalance',
      'selectedTransactionIds',
      'reason',
    };
    if (body is! Map ||
        body.keys.any((key) => !fields.contains(key)) ||
        body['requestId'] is! String ||
        body['accountId'] is! String ||
        body['statementDate'] is! String ||
        !RegExp(
          r'^\d{4}-\d{2}-\d{2}$',
        ).hasMatch(body['statementDate'] as String) ||
        DateTime.tryParse(body['statementDate'] as String) == null ||
        body['statementBalance'] is! int ||
        (body['statementBalance'] as int).abs() > maxMoney ||
        body['selectedTransactionIds'] is! List ||
        (body['selectedTransactionIds'] as List).length > 10000 ||
        body['reason'] is! String ||
        (body['reason'] as String).length > 1000) {
      throw const FormatException('Invalid reconciliation.');
    }
    final ids = <String>[];
    for (final id in body['selectedTransactionIds'] as List) {
      if (id is! String) {
        throw const FormatException('Invalid transaction identifier.');
      }
      ids.add(validateUuid(id));
    }
    final result = await gateway.reconcileWallet(token, {
      'p_request_id': validateUuid(body['requestId'] as String),
      'p_wallet_id': validateUuid(body['accountId'] as String),
      'p_period_end': body['statementDate'],
      'p_statement_balance': body['statementBalance'],
      'p_selected_ids': ids,
      'p_reason': body['reason'],
    });
    return Response.json(body: result);
  },
);
