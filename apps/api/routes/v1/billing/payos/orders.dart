import 'dart:convert';
import 'package:dart_frog/dart_frog.dart';
import 'package:picket_api/src/authenticated_route.dart';
import 'package:picket_api/src/payos_client.dart';
import 'package:picket_api/src/payos_service.dart';

Future<Response> onRequest(RequestContext context) => handleAuthenticated(
  context,
  methods: {HttpMethod.get, HttpMethod.post},
  action: (gateway, token, request) async {
    final service = PayosService();
    if (request.method == HttpMethod.post) {
      if (!service.enabled) return apiError(503, 'PayOS is not configured.');
      final input = jsonDecode(await readLimitedBody(request, 2048));
      final code = input is Map ? input['code'] : null;
      if (input is! Map ||
          input['sku'] is! String ||
          input.keys.any((k) => k != 'sku' && k != 'code' && k != 'client') ||
          (input['client'] != null && input['client'] != 'app') ||
          (code != null &&
              (code is! String ||
                  !RegExp(r'^[A-Za-z0-9_-]{3,32}$').hasMatch(code)))) {
        throw const FormatException('Invalid checkout request.');
      }
      final key = request.headers['idempotency-key'];
      if (key == null || key.length < 8 || key.length > 120) {
        throw const FormatException('Idempotency-Key required.');
      }
      final order = await gateway.paymentRpc(token, 'payment_reserve', {
        'p_sku': input['sku'],
        'p_key': key,
        if (code != null) 'p_code': code,
      });
      try {
        final older = order['supersede'];
        if (older is List &&
            older.isNotEmpty &&
            await service.supersede(older)) {
          // An older link was already paid: the plan is now active, so the
          // new reservation is closed instead of opening a second link.
          await service.abandon(order['id'] as String);
        } else {
          await service.create(order, app: input['client'] == 'app');
        }
      } on PayosException {
        return apiError(
          502,
          'Unable to verify checkout. Retry with the same key.',
        );
      }
    }
    final result = await gateway.paymentRpc(token, 'payment_customer', {});
    if (!service.enabled) result['catalog'] = <Object?>[];
    return Response.json(
      body: result,
      headers: {'cache-control': 'no-store'},
    );
  },
);
