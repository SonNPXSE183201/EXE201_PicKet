import 'dart:convert';
import 'package:dart_frog/dart_frog.dart';
import 'package:picket_api/src/authenticated_route.dart';
import 'package:picket_api/src/payos_client.dart';
import 'package:picket_api/src/payos_service.dart';

Future<Response> onRequest(RequestContext context) => handleAuthenticated(
  context,
  methods: {HttpMethod.get, HttpMethod.post},
  action: (gateway, token, request) async {
    final id = request.uri.queryParameters['id'];
    if (id == null || !RegExp(r'^[a-fA-F0-9-]{36}$').hasMatch(id)) {
      throw const FormatException('Invalid order ID.');
    }
    final result = await gateway.paymentRpc(token, 'payment_customer', {
      'p_id': id,
    });
    final orders = result['orders'] as List;
    Future<Response> customerResponse() async {
      final data = await gateway.paymentRpc(token, 'payment_customer', {
        'p_id': id,
      });
      if (!PayosService().enabled) data['catalog'] = <Object?>[];
      return Response.json(body: data, headers: {'cache-control': 'no-store'});
    }

    if (orders.isEmpty) return apiError(404, 'Order not found.');
    if (request.method == HttpMethod.post) {
      final input = jsonDecode(await readLimitedBody(request, 512));
      if (input is! Map ||
          !{'refresh', 'cancel'}.contains(input['action']) ||
          input.length != 1) {
        throw const FormatException('Invalid payment action.');
      }
      final order = Map<String, dynamic>.from(orders.first as Map);
      try {
        if (order['payment_link_id'] == null && input['action'] == 'refresh') {
          await PayosService().create(order);
          return await customerResponse();
        }
        await PayosService().reconcile(
          order,
          cancel: input['action'] == 'cancel',
        );
      } on PayosException {
        return apiError(502, 'Unable to verify payment status.');
      }
    }
    return customerResponse();
  },
);
