import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:picket_api/src/admin_service.dart';
import 'package:picket_api/src/api_config.dart';
import 'package:picket_api/src/supabase_gateway.dart';
import 'package:test/test.dart';

void main() {
  final config = ApiConfig(
    supabaseUrl: Uri.parse('https://project.supabase.co'),
    supabasePublishableKey: 'public-key',
  );
  test(
    'admin recovery uses the fragment receiver already allowlisted for web',
    () async {
      final service = AdminService(
        config,
        environment: {'SUPABASE_SECRET_KEY': 'sb_secret_fixture_service_only'},
        client: MockClient((request) async {
          expect(request.url.path, '/auth/v1/recover');
          expect(
            request.url.queryParameters['redirect_to'],
            'https://app.picketfinance.com/auth/reset-password',
          );
          expect(jsonDecode(request.body), {'email': 'member@example.test'});
          expect(request.headers['apikey'], 'sb_secret_fixture_service_only');
          expect(request.headers.containsKey('authorization'), isFalse);
          return http.Response('{}', 200);
        }),
      );
      await service.userAction(
        'reset_password',
        '11111111-1111-4111-8111-111111111111',
        'member@example.test',
      );
      service.close();
    },
  );
  test(
    'privileged operations reject public keys and allowlist RPC names',
    () async {
      var requests = 0;
      final service = AdminService(
        config,
        environment: {'SUPABASE_SECRET_KEY': 'sb_publishable_public'},
        client: MockClient((_) async {
          requests++;
          return http.Response('{}', 200);
        }),
      );
      await expectLater(
        service.rpc('admin_finish_auth', {}),
        throwsA(isA<ApiConfigException>()),
      );
      await expectLater(
        service.rpc('unrestricted_sql', {}),
        throwsFormatException,
      );
      expect(requests, 0);
      service.close();
    },
  );
  test(
    'upstream errors do not leak provider response or account details',
    () async {
      final service = AdminService(
        config,
        environment: {'SUPABASE_SECRET_KEY': 'sb_secret_fixture_service_only'},
        client: MockClient(
          (_) async => http.Response('private provider credential', 500),
        ),
      );
      await expectLater(
        service.userAction(
          'restore',
          '11111111-1111-4111-8111-111111111111',
          'member@example.test',
        ),
        throwsA(
          isA<GatewayException>().having(
            (e) => e.message,
            'safe message',
            'Unable to complete account action.',
          ),
        ),
      );
      service.close();
    },
  );
}
