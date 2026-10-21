import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:picket_api/src/api_config.dart';
import 'package:picket_api/src/supabase_gateway.dart';
import 'package:test/test.dart';

void main() {
  for (final status in ['abandoned', 'committed', 'invalid']) {
    test('transaction attempt resolution validates $status response', () async {
      var calls = 0;
      final gateway = SupabaseGateway(
        ApiConfig(
          supabaseUrl: Uri.parse('https://project.supabase.co'),
          supabasePublishableKey: 'public-key',
        ),
        client: MockClient((request) async {
          if (request.url.path == '/auth/v1/user')
            return http.Response('{"id":"owner"}', 200);
          calls++;
          expect(
            request.url.path,
            '/rest/v1/rpc/resolve_finance_transaction_attempt',
          );
          expect(request.method, 'POST');
          expect(request.headers['authorization'], 'Bearer jwt');
          expect(jsonDecode(request.body), {
            'p_idempotency_key': 'receipt-attempt-0001',
          });
          return http.Response(
            jsonEncode({
              'status': status,
              if (status == 'committed')
                'transaction': {
                  'id': 'transaction-id',
                  'wallet_id': 'wallet-id',
                  'title': 'Receipt',
                  'amount': 1000,
                  'kind': 'expense',
                  'occurred_at': '2026-10-21T00:00:00Z',
                  'note': '',
                  'row_version': 1,
                  'created_at': '2026-10-21T00:00:00Z',
                  'updated_at': '2026-10-21T00:00:00Z',
                },
            }),
            200,
          );
        }),
      );
      addTearDown(gateway.close);
      if (status == 'invalid') {
        await expectLater(
          gateway.resolveTransactionAttempt('jwt', 'receipt-attempt-0001'),
          throwsA(isA<GatewayException>()),
        );
      } else {
        final result = await gateway.resolveTransactionAttempt(
          'jwt',
          'receipt-attempt-0001',
        );
        expect(result['status'], status);
        if (status == 'committed')
          expect((result['transaction'] as Map)['accountId'], 'wallet-id');
      }
      expect(calls, 1);
    });
  }
}
