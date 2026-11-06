import 'dart:convert';
import 'package:dart_frog/dart_frog.dart';
import 'package:picket_api/src/authenticated_route.dart';
import 'package:picket_api/src/revenue_csv.dart';

const _filters = [
  'from',
  'to',
  'bucket',
  'source',
  'status',
  'kind',
  'ref',
  'userId',
  'beforeId',
  'id',
  'limit',
];

/// Unified revenue (Google Play + PayOS). Permission and MFA checks live in
/// the database functions; this route only shapes requests and responses.
Future<Response> onRequest(RequestContext context) => handleAuthenticated(
  context,
  methods: {HttpMethod.get, HttpMethod.post},
  action: (gateway, token, request) async {
    if (request.method == HttpMethod.post) {
      final input = jsonDecode(await readLimitedBody(request, 2048));
      if (input is! Map ||
          input['reason'] is! String ||
          input['ledgerId'] is! int ||
          input['amountVnd'] is! int ||
          !{'refund', 'adjustment'}.contains(input['kind'])) {
        throw const FormatException('Invalid revenue adjustment.');
      }
      final result = await gateway.paymentRpc(token, 'revenue_adjust', {
        'p_body': {
          'ledgerId': input['ledgerId'],
          'amountVnd': input['amountVnd'],
          'kind': input['kind'],
          if (input['externalRef'] is String)
            'externalRef': input['externalRef'],
        },
        'p_reason': input['reason'],
      });
      return Response.json(
        body: result,
        headers: {'cache-control': 'no-store'},
      );
    }
    final q = request.uri.queryParameters;
    final filters = {
      for (final k in _filters)
        if (q[k] != null && q[k]!.isNotEmpty) k: q[k],
    };
    switch (q['view']) {
      case 'entries':
        return Response.json(
          body: await gateway.paymentRpc(token, 'revenue_entries', {
            'p_filters': filters,
          }),
          headers: {'cache-control': 'no-store'},
        );
      case 'csv':
        final data = await gateway.paymentRpc(token, 'revenue_entries', {
          'p_filters': {...filters, 'limit': '1000'},
        });
        return Response(
          body: revenueCsv(data['entries'] as List),
          headers: {
            'content-type': 'text/csv; charset=utf-8',
            'content-disposition': 'attachment; filename="picket-revenue.csv"',
            'cache-control': 'no-store',
          },
        );
      default:
        return Response.json(
          body: await gateway.paymentRpc(token, 'revenue_summary', {
            'p_filters': filters,
          }),
          headers: {'cache-control': 'no-store'},
        );
    }
  },
);
