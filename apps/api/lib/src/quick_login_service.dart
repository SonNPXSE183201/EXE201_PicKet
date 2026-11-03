import 'dart:convert';
import 'dart:io';
import 'package:http/http.dart' as http;
import 'package:picket_api/src/admin_service.dart';
import 'package:picket_api/src/api_config.dart';
import 'package:picket_api/src/quick_login_crypto.dart';
import 'package:picket_api/src/supabase_gateway.dart';

class QuickLoginService {
  QuickLoginService({
    Map<String, String>? environment,
    http.Client Function()? clientFactory,
  }) : env = environment ?? Platform.environment,
       _clientFactory = clientFactory ?? http.Client.new;
  final Map<String, String> env;
  final http.Client Function() _clientFactory;
  Future<http.Response> _authRequest(
    Uri uri,
    Map<String, String> headers, {
    Map<String, dynamic>? body,
  }) async {
    final client = _clientFactory();
    try {
      final request = http.Request(body == null ? 'GET' : 'POST', uri)
        ..headers.addAll(headers);
      if (body != null) request.body = jsonEncode(body);
      return await http.Response.fromStream(
        await client.send(request).timeout(const Duration(seconds: 15)),
      );
    } finally {
      client.close();
    }
  }

  QuickLoginCrypto get crypto {
    if (env['QUICK_LOGIN_ENABLED'] != 'true') {
      throw const GatewayException(503, 'Quick login is not enabled.');
    }
    try {
      return QuickLoginCrypto(
        base64Decode(env['QUICK_LOGIN_ENCRYPTION_KEY'] ?? ''),
      );
    } on FormatException {
      throw const GatewayException(503, 'Quick login is not configured.');
    }
  }

  Future<Map<String, dynamic>> _user(String token) async {
    final config = ApiConfig.fromEnvironment(env);
    final response = await _authRequest(
      config.supabaseUrl.resolve('/auth/v1/user'),
      {
        'apikey': config.supabasePublishableKey,
        'authorization': 'Bearer $token',
      },
    );
    if (response.statusCode != 200) {
      throw const GatewayException(401, 'Sign in again.');
    }
    return jsonDecode(response.body) as Map<String, dynamic>;
  }

  String _session(String token) {
    final parts = token.split('.');
    final claims =
        jsonDecode(utf8.decode(base64Url.decode(base64Url.normalize(parts[1]))))
            as Map;
    final id = claims['session_id'];
    if (id is! String) throw const GatewayException(401, 'Sign in again.');
    return id;
  }

  Future<Map<String, dynamic>> save(
    String token,
    String refresh,
    String pin,
  ) async {
    final cipher = crypto;
    final user = await _user(token);
    final signedIn = DateTime.tryParse(
      user['last_sign_in_at']?.toString() ?? '',
    );
    if (signedIn == null ||
        DateTime.now().toUtc().difference(signedIn).inMinutes > 10) {
      throw const GatewayException(
        401,
        'Sign in with your password before enabling PIN.',
      );
    }
    final device = QuickLoginCrypto.newDeviceToken();
    final hash = QuickLoginCrypto.deviceHash(device);
    final store = AdminService(
      ApiConfig.fromEnvironment(env),
      environment: env,
      client: _clientFactory(),
    );
    try {
      await store.quickLoginRpc('quick_login_save', {
        'p_user': user['id'],
        'p_session': _session(token),
        'p_device': hash,
        'p_verifier': cipher.verifier(pin, hash),
        'p_cipher': await cipher.encrypt(refresh, hash),
      });
      return {'deviceToken': device};
    } finally {
      store.close();
    }
  }

  Future<Map<String, dynamic>> unlock(String device, String pin) async {
    final cipher = crypto;
    final hash = QuickLoginCrypto.deviceHash(device);
    final verifier = cipher.verifier(pin, hash);
    final config = ApiConfig.fromEnvironment(env);
    final store = AdminService(
      config,
      environment: env,
      client: _clientFactory(),
    );
    try {
      final row = await store.quickLoginRpc('quick_login_attempt', {
        'p_device': hash,
      });
      if (row['allowed'] != true) {
        throw const GatewayException(
          429,
          'PIN unavailable. Sign in with your password or try later.',
        );
      }
      var difference = 0;
      final expected = row['verifier'] as String;
      for (var i = 0; i < expected.length; i++) {
        difference |= expected.codeUnitAt(i) ^ verifier.codeUnitAt(i);
      }
      if (difference != 0) {
        await store.quickLoginRpc('quick_login_finish', {
          'p_device': hash,
          'p_lease': row['lease'],
          'p_cipher': null,
        });
        throw const GatewayException(401, 'PIN incorrect.');
      }
      final refresh = await cipher.decrypt(row['cipher'] as String, hash);
      final response = await _authRequest(
        config.supabaseUrl
            .resolve('/auth/v1/token')
            .replace(queryParameters: {'grant_type': 'refresh_token'}),
        {
          'apikey': config.supabasePublishableKey,
          'content-type': 'application/json',
        },
        body: {'refresh_token': refresh},
      );
      if (response.statusCode != 200) {
        throw const GatewayException(401, 'Sign in with your password.');
      }
      final session = jsonDecode(response.body) as Map<String, dynamic>;
      if ((session['user'] as Map?)?['id'] != row['userId'] ||
          _session(session['access_token'] as String) != row['sessionId']) {
        throw const GatewayException(401, 'Sign in with your password.');
      }
      final finished = await store.quickLoginRpc('quick_login_finish', {
        'p_device': hash,
        'p_lease': row['lease'],
        'p_cipher': await cipher.encrypt(
          session['refresh_token'] as String,
          hash,
        ),
      });
      if (finished['updated'] != true) {
        throw const GatewayException(401, 'Sign in with your password.');
      }
      return {
        'accessToken': session['access_token'],
        'refreshToken': session['refresh_token'],
      };
    } finally {
      store.close();
    }
  }

  Future<void> revoke(String device) async {
    final store = AdminService(
      ApiConfig.fromEnvironment(env),
      environment: env,
      client: _clientFactory(),
    );
    try {
      await store.quickLoginRpc('quick_login_revoke', {
        'p_device': QuickLoginCrypto.deviceHash(device),
      });
    } finally {
      store.close();
    }
  }

  Future<Map<String, dynamic>> lock(
    String token,
    String device,
    String refresh,
  ) async {
    final cipher = crypto;
    final user = await _user(token);
    final hash = QuickLoginCrypto.deviceHash(device);
    final store = AdminService(
      ApiConfig.fromEnvironment(env),
      environment: env,
      client: _clientFactory(),
    );
    try {
      final result = await store.quickLoginRpc('quick_login_lock', {
        'p_device': hash,
        'p_user': user['id'],
        'p_session': _session(token),
        'p_cipher': await cipher.encrypt(refresh, hash),
      });
      if (result['updated'] != true) {
        throw const GatewayException(
          401,
          'Enable PIN again after signing in with your password.',
        );
      }
      return {'locked': true};
    } finally {
      store.close();
    }
  }
}
