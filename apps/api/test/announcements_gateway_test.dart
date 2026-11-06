import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:picket_api/src/api_config.dart';
import 'package:picket_api/src/supabase_gateway.dart';
import 'package:test/test.dart';

void main() {
  SupabaseGateway gateway(List<String?> seen, {bool expire = false}) =>
      SupabaseGateway(
        ApiConfig(
          supabaseUrl: Uri.parse('https://project.supabase.co'),
          supabasePublishableKey: 'public-key',
        ),
        client: MockClient((request) async {
          expect(request.url.path, '/rest/v1/rpc/announcements_feed');
          expect(request.headers['apikey'], 'public-key');
          final auth = request.headers['authorization'];
          seen.add(auth);
          if (expire && auth != null) return http.Response('{}', 401);
          return http.Response(
            '{"items":[],"maintenance":{"active":false}}',
            200,
          );
        }),
      );

  test('guest feed is requested without any bearer token', () async {
    final seen = <String?>[];
    final g = gateway(seen);
    await g.announcementsFeed(null, {'p_channel': 'apk'});
    expect(seen, [null]);
    g.close();
  });
  test('an expired session still receives the guest feed', () async {
    final seen = <String?>[];
    final g = gateway(seen, expire: true);
    final feed = await g.announcementsFeed('old-token', {'p_channel': 'play'});
    expect(seen, ['Bearer old-token', null]);
    expect(feed['items'], isEmpty);
    g.close();
  });
}
