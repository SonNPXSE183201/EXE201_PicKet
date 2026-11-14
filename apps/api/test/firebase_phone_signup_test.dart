import 'dart:convert';
import 'dart:math';
import 'dart:typed_data';
import 'package:dart_jsonwebtoken/dart_jsonwebtoken.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:picket_api/src/admin_service.dart';
import 'package:picket_api/src/api_config.dart';
import 'package:picket_api/src/firebase/firebase_phone_token.dart';
import 'package:picket_api/src/phone_signup.dart';
import 'package:picket_api/src/supabase_gateway.dart';
import 'package:pointycastle/export.dart' as pc;
import 'package:test/test.dart';

const projectId = 'picket-test';
final now = DateTime.utc(2026, 11, 14, 12);
final nowSeconds = now.millisecondsSinceEpoch ~/ 1000;
final config = ApiConfig(
  supabaseUrl: Uri.parse('https://project.supabase.co'),
  supabasePublishableKey: 'public-key',
);
const env = {
  'SUPABASE_SECRET_KEY': 'sb_secret_public_test_fixture_only',
  'OTP_HMAC_KEY': 'otp-test-key-that-is-long-enough-123456',
  'FIREBASE_PROJECT_ID': projectId,
  'FIREBASE_WEB_API_KEY': 'web-key',
};

late RSAPrivateKey signingKey;
late RSAPublicKey publicKey;
late RSAPrivateKey otherKey;

(RSAPrivateKey, RSAPublicKey) generateKeys(int seed) {
  final random = pc.FortunaRandom()
    ..seed(
      pc.KeyParameter(
        Uint8List.fromList(List.generate(32, (i) => Random(seed).nextInt(256))),
      ),
    );
  final generator = pc.RSAKeyGenerator()
    ..init(
      pc.ParametersWithRandom(
        pc.RSAKeyGeneratorParameters(BigInt.from(65537), 2048, 64),
        random,
      ),
    );
  final pair = generator.generateKeyPair();
  return (
    RSAPrivateKey.raw(pair.privateKey),
    RSAPublicKey.raw(pair.publicKey),
  );
}

String token({
  Map<String, Object?> overrides = const {},
  RSAPrivateKey? key,
  String kid = 'k1',
}) {
  final payload = <String, Object?>{
    'iss': 'https://securetoken.google.com/$projectId',
    'aud': projectId,
    'sub': 'firebase-uid',
    'iat': nowSeconds - 30,
    'exp': nowSeconds + 3300,
    'auth_time': nowSeconds - 30,
    'phone_number': '+84912345678',
    'firebase': {'sign_in_provider': 'phone'},
    ...overrides,
  }..removeWhere((_, value) => value == null);
  return JWT(payload, header: {'kid': kid}).sign(
    key ?? signingKey,
    algorithm: JWTAlgorithm.RS256,
    noIssueAt: true,
  );
}

FirebasePhoneTokenVerifier verifier() => FirebasePhoneTokenVerifier(
  projectId: projectId,
  keys: (kid) async => kid == 'k1' ? publicKey : null,
  now: () => now,
);

Matcher status(int code) => throwsA(
  isA<GatewayException>().having((e) => e.statusCode, 'status', code),
);

void main() {
  setUpAll(() {
    final first = generateKeys(1);
    signingKey = first.$1;
    publicKey = first.$2;
    otherKey = generateKeys(2).$1;
  });

  group('Firebase phone ID token', () {
    test('accepts a fresh phone sign-in token', () async {
      final proof = await verifier().verify(token());
      expect(proof.phone, '+84912345678');
      expect(proof.uid, 'firebase-uid');
    });

    test('rejects forged, foreign or stale tokens', () async {
      final bad = <String>[
        token(key: otherKey),
        token(kid: 'unknown'),
        token(overrides: {'aud': 'other-project'}),
        token(overrides: {'iss': 'https://securetoken.google.com/other'}),
        token(overrides: {'exp': nowSeconds - 120}),
        token(overrides: {'iat': nowSeconds + 600}),
        token(overrides: {'auth_time': nowSeconds - 3600}),
        token(overrides: {'sub': ''}),
        token(overrides: {'phone_number': null}),
        token(
          overrides: {
            'firebase': {'sign_in_provider': 'password'},
          },
        ),
        JWT({'aud': projectId}, header: {'kid': 'k1'}).sign(SecretKey('x')),
        'not-a-token',
      ];
      for (final value in bad) {
        await expectLater(verifier().verify(value), status(401), reason: value);
      }
    });

    test('without a project id the feature is unavailable', () async {
      final unconfigured = FirebasePhoneTokenVerifier(
        projectId: '',
        keys: (_) async => publicKey,
        now: () => now,
      );
      await expectLater(unconfigured.verify(token()), status(503));
    });
  });

  group('SMS sign-up', () {
    late List<String> calls;
    late Map<String, Object?> created;

    PhoneSignupService service({
      bool smsEnabled = true,
      bool allowed = true,
      bool quota = true,
      Object? owner,
      int tokenStatus = 200,
    }) {
      calls = [];
      created = {};
      final client = MockClient((request) async {
        final path = request.url.path;
        calls.add(path);
        switch (path) {
          case '/rest/v1/rpc/auth_verification_public':
            return http.Response(
              jsonEncode({'email': true, 'sms': smsEnabled}),
              200,
            );
          case '/rest/v1/rpc/auth_rate_hit':
            return http.Response(jsonEncode(allowed), 200);
          case '/rest/v1/rpc/auth_sms_quota_hit':
            return http.Response(jsonEncode(quota), 200);
          case '/rest/v1/rpc/auth_phone_owner':
            return http.Response(jsonEncode(owner), 200);
          case '/rest/v1/rpc/auth_phone_signup_reserve':
            return http.Response('true', 200);
          case '/rest/v1/rpc/auth_phone_signup_consume':
            return http.Response('true', 200);
          case '/rest/v1/rpc/auth_firebase_proof_use':
            return http.Response('true', 200);
          case '/rest/v1/rpc/auth_pending_phone_signup':
            return http.Response('null', 200);
          case '/rest/v1/rpc/auth_phone_recovery_target':
            return http.Response('null', 200);
          case '/rest/v1/rpc/contact_claim_verified_phone':
            return http.Response('{"verified_via":"firebase"}', 200);
          case '/auth/v1/admin/users':
            created = jsonDecode(request.body) as Map<String, Object?>;
            return http.Response('{"id":"user-1"}', 200);
          case '/auth/v1/admin/users/user-1':
            return http.Response('{}', 200);
          case '/auth/v1/token':
            expect(jsonDecode(request.body), {
              'phone': '84912345678',
              'password': 'Str0ng!Passw0rd',
            });
            return http.Response(
              jsonEncode({
                'access_token': 'at',
                'refresh_token': 'rt',
                'expires_in': 3600,
                'token_type': 'bearer',
              }),
              tokenStatus,
            );
          case '/v1/accounts:delete':
            expect(request.url.queryParameters['key'], 'web-key');
            return http.Response('{}', 200);
        }
        fail('Unexpected call $path');
      });
      return PhoneSignupService(
        config,
        AdminService(config, client: client, environment: env),
        env,
        verifier: verifier(),
        client: client,
      );
    }

    test('start checks switch, limits, ownership and daily cap', () async {
      expect(await service().start('+84912345678', '1.2.3.4'), {'ok': true});
      await expectLater(
        service(smsEnabled: false).start('+84912345678', 'ip'),
        status(403),
      );
      await expectLater(
        service(allowed: false).start('+84912345678', 'ip'),
        status(429),
      );
      await expectLater(
        service(owner: 'someone').start('+84912345678', 'ip'),
        status(409),
      );
      await expectLater(
        service(quota: false).start('+84912345678', 'ip'),
        status(429),
      );
    });

    test('complete creates a phone-confirmed account and signs in', () async {
      final session = await service().complete(
        phone: '+84912345678',
        idToken: token(),
        password: 'Str0ng!Passw0rd',
        client: 'ip',
      );
      expect(session['access_token'], 'at');
      expect(created['phone'], '84912345678');
      expect(created['phone_confirm'], true);
      expect(created['app_metadata'], {'signup_via': 'firebase_sms'});
      expect(calls, contains('/rest/v1/rpc/contact_claim_verified_phone'));
      expect(calls.last, '/v1/accounts:delete');
    });

    test('complete rejects weak passwords and mismatched phones', () async {
      await expectLater(
        service().complete(
          phone: '+84912345678',
          idToken: token(),
          password: 'short',
          client: 'ip',
        ),
        throwsFormatException,
      );
      await expectLater(
        service().complete(
          phone: '+84900000000',
          idToken: token(),
          password: 'Str0ng!Passw0rd',
          client: 'ip',
        ),
        status(401),
      );
      expect(calls.contains('/auth/v1/admin/users'), false);
    });

    test('a failed sign-in removes the half-created account', () async {
      await expectLater(
        service(tokenStatus: 400).complete(
          phone: '+84912345678',
          idToken: token(),
          password: 'Str0ng!Passw0rd',
          client: 'ip',
        ),
        status(502),
      );
      expect(calls, contains('/auth/v1/admin/users/user-1'));
    });
  });

  group('SMS sign-up hardening', () {
    late List<String> calls;
    PhoneSignupService build({
      bool reserved = true,
      bool freshProof = true,
      Object? pending,
      Object? recoveryTarget = 'user-9',
      bool createTimesOut = false,
    }) {
      calls = [];
      final client = MockClient((request) async {
        final path = request.url.path;
        calls.add(path);
        final answers = <String, Object?>{
          '/rest/v1/rpc/auth_verification_public': {'email': true, 'sms': true},
          '/rest/v1/rpc/auth_rate_hit': true,
          '/rest/v1/rpc/auth_phone_owner': null,
          '/rest/v1/rpc/auth_phone_signup_consume': reserved,
          '/rest/v1/rpc/auth_firebase_proof_use': freshProof,
          '/rest/v1/rpc/auth_pending_phone_signup': pending,
          '/rest/v1/rpc/auth_phone_recovery_target': recoveryTarget,
          '/v1/accounts:delete': <String, Object>{},
          '/auth/v1/admin/users/user-9': <String, Object>{},
          '/auth/v1/admin/users/orphan': <String, Object>{},
        };
        if (path == '/auth/v1/admin/users') {
          if (createTimesOut) throw http.ClientException('timeout');
          return http.Response('{"id":"user-1"}', 200);
        }
        if (answers.containsKey(path)) {
          return http.Response(jsonEncode(answers[path]), 200);
        }
        fail('Unexpected call $path');
      });
      return PhoneSignupService(
        config,
        AdminService(config, client: client, environment: env),
        env,
        verifier: verifier(),
        client: client,
      );
    }

    Future<Object> complete(PhoneSignupService s) => s.complete(
      phone: '+84912345678',
      idToken: token(),
      password: 'Str0ng!Passw0rd',
      client: 'ip',
    );

    test('complete requires the reservation made by start', () async {
      await expectLater(complete(build(reserved: false)), status(403));
      expect(calls.contains('/auth/v1/admin/users'), false);
    });

    test('a Firebase proof is accepted only once', () async {
      await expectLater(complete(build(freshProof: false)), status(401));
      expect(calls.contains('/auth/v1/admin/users'), false);
    });

    test('a lost create response cleans up the pending account', () async {
      final service = build(createTimesOut: true, pending: 'orphan');
      await expectLater(
        complete(service),
        throwsA(isA<http.ClientException>()),
      );
      expect(calls, contains('/auth/v1/admin/users/orphan'));
    });

    test('recovery sets a new password for the verified owner', () async {
      final service = build();
      expect(
        await service.reset(
          phone: '+84912345678',
          idToken: token(),
          password: 'Str0ng!Passw0rd',
          client: 'ip',
        ),
        {'ok': true},
      );
      expect(calls, contains('/auth/v1/admin/users/user-9'));
      await expectLater(
        build(recoveryTarget: null).reset(
          phone: '+84912345678',
          idToken: token(),
          password: 'Str0ng!Passw0rd',
          client: 'ip',
        ),
        status(404),
      );
    });
  });

  test('password rule matches the clients', () {
    expect(strongPassword('Str0ng!Passw0rd'), true);
    expect(strongPassword('alllowercase1!'), false);
    expect(strongPassword('NoDigits!!Here'), false);
    expect(strongPassword('NoSymbol1Here'), false);
    expect(strongPassword('Sh0rt!'), false);
  });
}
