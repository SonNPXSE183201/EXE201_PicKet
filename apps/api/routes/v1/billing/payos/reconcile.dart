import 'dart:io';
import 'package:dart_frog/dart_frog.dart';
import 'package:picket_api/src/admin_service.dart';
import 'package:picket_api/src/api_config.dart';
import 'package:picket_api/src/authenticated_route.dart';
import 'package:picket_api/src/payos_service.dart';

Future<Response> onRequest(RequestContext context) async {
  if (context.request.method != HttpMethod.post) {
    return apiError(405, 'Method not allowed');
  }
  final secret = Platform.environment['PAYOS_WORKER_SECRET'] ?? '';
  if (secret.length < 32 ||
      bearerToken(context.request.headers['authorization']) != secret) {
    return apiError(401, 'Unauthorized');
  }
  final store = AdminService(ApiConfig.fromEnvironment());
  var success = 0;
  var failed = 0;
  try {
    final queue = await store.reconciliationRpc('payment_reconcile_queue', {});
    for (final row in queue['orders'] as List) {
      final order = Map<String, dynamic>.from(row as Map);
      try {
        await PayosService().reconcile(order);
        success++;
      } on Object {
        failed++;
      }
      await store.reconciliationRpc('payment_checked', {'p_id': order['id']});
    }
    return Response.json(
      body: {'reconciled': success, 'failed': failed},
      headers: {'cache-control': 'no-store'},
    );
  } finally {
    store.close();
  }
}
