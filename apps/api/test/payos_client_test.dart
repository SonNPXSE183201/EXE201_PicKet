import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:picket_api/src/payos_client.dart';
import 'package:test/test.dart';

void main() {
  const key = 'test_checksum_key'; // Public fixture from the official SDK.
  test('matches official create signature vector without URL encoding', () {
    expect(
      payosSignature({
        'amount': 2000,
        'description': 'Thanh toán đơn hàng',
        'orderCode': 0,
        'cancelUrl': 'http://localhost',
        'returnUrl': 'http://localhost',
      }, key),
      'd8b7b0e5d19edfe7b1f53dedeb8d1c7c2b62fabd7eb320dbc514c58f13e9e2c5',
    );
  });
  test('matches official response vector with nulls and arrays', () {
    expect(
      payosSignature({
        'id': 'payment-link-id',
        'orderCode': 0,
        'amount': 2000,
        'amountPaid': 0,
        'amountRemaining': 2000,
        'status': 'PENDING',
        'createdAt': '2025-12-12T09:00:00+07:00',
        'transactions': <Object?>[],
        'canceledAt': null,
        'cancellationReason': null,
      }, key),
      '33093364158b143baa9ecd2e705d9a2a5a5d391a3cab7cb0a371588b3731368f',
    );
  });
  test('rejects altered webhook data, including fields outside amount', () {
    final data = <String, dynamic>{
      'orderCode': 42,
      'amount': 2000,
      'code': '00',
      'currency': 'VND',
    };
    final signature = payosSignature(data, key);
    expect(verifyPayosSignature(data, signature, key), isTrue);
    expect(
      verifyPayosSignature({...data, 'currency': 'USD'}, signature, key),
      isFalse,
    );
    expect(verifyPayosSignature(data, 'bad', key), isFalse);
  });
  test('rejects unsigned provider responses and sanitizes error', () async {
    final client = PayosClient(
      clientId: 'fixture',
      apiKey: 'fixture',
      checksumKey: key,
      client: MockClient(
        (_) async => http.Response(
          jsonEncode({
            'code': '00',
            'data': {'id': 'forged'},
            'signature': 'bad',
          }),
          200,
        ),
      ),
    );
    await expectLater(client.getPayment(42), throwsA(isA<PayosException>()));
  });
}
