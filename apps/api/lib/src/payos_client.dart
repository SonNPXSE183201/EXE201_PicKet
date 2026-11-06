import 'dart:convert';
import 'package:crypto/crypto.dart';
import 'package:http/http.dart' as http;

/// Payment API canonicalization, matching payOSHQ's payment SDK fixtures.
String payosSignature(Map<String, dynamic> data, String key) {
  Object? sorted(Object? value) {
    if (value is Map) {
      final keys = value.keys.cast<String>().toList()..sort();
      return {for (final k in keys) k: sorted(value[k])};
    }
    if (value is List) return value.map(sorted).toList();
    return value;
  }

  String encode(Object? value) {
    if (value == null || value == 'null' || value == 'undefined') return '';
    if (value is List || value is Map) return jsonEncode(sorted(value));
    return value.toString();
  }

  final keys = data.keys.toList()..sort();
  final input = keys.map((k) => '$k=${encode(data[k])}').join('&');
  return Hmac(sha256, utf8.encode(key)).convert(utf8.encode(input)).toString();
}

bool verifyPayosSignature(
  Map<String, dynamic> data,
  String signature,
  String key,
) {
  if (!RegExp(r'^[a-fA-F0-9]{64}$').hasMatch(signature)) return false;
  final expected = payosSignature(data, key);
  var difference = 0;
  final actual = signature.toLowerCase();
  for (var i = 0; i < expected.length; i++) {
    difference |= expected.codeUnitAt(i) ^ actual.codeUnitAt(i);
  }
  return difference == 0;
}

class PayosException implements Exception {
  const PayosException();
  @override
  String toString() => 'Payment provider request could not be verified.';
}

class PayosClient {
  PayosClient({
    required this.clientId,
    required this.apiKey,
    required this.checksumKey,
    http.Client? client,
  }) : _client = client ?? http.Client();
  final String clientId;
  final String apiKey;
  final String checksumKey;
  final http.Client _client;

  Future<Map<String, dynamic>> createPayment(Map<String, dynamic> input) =>
      _request(
        'POST',
        '/v2/payment-requests',
        {
          ...input,
          'signature': payosSignature({
            for (final k in [
              'amount',
              'cancelUrl',
              'description',
              'orderCode',
              'returnUrl',
            ])
              k: input[k],
          }, checksumKey),
        },
      );
  Future<Map<String, dynamic>> getPayment(int code) =>
      _request('GET', '/v2/payment-requests/$code');
  Future<Map<String, dynamic>> cancelPayment(int code) => _request(
    'POST',
    '/v2/payment-requests/$code/cancel',
    {'cancellationReason': 'Cancelled by account owner'},
  );

  Future<Map<String, dynamic>> _request(
    String method,
    String path, [
    Map<String, dynamic>? body,
  ]) async {
    final request =
        http.Request(method, Uri.https('api-merchant.payos.vn', path))
          ..headers.addAll({
            'x-client-id': clientId,
            'x-api-key': apiKey,
            'content-type': 'application/json',
          });
    if (body != null) request.body = jsonEncode(body);
    final response = await http.Response.fromStream(
      await _client.send(request).timeout(const Duration(seconds: 20)),
    );
    if (response.statusCode != 200 || response.bodyBytes.length > 1048576) {
      throw const PayosException();
    }
    final value = jsonDecode(response.body);
    if (value is! Map ||
        value['code'] != '00' ||
        value['data'] is! Map<String, dynamic> ||
        value['signature'] is! String ||
        !verifyPayosSignature(
          value['data'] as Map<String, dynamic>,
          value['signature'] as String,
          checksumKey,
        )) {
      throw const PayosException();
    }
    return value['data'] as Map<String, dynamic>;
  }

  void close() => _client.close();
}
