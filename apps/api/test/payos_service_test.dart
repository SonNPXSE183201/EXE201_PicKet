import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:picket_api/src/payos_client.dart';
import 'package:picket_api/src/payos_service.dart';
import 'package:picket_api/src/supabase_gateway.dart';
import 'package:test/test.dart';

void main() {
  const environment = {
    'APP_ENV': 'development',
    'SUPABASE_URL': 'https://project.supabase.co',
    'SUPABASE_PUBLISHABLE_KEY': 'sb_publishable_fixture',
    'SUPABASE_SECRET_KEY': 'sb_secret_public_test_fixture_only',
    'PAYOS_ENABLED': 'true',
    'PAYOS_CLIENT_ID': 'fixture',
    'PAYOS_API_KEY': 'fixture',
    'PAYOS_CHECKSUM_KEY': 'test_checksum_key',
    'PAYOS_ACCOUNT_NUMBER': 'fixture-bank',
    'PAYOS_RETURN_URL': 'https://app.picketfinance.com/billing/return',
  };
  final order = <String, dynamic>{
    'id': 'fixture-id',
    'order_code': 1000000000,
    'amount': 19000,
    'payment_link_id': null,
    'expires_at': '2026-11-04T00:15:00Z',
  };
  http.Response signed(Map<String, dynamic> data) => http.Response(
    jsonEncode({
      'code': '00',
      'data': data,
      'signature': payosSignature(data, 'test_checksum_key'),
    }),
    200,
  );
  test(
    'creates signed server-price checkout and persists verified result',
    () async {
      final writes = <String>[];
      final service = PayosService(
        environment: environment,
        clientFactory: () => MockClient((request) async {
          if (request.url.host == 'api-merchant.payos.vn') {
            expect(request.headers['x-api-key'], 'fixture');
            final input = jsonDecode(request.body) as Map<String, dynamic>;
            expect(input['amount'], 19000);
            expect(
              (input['description'] as String).length,
              lessThanOrEqualTo(9),
            );
            expect(
              verifyPayosSignature(
                {
                  for (final k in [
                    'amount',
                    'cancelUrl',
                    'description',
                    'orderCode',
                    'returnUrl',
                  ])
                    k: input[k],
                },
                input['signature'] as String,
                'test_checksum_key',
              ),
              true,
            );
            return signed({
              'orderCode': 1000000000,
              'amount': 19000,
              'paymentLinkId': 'link-id',
              'checkoutUrl': 'https://pay.payos.vn/link-id',
              'qrCode': 'fixture',
            });
          }
          writes.add(request.url.path);
          expect(request.headers['apikey'], environment['SUPABASE_SECRET_KEY']);
          expect((jsonDecode(request.body) as Map)['p_id'], 'fixture-id');
          return http.Response('null', 200);
        }),
      );
      await service.create(order);
      expect(writes, ['/rest/v1/rpc/payment_attach']);
    },
  );
  test('duplicate create recovers same orderCode from signed query', () async {
    var reads = 0;
    var writes = 0;
    final service = PayosService(
      environment: environment,
      clientFactory: () => MockClient((request) async {
        if (request.url.host != 'api-merchant.payos.vn') {
          writes++;
          return http.Response('null', 200);
        }
        if (request.method == 'POST') {
          return http.Response('{"code":"231"}', 400);
        }
        reads++;
        expect(request.url.path.endsWith('1000000000'), true);
        return signed({
          'id': 'link-id',
          'orderCode': 1000000000,
          'amount': 19000,
        });
      }),
    );
    await service.create(order);
    expect(reads, 1);
    expect(writes, 1);
  });
  test('signed mismatched amount cannot attach checkout', () async {
    final service = PayosService(
      environment: environment,
      clientFactory: () => MockClient((request) async {
        expect(request.url.host, 'api-merchant.payos.vn');
        return signed({
          'orderCode': 1000000000,
          'amount': 1,
          'paymentLinkId': 'link-id',
          'checkoutUrl': 'https://pay.payos.vn/link-id',
        });
      }),
    );
    await expectLater(service.create(order), throwsA(isA<PayosException>()));
  });
  test('disabled checkout cannot create a link for a reserved order', () async {
    var clientsCreated = 0;
    final service = PayosService(
      environment: {...environment, 'PAYOS_ENABLED': 'false'},
      clientFactory: () {
        clientsCreated++;
        throw StateError('Disabled checkout must not contact any service.');
      },
    );
    await expectLater(
      service.create(order),
      throwsA(
        isA<GatewayException>().having(
          (error) => error.statusCode,
          'statusCode',
          503,
        ),
      ),
    );
    expect(clientsCreated, 0);
  });
  test(
    'receipt processing stays available after new checkout flag is disabled',
    () async {
      var writes = 0;
      final data = <String, dynamic>{
        'code': '00',
        'amount': 19000,
        'reference': 'ref',
        'currency': 'VND',
      };
      final service = PayosService(
        environment: {...environment, 'PAYOS_ENABLED': 'false'},
        clientFactory: () => MockClient((request) async {
          writes++;
          expect(request.url.path, '/rest/v1/rpc/payment_receive');
          expect(
            (jsonDecode(request.body) as Map)['p_account'],
            'fixture-bank',
          );
          return http.Response('{}', 200);
        }),
      );
      expect(service.enabled, false);
      await service.webhook({
        'data': data,
        'signature': payosSignature(data, 'test_checksum_key'),
      });
      expect(writes, 1);
      await expectLater(
        service.webhook({'data': data, 'signature': 'forged'}),
        throwsA(isA<GatewayException>()),
      );
      expect(writes, 1);
    },
  );
  test(
    'reconciliation persists each signed transaction before provider state',
    () async {
      final writes = <String>[];
      final service = PayosService(
        environment: environment,
        clientFactory: () => MockClient((request) async {
          if (request.url.host == 'api-merchant.payos.vn') {
            return signed({
              'id': 'link-id',
              'orderCode': 1000000000,
              'amount': 19000,
              'status': 'PAID',
              'transactions': [
                {
                  'amount': 19000,
                  'reference': 'ref',
                  'transactionDateTime': '2026-11-04 07:00:00',
                },
              ],
            });
          }
          writes.add(request.url.path);
          return http.Response('{}', 200);
        }),
      );
      await service.reconcile({...order, 'payment_link_id': 'link-id'});
      expect(writes, [
        '/rest/v1/rpc/payment_receive',
        '/rest/v1/rpc/payment_state',
      ]);
    },
  );
}
