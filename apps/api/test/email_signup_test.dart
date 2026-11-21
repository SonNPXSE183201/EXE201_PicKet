import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:picket_api/src/admin_service.dart';
import 'package:picket_api/src/api_config.dart';
import 'package:picket_api/src/email_signup.dart';
import 'package:picket_api/src/supabase_gateway.dart';
import 'package:test/test.dart';

final config = ApiConfig(
  supabaseUrl: Uri.parse('https://project.supabase.co'),
  supabasePublishableKey: 'public-key',
);
const env = {
  'SUPABASE_SECRET_KEY': 'sb_secret_public_test_fixture_only',
  'OTP_HMAC_KEY': 'otp-test-key-that-is-long-enough-123456',
};

void main() {
  group('normalizeSignupEmail', () {
    test('trims and lower-cases a valid address', () {
      expect(
        normalizeSignupEmail('  An.Nguyen@Gmail.COM '),
        'an.nguyen@gmail.com',
      );
    });
    test('rejects non-emails', () {
      expect(normalizeSignupEmail('no-at-sign'), isNull);
      expect(normalizeSignupEmail('a@b'), isNull);
      expect(normalizeSignupEmail(42), isNull);
      expect(normalizeSignupEmail('${'a' * 250}@x.vn'), isNull);
    });
  });

  group('EmailSignupService.start', () {
    late List<Map<String, Object?>> bodies;
    EmailSignupService service(String status) {
      bodies = [];
      final client = MockClient((request) async {
        expect(request.url.path, '/rest/v1/rpc/auth_email_signup_start');
        bodies.add(jsonDecode(request.body) as Map<String, Object?>);
        return http.Response(jsonEncode(status), 200);
      });
      return EmailSignupService(
        AdminService(config, client: client, environment: env),
        env,
      );
    }

    test('ok lets the app send the code', () async {
      expect(await service('ok').start('a@picket.vn', '1.2.3.4'), {'ok': true});
      final body = bodies.single;
      expect(body['p_email'], 'a@picket.vn');
      // Limiter keys are hashed: neither the address nor the IP is stored.
      expect(body['p_email_key'], isNot(contains('picket')));
      expect(body['p_client_key'], isNot(contains('1.2.3.4')));
      expect((body['p_email_key']! as String).length, 32);
    });

    test('a taken address is a 409', () {
      expect(
        service('email_taken').start('a@picket.vn', 'c'),
        throwsA(
          isA<GatewayException>().having((e) => e.statusCode, 'status', 409),
        ),
      );
    });

    test('limits and disabled email sign-up map to 429 and 403', () async {
      await expectLater(
        service('rate_limited').start('a@picket.vn', 'c'),
        throwsA(
          isA<GatewayException>().having((e) => e.statusCode, 'status', 429),
        ),
      );
      await expectLater(
        service('email_disabled').start('a@picket.vn', 'c'),
        throwsA(
          isA<GatewayException>().having((e) => e.statusCode, 'status', 403),
        ),
      );
    });

    test('an unknown status is a 502', () {
      expect(
        service('???').start('a@picket.vn', 'c'),
        throwsA(
          isA<GatewayException>().having((e) => e.statusCode, 'status', 502),
        ),
      );
    });
  });
}
