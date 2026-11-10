import 'package:dart_frog/dart_frog.dart';
import 'package:picket_api/src/authenticated_route.dart';

Future<Response> onRequest(RequestContext context) => handleAuthenticated(
  context,
  methods: {HttpMethod.get},
  action: (gateway, token, request) async {
    final q = request.uri.queryParameters;
    final result = q['view'] == 'revenue'
        ? await gateway.paymentRpc(token, 'payment_dashboard', {
            'p_filters': {
              for (final k in ['from', 'to', 'bucket', 'period'])
                if (q[k] != null) k: q[k],
            },
          })
        : await gateway.paymentRpc(token, 'payment_orders', {
            'p_id': q['id'],
            'p_status': q['status'],
            'p_before': q['before'],
            'p_before_id': q['beforeId'],
            'p_page': q['page'],
            'p_page_size': q['pageSize'],
            'p_search': q['search'],
            'p_from': q['from'],
            'p_to': q['to'],
          });
    return Response.json(body: result, headers: {'cache-control': 'no-store'});
  },
);
