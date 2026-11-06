import 'dart:convert';
import 'dart:math';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:picket_api/src/admin_service.dart';
import 'package:picket_api/src/api_config.dart';
import 'package:picket_api/src/otp/otp_service.dart';
import 'package:picket_api/src/otp/sms_provider.dart';
import 'package:picket_api/src/phone_login.dart';
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

class FakeSms implements SmsProvider {
  final sent = <String>[];
  @override
  String get id => 'fake';
  @override
  Future<void> send(String phoneE164, String message) async =>
      sent.add('$phoneE164|$message');
}

void main() {
  group('phone password sign-in', () {
    late List<String> calls;
    PhoneLoginService service({
      Object? lookup = const {'userId': 'u1', 'email': 'a@example.test'},
      bool allowed = true,
      int tokenStatus = 200,
    }) {
      calls = [];
      final client = MockClient((request) async {
        calls.add(request.url.path);
        if (request.url.path == '/rest/v1/rpc/auth_rate_hit') {
          return http.Response(jsonEncode(allowed), 200);
        }
        if (request.url.path == '/rest/v1/rpc/auth_phone_lookup') {
          return http.Response(jsonEncode(lookup), 200);
        }
        expect(request.url.path, '/auth/v1/token');
        expect(jsonDecode(request.body), {
          'email': 'a@example.test',
          'password': 'secret',
        });
        return http.Response(
          jsonEncode({
            'access_token': 'at',
            'refresh_token': 'rt',
            'expires_in': 3600,
            'token_type': 'bearer',
            'user': {'id': 'u1'},
          }),
          tokenStatus,
        );
      });
      return PhoneLoginService(
        config,
        AdminService(config, client: client, environment: env),
        env,
        client: client,
      );
    }

    test('resolves the phone and lets Supabase check the password', () async {
      final session = await service().login(
        '+84912345678',
        'secret',
        '1.2.3.4',
      );
      expect(session['access_token'], 'at');
      expect(session.containsKey('user'), false);
      expect(calls.last, '/auth/v1/token');
    });
    test('unknown phone and wrong password look the same', () async {
      await expectLater(
        service(lookup: <String, Object>{}).login('+84900000000', 'x', 'ip'),
        throwsA(
          isA<GatewayException>().having((e) => e.statusCode, 'status', 401),
        ),
      );
      expect(calls.contains('/auth/v1/token'), false);
      await expectLater(
        service(tokenStatus: 400).login('+84912345678', 'secret', 'ip'),
        throwsA(
          isA<GatewayException>().having((e) => e.statusCode, 'status', 401),
        ),
      );
    });
    test('rate limit stops before any account lookup', () async {
      await expectLater(
        service(allowed: false).login('+84912345678', 'secret', 'ip'),
        throwsA(
          isA<GatewayException>().having((e) => e.statusCode, 'status', 429),
        ),
      );
      expect(calls.contains('/rest/v1/rpc/auth_phone_lookup'), false);
    });
  });

  group('OTP channels', () {
    test('email only by default; SMS needs channel, provider and key', () {
      expect(OtpChannels(const {}).describe(), {
        'email': true,
        'sms': false,
        'order': ['email'],
      });
      expect(
        OtpChannels(const {'OTP_CHANNELS': 'sms,email'}).describe()['sms'],
        false,
      );
      expect(
        OtpChannels({
          ...env,
          'OTP_CHANNELS': 'sms,email',
        }, sms: FakeSms()).describe(),
        {
          'email': true,
          'sms': true,
          'order': ['sms', 'email'],
        },
      );
      expect(
        smsProviderFromEnvironment(const {'OTP_SMS_PROVIDER': 'speedsms'}),
        isNull,
      );
    });

    test('SMS verification refuses to run until a provider exists', () async {
      final otp = OtpService(
        OtpChannels(env),
        AdminService(
          config,
          client: MockClient((_) async => fail('no call')),
          environment: env,
        ),
      );
      await expectLater(
        otp.startPhoneVerification('u1', '+84912345678'),
        throwsA(
          isA<GatewayException>().having((e) => e.statusCode, 'status', 503),
        ),
      );
    });

    test('sends the code by SMS and stores only its hash', () async {
      final sms = FakeSms();
      Map<String, dynamic>? stored;
      final store = AdminService(
        config,
        environment: env,
        client: MockClient((request) async {
          if (request.url.path.endsWith('auth_rate_hit')) {
            return http.Response('true', 200);
          }
          stored = jsonDecode(request.body) as Map<String, dynamic>;
          return http.Response('{"id":"c1","expiresInSeconds":300}', 200);
        }),
      );
      final otp = OtpService(
        OtpChannels({...env, 'OTP_CHANNELS': 'sms,email'}, sms: sms),
        store,
        random: Random(7),
      );
      final challenge = await otp.startPhoneVerification('u1', '+84912345678');
      expect(challenge['id'], 'c1');
      final code = RegExp(r': (\d{6})').firstMatch(sms.sent.single)!.group(1)!;
      expect(stored!.values.join(), isNot(contains(code)));
      expect(
        stored!['p_code_hash'],
        otpHash(env['OTP_HMAC_KEY']!, 'verify_phone|+84912345678|$code'),
      );
    });
  });
}
