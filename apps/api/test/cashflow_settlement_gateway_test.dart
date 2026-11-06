import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:picket_api/src/api_config.dart';
import 'package:picket_api/src/supabase_gateway.dart';
import 'package:test/test.dart';

void main() {
  test(
    'settlement RPC uses caller identity and keyed replacement',
    () async {
      final calls = <String>[];
      final gateway = SupabaseGateway(
        ApiConfig(
          supabaseUrl: Uri.parse('https://test.supabase.co'),
          supabasePublishableKey: 'public-key',
        ),
        client: MockClient((request) async {
          expect(request.headers['authorization'], 'Bearer token');
          calls.add(request.url.path);
          if (request.url.path == '/auth/v1/user') {
            return http.Response('{"id":"owner"}', 200);
          }
          if (request.url.path.endsWith('save_cashflow_settlements')) {
            expect(jsonDecode(request.body), {
              'p_expected_revision': 0,
              'p_links': <Object>[],
              'p_request_key': 'settlement-key',
            });
          }
          return http.Response(
            '{"schemaVersion":1,"revision":0,"links":[]}',
            200,
          );
        }),
      );
      await gateway.cashflowSettlements('token');
      await gateway.cashflowSettlements(
        'token',
        input: {'p_expected_revision': 0, 'p_links': <Object>[]},
        key: 'settlement-key',
      );
      expect(calls, [
        '/auth/v1/user',
        '/rest/v1/rpc/load_cashflow_settlements',
        '/auth/v1/user',
        '/rest/v1/rpc/save_cashflow_settlements',
      ]);
      gateway.close();
    },
  );
  test(
    'invalid response and failed authentication reject',
    () async {
      for (final authenticated in [false, true]) {
        var rpc = 0;
        final gateway = SupabaseGateway(
          ApiConfig(
            supabaseUrl: Uri.parse('https://test.supabase.co'),
            supabasePublishableKey: 'public-key',
          ),
          client: MockClient((request) async {
            if (request.url.path == '/auth/v1/user') {
              return http.Response(
                authenticated ? '{"id":"owner"}' : '{}',
                authenticated ? 200 : 401,
              );
            }
            rpc++;
            return http.Response(
              '{"schemaVersion":1,"revision":-1,"links":[]}',
              200,
            );
          }),
        );
        await expectLater(
          gateway.cashflowSettlements('token'),
          throwsA(
            isA<GatewayException>().having(
              (e) => e.statusCode,
              'status',
              authenticated ? 502 : 401,
            ),
          ),
        );
        expect(rpc, authenticated ? 1 : 0);
        gateway.close();
      }
    },
  );
}
