import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:picket_api/src/api_config.dart';
import 'package:picket_api/src/supabase_gateway.dart';
import 'package:test/test.dart';

void main() {
  test('ledger uses caller JWT and one atomic origin', () async {
    final gateway = SupabaseGateway(
      ApiConfig(
        supabaseUrl: Uri.parse('https://test.supabase.co'),
        supabasePublishableKey: 'public-key',
      ),
      client: MockClient((request) async {
        expect(request.headers['authorization'], 'Bearer token');
        if (request.url.path == '/auth/v1/user') {
          return http.Response('{"id":"owner"}', 200);
        }
        expect(request.url.path, '/rest/v1/rpc/load_cashflow_ledger_snapshot');
        expect(request.body, '{}');
        return http.Response(
          '{"asOf":"2026-10-24T00:00:00Z",'
          '"wallets":[],"entries":[],"confirmations":[]}',
          200,
        );
      }),
    );
    expect(
      (await gateway.cashflowLedger('token'))['asOf'],
      '2026-10-24T00:00:00Z',
    );
    gateway.close();
  });
}
