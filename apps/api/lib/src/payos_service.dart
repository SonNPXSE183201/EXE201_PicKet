import 'dart:io';
import 'package:http/http.dart' as http;
import 'package:picket_api/src/admin_service.dart';
import 'package:picket_api/src/api_config.dart';
import 'package:picket_api/src/payos_client.dart';
import 'package:picket_api/src/supabase_gateway.dart';

class PayosService {
  PayosService({
    Map<String, String>? environment,
    http.Client Function()? clientFactory,
  }) : env = environment ?? Platform.environment,
       _clientFactory = clientFactory ?? http.Client.new;
  final Map<String, String> env;
  final http.Client Function() _clientFactory;
  bool get enabled =>
      env['PAYOS_ENABLED'] == 'true' &&
      [
        'PAYOS_CLIENT_ID',
        'PAYOS_API_KEY',
        'PAYOS_CHECKSUM_KEY',
        'PAYOS_ACCOUNT_NUMBER',
        'PAYOS_RETURN_URL',
      ].every((k) => (env[k] ?? '').isNotEmpty);
  PayosClient _client() {
    if ([
      'PAYOS_CLIENT_ID',
      'PAYOS_API_KEY',
      'PAYOS_CHECKSUM_KEY',
      'PAYOS_ACCOUNT_NUMBER',
    ].any((k) => (env[k] ?? '').isEmpty)) {
      throw const GatewayException(503, 'PayOS is not configured.');
    }
    return PayosClient(
      clientId: env['PAYOS_CLIENT_ID']!,
      apiKey: env['PAYOS_API_KEY']!,
      checksumKey: env['PAYOS_CHECKSUM_KEY']!,
      client: _clientFactory(),
    );
  }

  Uri _returnUrl(String id) {
    final base = Uri.tryParse(env['PAYOS_RETURN_URL'] ?? '');
    if (base == null ||
        base.scheme != 'https' ||
        base.host.isEmpty ||
        base.hasFragment ||
        base.hasQuery) {
      throw const GatewayException(
        503,
        'Payment return URL is not configured.',
      );
    }
    return base.replace(queryParameters: {'orderId': id});
  }

  Future<void> create(Map<String, dynamic> order) async {
    if (order['payment_link_id'] != null) return;
    if (!enabled) {
      throw const GatewayException(503, 'PayOS checkout is disabled.');
    }
    final client = _client();
    final store = AdminService(
      ApiConfig.fromEnvironment(env),
      environment: env,
      client: _clientFactory(),
    );
    try {
      // A reserved orderCode is reused after an ambiguous timeout. PayOS may
      // reject duplicate creation; a later status query recovers the same link.
      Map<String, dynamic> data;
      final code = order['order_code'].toString();
      try {
        data = await client.createPayment({
          'orderCode': order['order_code'],
          'amount': order['amount'],
          'description': 'PK${code.substring(code.length - 7)}',
          'returnUrl': _returnUrl(order['id'] as String).toString(),
          'cancelUrl': _returnUrl(order['id'] as String).toString(),
          'expiredAt':
              DateTime.parse(
                order['expires_at'] as String,
              ).millisecondsSinceEpoch ~/
              1000,
        });
      } on PayosException {
        data = await client.getPayment(order['order_code'] as int);
      }
      if (data['orderCode'] != order['order_code'] ||
          data['amount'] != order['amount']) {
        throw const PayosException();
      }
      final link = data['paymentLinkId'] ?? data['id'];
      final checkout = data['checkoutUrl'] ?? 'https://pay.payos.vn/$link';
      final uri = Uri.tryParse(checkout.toString());
      if (link is! String ||
          link.isEmpty ||
          uri == null ||
          uri.scheme != 'https' ||
          !(uri.host == 'pay.payos.vn' || uri.host.endsWith('.payos.vn'))) {
        throw const PayosException();
      }
      await store.paymentRpc('payment_attach', {
        'p_id': order['id'],
        'p_data': {
          'paymentLinkId': link,
          'checkoutUrl': checkout,
          'qrCode': data['qrCode'],
        },
      });
    } finally {
      client.close();
      store.close();
    }
  }

  Future<void> reconcile(
    Map<String, dynamic> order, {
    bool cancel = false,
  }) async {
    final client = _client();
    final store = AdminService(
      ApiConfig.fromEnvironment(env),
      environment: env,
      client: _clientFactory(),
    );
    try {
      final data = cancel
          ? await client.cancelPayment(order['order_code'] as int)
          : await client.getPayment(order['order_code'] as int);
      if (data['orderCode'] != order['order_code'] ||
          data['amount'] != order['amount'] ||
          data['id'] != order['payment_link_id']) {
        throw const PayosException();
      }
      final transactions = data['transactions'];
      if (transactions is! List) throw const PayosException();
      for (final item in transactions) {
        if (item is! Map ||
            item['amount'] is! int ||
            item['reference'] is! String ||
            item['transactionDateTime'] is! String) {
          throw const PayosException();
        }
        await store.paymentRpc('payment_receive', {
          'p_account': env['PAYOS_ACCOUNT_NUMBER'],
          'p_data': {
            'orderCode': order['order_code'],
            'paymentLinkId': data['id'],
            'amount': item['amount'],
            'currency': 'VND',
            'code': '00',
            'reference': item['reference'],
            'transactionDateTime': item['transactionDateTime'],
            'accountNumber': env['PAYOS_ACCOUNT_NUMBER'],
          },
        });
      }
      await store.paymentRpc('payment_state', {
        'p_id': order['id'],
        'p_status': data['status'],
      });
    } finally {
      client.close();
      store.close();
    }
  }

  Future<void> webhook(Map<String, dynamic> input) async {
    _client().close();
    final data = input['data'];
    final signature = input['signature'];
    if (data is! Map<String, dynamic> ||
        signature is! String ||
        !verifyPayosSignature(data, signature, env['PAYOS_CHECKSUM_KEY']!)) {
      throw const GatewayException(400, 'Invalid payment signature.');
    }
    if (data['code'] != '00') return;
    final store = AdminService(
      ApiConfig.fromEnvironment(env),
      environment: env,
      client: _clientFactory(),
    );
    try {
      await store.paymentRpc('payment_receive', {
        'p_data': data,
        'p_account': env['PAYOS_ACCOUNT_NUMBER'],
      });
    } finally {
      store.close();
    }
  }
}
