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
      if (input is! Map || input.length != 1 || input['sku'] is! String) {
        throw const FormatException('Invalid checkout request.');
      }
      final key = request.headers['idempotency-key'];
      if (key == null || key.length < 8 || key.length > 120) {
        throw const FormatException('Idempotency-Key required.');
      }
      final order = await gateway.paymentRpc(token, 'payment_reserve', {
        'p_sku': input['sku'],
        'p_key': key,
      });
      try {
        await service.create(order);
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
