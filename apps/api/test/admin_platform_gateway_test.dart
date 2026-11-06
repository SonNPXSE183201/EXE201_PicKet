import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:picket_api/src/api_config.dart';
import 'package:picket_api/src/supabase_gateway.dart';
import 'package:test/test.dart';

void main() {
  test('admin query forwards bounded filters using caller identity', () async {
    final gateway = SupabaseGateway(
      ApiConfig(
        supabaseUrl: Uri.parse('https://project.supabase.co'),
        supabasePublishableKey: 'public-key',
      ),
      client: MockClient((request) async {
        expect(request.headers['authorization'], 'Bearer caller-token');
        if (request.url.path == '/auth/v1/user') {
          return http.Response(
            '{"id":"11111111-1111-4111-8111-111111111111"}',
            200,
          );
        }
        expect(request.url.path, '/rest/v1/rpc/admin_portal');
        expect(jsonDecode(request.body), {
          'p_section': 'users',
          'p_filters': {'page': 2, 'search': 'example'},
        });
        return http.Response('{"rows":[],"total":0}', 200);
      }),
    );
    expect(
      await gateway.adminPortal('caller-token', 'users', {
        'page': 2,
        'search': 'example',
      }),
      {'rows': <Object?>[], 'total': 0},
    );
    gateway.close();
  });
  test('forbidden upstream is not converted into empty data', () async {
    final gateway = SupabaseGateway(
      ApiConfig(
        supabaseUrl: Uri.parse('https://project.supabase.co'),
        supabasePublishableKey: 'public-key',
      ),
      client: MockClient(
        (request) async => request.url.path == '/auth/v1/user'
            ? http.Response(
                '{"id":"11111111-1111-4111-8111-111111111111"}',
                200,
              )
            : http.Response(
                '{"code":"42501","message":"Permission denied"}',
                403,
              ),
      ),
    );
    await expectLater(
      gateway.adminPortal('token', 'users', {}),
      throwsA(
        isA<GatewayException>().having((e) => e.statusCode, 'status', 403),
      ),
    );
    gateway.close();
  });
}
