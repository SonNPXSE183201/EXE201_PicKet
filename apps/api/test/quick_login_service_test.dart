import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:picket_api/src/quick_login_crypto.dart';
import 'package:picket_api/src/quick_login_service.dart';
import 'package:picket_api/src/supabase_gateway.dart';
import 'package:test/test.dart';

void main() {
  final key = List<int>.filled(32, 7);
  final cipher = QuickLoginCrypto(List<int>.filled(32, 7));
  final env = {
    'APP_ENV': 'development',
    'SUPABASE_URL': 'https://project.supabase.co',
    'SUPABASE_PUBLISHABLE_KEY': 'sb_publishable_fixture',
    'SUPABASE_SECRET_KEY': 'sb_secret_public_test_fixture_only',
    'QUICK_LOGIN_ENABLED': 'true',
    'QUICK_LOGIN_ENCRYPTION_KEY': base64Encode(key),
  };
  String jwt(String session) {
    final claims = base64UrlEncode(
      utf8.encode(jsonEncode({'session_id': session})),
    );
    return 'fixture.$claims.fixture';
  }

  http.Response reply(Object data) => http.Response(jsonEncode(data), 200);
  test(
    'enrollment stores browser-bound verifier and encrypted refresh',
    () async {
      var saved = <String, dynamic>{};
      final service = QuickLoginService(
        environment: env,
        clientFactory: () => MockClient((request) async {
          if (request.url.path == '/auth/v1/user') {
            return reply({
              'id': 'user',
              'last_sign_in_at': DateTime.now().toUtc().toIso8601String(),
            });
          }
          expect(request.url.path, '/rest/v1/rpc/quick_login_save');
          saved = jsonDecode(request.body) as Map<String, dynamic>;
          return reply({'saved': true});
        }),
      );
      final result = await service.save(
        jwt('session'),
        'refresh-private',
        '123456',
      );
      expect((result['deviceToken'] as String).length, 44);
      final hash = QuickLoginCrypto.deviceHash(result['deviceToken'] as String);
      expect(saved['p_device'], hash);
      expect(saved['p_session'], 'session');
      expect(saved['p_verifier'], cipher.verifier('123456', hash));
      expect(
        await cipher.decrypt(saved['p_cipher'] as String, hash),
        'refresh-private',
      );
      expect(jsonEncode(saved), isNot(contains('refresh-private')));
    },
  );
  test('old interactive login cannot enroll a PIN', () async {
    final service = QuickLoginService(
      environment: env,
      clientFactory: () => MockClient((request) async {
        expect(request.url.path, '/auth/v1/user');
        return reply({'id': 'user', 'last_sign_in_at': '2020-01-01T00:00:00Z'});
      }),
    );
    await expectLater(
      service.save(jwt('session'), 'refresh', '123456'),
      throwsA(isA<GatewayException>()),
    );
  });
  test('disabled PIN never contacts Auth', () async {
    final service = QuickLoginService(
      environment: {...env, 'QUICK_LOGIN_ENABLED': 'false'},
      clientFactory: () =>
          MockClient((_) async => throw StateError('no network')),
    );
    await expectLater(
      service.save(jwt('session'), 'refresh', '123456'),
      throwsA(isA<GatewayException>()),
    );
  });
  for (final correct in [true, false]) {
    test(
      'PIN check: ${correct ? 'unlock and rotate' : 'consume failed attempt'}',
      () async {
        final device = QuickLoginCrypto.newDeviceToken();
        final actualHash = QuickLoginCrypto.deviceHash(device);
        var authCalls = 0;
        var finished = false;
        final encrypted = await cipher.encrypt('old-refresh', actualHash);
        final service = QuickLoginService(
          environment: env,
          clientFactory: () => MockClient((request) async {
            if (request.url.path.endsWith('quick_login_attempt')) {
              return reply({
                'allowed': true,
                'verifier': cipher.verifier('123456', actualHash),
                'cipher': encrypted,
                'lease': 'lease',
                'userId': 'user',
                'sessionId': 'session',
              });
            }
            if (request.url.path == '/auth/v1/token') {
              authCalls++;
              expect(
                (jsonDecode(request.body) as Map)['refresh_token'],
                'old-refresh',
              );
              return reply({
                'user': {'id': 'user'},
                'access_token': jwt('session'),
                'refresh_token': 'rotated-refresh',
              });
            }
            expect(request.url.path, '/rest/v1/rpc/quick_login_finish');
            finished = true;
            final body = jsonDecode(request.body) as Map;
            if (correct) {
              expect(
                await cipher.decrypt(body['p_cipher'] as String, actualHash),
                'rotated-refresh',
              );
            } else {
              expect(body['p_cipher'], null);
            }
            return reply({'updated': true});
          }),
        );
        if (correct) {
          expect(
            (await service.unlock(device, '123456'))['refreshToken'],
            'rotated-refresh',
          );
        } else {
          await expectLater(
            service.unlock(device, '654321'),
            throwsA(isA<GatewayException>()),
          );
        }
        expect(authCalls, correct ? 1 : 0);
        expect(finished, true);
      },
    );
  }
  test('rate-limited binding does not call refresh API', () async {
    final service = QuickLoginService(
      environment: env,
      clientFactory: () => MockClient((request) async {
        expect(request.url.path, '/rest/v1/rpc/quick_login_attempt');
        return reply({'allowed': false});
      }),
    );
    await expectLater(
      service.unlock(QuickLoginCrypto.newDeviceToken(), '123456'),
      throwsA(isA<GatewayException>()),
    );
  });
  test(
    'locking reuses binding and revocation hashes the browser token',
    () async {
      final device = QuickLoginCrypto.newDeviceToken();
      final calls = <String>[];
      final service = QuickLoginService(
        environment: env,
        clientFactory: () => MockClient((request) async {
          calls.add(request.url.path);
          if (request.url.path == '/auth/v1/user') return reply({'id': 'user'});
          expect(
            (jsonDecode(request.body) as Map)['p_device'],
            QuickLoginCrypto.deviceHash(device),
          );
          return reply({'updated': true});
        }),
      );
      expect(
        (await service.lock(jwt('session'), device, 'refresh'))['locked'],
        true,
      );
      await service.revoke(device);
      expect(calls.last, '/rest/v1/rpc/quick_login_revoke');
    },
  );
}
