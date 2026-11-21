import 'dart:async';
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

/// Behaves like `IOClient` after `close()`: requests still in flight fail.
class ClosingClient extends http.BaseClient {
  ClosingClient(this._inner, this._answered);
  final http.Client _inner;
  final void Function(String path) _answered;
  bool closed = false;

  @override
  Future<http.StreamedResponse> send(http.BaseRequest request) async {
    if (closed) throw http.ClientException('Client is already closed.');
    final response = await _inner.send(request);
    if (closed) throw http.ClientException('Connection closed.');
    _answered(request.url.path);
    return response;
  }

  @override
  void close() => closed = true;
}

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
    final starts = <Map<String, Object?>>[];

    PhoneSignupService service({
      bool smsEnabled = true,
      bool allowed = true,
      bool quota = true,
      Object? owner,
      int tokenStatus = 200,
    }) {
      calls = [];
      created = {};
      starts.clear();
      final client = MockClient((request) async {
        final path = request.url.path;
        calls.add(path);
        switch (path) {
          case '/rest/v1/rpc/auth_phone_signup_start':
            starts.add(jsonDecode(request.body) as Map<String, Object?>);
            final status = !smsEnabled
                ? 'sms_disabled'
                : !allowed
                ? 'rate_limited'
                : owner != null
                ? 'phone_taken'
                : !quota
                ? 'quota_reached'
                : 'ok';
            return http.Response(jsonEncode(status), 200);
          case '/rest/v1/rpc/auth_phone_signup_verified_gate':
            final args = jsonDecode(request.body) as Map<String, Object?>;
            expect(args['p_uid'], 'firebase-uid');
            expect(args['p_auth_time'], nowSeconds - 30);
            return http.Response(
              jsonEncode({
                'status': args['p_password_ok'] == false
                    ? 'weak_password'
                    : 'ok',
              }),
              200,
            );
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
        backgroundClient: () => client,
      );
    }

    test('start checks switch, limits, ownership and daily cap', () async {
      expect(await service().start('+84912345678', '1.2.3.4'), {'ok': true});
      // One round trip, hashed keys only.
      expect(calls, ['/rest/v1/rpc/auth_phone_signup_start']);
      expect(starts.single['p_purpose'], 'signup');
      expect(starts.single['p_phone_key'], matches(RegExp(r'^[a-f0-9]{32}$')));
      expect(starts.single['p_client_key'], isNot(contains('1.2.3.4')));
      expect(
        starts.single['p_reservation'],
        matches(RegExp(r'^[a-f0-9]{64}$')),
      );
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
      // Firebase cleanup is fire-and-forget; let it run.
      await Future<void>.delayed(const Duration(milliseconds: 20));
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
      String gateStatus = 'ok',
      bool reserved = true,
      bool freshProof = true,
      Object? pending,
      Object? recoveryTarget = 'user-9',
      bool createTimesOut = false,
      bool claimFails = false,
    }) {
      calls = [];
      final client = MockClient((request) async {
        final path = request.url.path;
        calls.add(path);
        final status = !reserved
            ? 'no_reservation'
            : gateStatus == 'ok' && !freshProof
            ? 'proof_used'
            : gateStatus;
        final answers = <String, Object?>{
          '/rest/v1/rpc/auth_phone_signup_verified_gate': {
            'status': status,
            'pending': pending,
          },
          '/rest/v1/rpc/auth_phone_reset_verified_gate': {
            'status': status == 'ok' && recoveryTarget == null
                ? 'no_account'
                : status,
            'target': recoveryTarget,
          },
          '/rest/v1/rpc/contact_claim_verified_phone': <String, Object>{},
          '/auth/v1/token': {'access_token': 'at', 'refresh_token': 'rt'},
          // Used only by the cleanup after a lost create response.
          '/rest/v1/rpc/auth_pending_phone_signup': pending,
          '/v1/accounts:delete': <String, Object>{},
          '/auth/v1/admin/users/user-1': <String, Object>{},
          '/auth/v1/admin/users/user-9': <String, Object>{},
          '/auth/v1/admin/users/orphan': <String, Object>{},
        };
        if (path == '/auth/v1/admin/users') {
          if (createTimesOut) throw http.ClientException('timeout');
          return http.Response('{"id":"user-1"}', 200);
        }
        if (path == '/rest/v1/rpc/contact_claim_verified_phone' && claimFails) {
          return http.Response('{"code":"23505"}', 409);
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
        backgroundClient: () => client,
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

    test('gate statuses map to the same HTTP errors', () async {
      for (final entry in {
        'sms_disabled': 403,
        'rate_limited': 429,
        'phone_taken': 409,
        'no_reservation': 403,
      }.entries) {
        await expectLater(
          complete(build(gateStatus: entry.key)),
          status(entry.value),
        );
        expect(calls.contains('/auth/v1/admin/users'), false);
      }
      await expectLater(
        complete(build(gateStatus: 'weak_password')),
        throwsFormatException,
      );
    });

    test('a pending half-created account is deleted before sign-up', () async {
      await complete(build(pending: 'orphan'));
      expect(calls, contains('/auth/v1/admin/users/orphan'));
    });

    test('a bad token touches nothing, so the reservation survives', () async {
      for (final (idToken, phone) in [
        ('not-a-token', '+84912345678'),
        (token(key: otherKey), '+84912345678'),
        // A valid proof for another number.
        (token(), '+84900000000'),
      ]) {
        await expectLater(
          build().complete(
            phone: phone,
            idToken: idToken,
            password: 'Str0ng!Passw0rd',
            client: 'ip',
          ),
          status(401),
        );
        expect(calls, isEmpty);
        await expectLater(
          build().reset(
            phone: phone,
            idToken: idToken,
            password: 'Str0ng!Passw0rd',
            client: 'ip',
          ),
          status(401),
        );
        expect(calls, isEmpty);
      }
    });

    test('a replayed proof is rejected for recovery too', () async {
      await expectLater(
        build(freshProof: false).reset(
          phone: '+84912345678',
          idToken: token(),
          password: 'Str0ng!Passw0rd',
          client: 'ip',
        ),
        status(401),
      );
      expect(calls.contains('/auth/v1/admin/users/user-9'), false);
    });

    test(
      'a failed phone claim deletes the account before any sign-in',
      () async {
        await expectLater(complete(build(claimFails: true)), status(409));
        // Signing in would set last_sign_in_at and hide a leftover account
        // from the pending cleanup.
        expect(calls.contains('/auth/v1/token'), false);
        expect(calls, contains('/auth/v1/admin/users/user-1'));
      },
    );

    test('the token is verified before the gate runs', () async {
      final order = <String>[];
      final client = MockClient((request) async {
        order.add(request.url.path);
        return http.Response('{"status":"rate_limited"}', 200);
      });
      final concurrent = PhoneSignupService(
        config,
        AdminService(config, client: client, environment: env),
        env,
        verifier: FirebasePhoneTokenVerifier(
          projectId: projectId,
          keys: (kid) async {
            order.add('keys');
            return publicKey;
          },
          now: () => now,
        ),
        client: client,
        backgroundClient: () => client,
      );
      await expectLater(complete(concurrent), status(429));
      expect(order, ['keys', '/rest/v1/rpc/auth_phone_signup_verified_gate']);
    });

    test('the Firebase user delete does not delay the response', () async {
      final delete = Completer<http.Response>();
      final client = MockClient((request) async {
        final path = request.url.path;
        if (path == '/v1/accounts:delete') return delete.future;
        if (path.endsWith('verified_gate')) {
          return http.Response('{"status":"ok"}', 200);
        }
        if (path == '/auth/v1/admin/users') {
          return http.Response('{"id":"user-1"}', 200);
        }
        if (path == '/auth/v1/token') {
          return http.Response(
            '{"access_token":"at","refresh_token":"rt"}',
            200,
          );
        }
        return http.Response('{}', 200);
      });
      final s = PhoneSignupService(
        config,
        AdminService(config, client: client, environment: env),
        env,
        verifier: verifier(),
        client: client,
        backgroundClient: () => client,
      );
      final session = await complete(s).timeout(const Duration(seconds: 2));
      expect(session, isA<Map<String, dynamic>>());
      delete.complete(http.Response('{}', 500));
      await Future<void>.delayed(const Duration(milliseconds: 20));
    });

    test(
      'the Firebase user delete survives the route closing its client',
      () async {
        {
          final release = Completer<void>();
          final deleted = <String>[];
          Future<http.Response> handle(http.Request request) async {
            final path = request.url.path;
            if (path == '/v1/accounts:delete') {
              await release.future;
              return http.Response('{}', 200);
            }
            if (path.endsWith('verified_gate')) {
              return http.Response('{"status":"ok"}', 200);
            }
            if (path == '/auth/v1/admin/users') {
              return http.Response('{"id":"user-1"}', 200);
            }
            if (path == '/auth/v1/token') {
              return http.Response(
                '{"access_token":"at","refresh_token":"rt"}',
                200,
              );
            }
            return http.Response('{}', 200);
          }

          final requestClient = ClosingClient(MockClient(handle), deleted.add);
          final background = <ClosingClient>[];
          final s = PhoneSignupService(
            config,
            AdminService(config, client: requestClient, environment: env),
            env,
            verifier: verifier(),
            client: requestClient,
            backgroundClient: () {
              final c = ClosingClient(MockClient(handle), deleted.add);
              background.add(c);
              return c;
            },
          );
          await complete(s);
          // What the route does in `finally` as soon as the response is built.
          s.close();
          release.complete();
          await Future<void>.delayed(const Duration(milliseconds: 20));
          expect(deleted, contains('/v1/accounts:delete'));
          expect(background.single.closed, true);
        }
      },
    );

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

  test(
    'a Firebase user delete reports failures instead of hiding them',
    () async {
      Future<String?> run(http.Response Function() answer) =>
          deleteFirebaseUser(
            MockClient((_) async => answer()),
            'web-key',
            'id-token',
          );
      expect(await run(() => http.Response('{}', 200)), isNull);
      expect(
        await run(
          () => http.Response('{"error":{"message":"USER_NOT_FOUND"}}', 400),
        ),
        isNull,
      );
      expect(await run(() => http.Response('{}', 500)), 'HTTP 500');
      expect(
        await run(() => throw http.ClientException('down, key=web-key')),
        isNot(contains('web-key')),
      );
      expect(
        await deleteFirebaseUser(
          MockClient((_) async => fail('no call')),
          '',
          't',
        ),
        isNotNull,
      );
    },
  );

  test('password rule matches the clients', () {
    expect(strongPassword('Str0ng!Passw0rd'), true);
    expect(strongPassword('alllowercase1!'), false);
    expect(strongPassword('NoDigits!!Here'), false);
    expect(strongPassword('NoSymbol1Here'), false);
    expect(strongPassword('Sh0rt!'), false);
  });
}
