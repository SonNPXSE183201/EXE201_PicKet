import 'package:dart_frog/dart_frog.dart';
import 'package:picket_api/src/authenticated_route.dart';
import 'package:picket_api/src/resource_validation.dart';

Future<Response> onRequest(RequestContext context) => handleAuthenticated(
  context,
  methods: {HttpMethod.post},
  action: (gateway, token, request) async {
    final body = await request.json();
    if (body is! Map ||
        body.keys.any(
          (key) => !{
            'sourceBudgetId',
            'destinationBudgetId',
            'month',
            'amount',
          }.contains(key),
        )) {
      throw const FormatException('Invalid transfer.');
    }
    final amount = body['amount'];
    final month = body['month'];
    if (body['sourceBudgetId'] is! String ||
        body['destinationBudgetId'] is! String ||
        amount is! int ||
        amount <= 0 ||
        amount > maxMoney ||
        month is! String ||
        !RegExp(r'^\d{4}-(0[1-9]|1[0-2])$').hasMatch(month)) {
      throw const FormatException('Invalid budget transfer.');
    }
    final result = await gateway.transferBudgetLimit(token, {
      'p_source': validateUuid(body['sourceBudgetId'] as String),
      'p_destination': validateUuid(body['destinationBudgetId'] as String),
      'p_month': '$month-01',
      'p_amount': amount,
    });
    return Response.json(body: result);
  },
);
