import 'package:picket_api/src/api_config.dart';
import 'package:picket_api/src/finance_contract.dart';
import 'package:test/test.dart';

void main() {
  test('accepts a public Supabase configuration', () {
    final config = ApiConfig.fromEnvironment({
      'SUPABASE_URL': 'https://example.supabase.co',
      'SUPABASE_PUBLISHABLE_KEY': 'sb_publishable_example',
    });
    expect(config.supabaseUrl.host, 'example.supabase.co');
  });

  test('rejects secret keys and invalid save requests', () {
    expect(
      () => ApiConfig.fromEnvironment({
        'SUPABASE_URL': 'https://example.supabase.co',
        'SUPABASE_PUBLISHABLE_KEY': 'sb_secret_example',
      }),
      throwsA(isA<ApiConfigException>()),
    );
    expect(
      () => SaveSnapshotRequest.fromJson({
        'expectedRevision': -1,
        'payload': <String, dynamic>{},
      }),
      throwsFormatException,
    );
  });

  test('rejects a legacy service-role JWT in the public API', () {
    const serviceRoleJwt =
        'eyJhbGciOiJIUzI1NiJ9.'
        'eyJyb2xlIjoic2VydmljZV9yb2xlIn0.'
        'signature';
    expect(
      () => ApiConfig.fromEnvironment({
        'SUPABASE_URL': 'https://example.supabase.co',
        'SUPABASE_PUBLISHABLE_KEY': serviceRoleJwt,
      }),
      throwsA(isA<ApiConfigException>()),
    );
  });

  test('production requires HTTPS Supabase and explicit HTTPS CORS', () {
    expect(
      () => ApiConfig.fromEnvironment({
        'APP_ENV': 'production',
        'SUPABASE_URL': 'http://127.0.0.1:54321',
        'SUPABASE_PUBLISHABLE_KEY': 'sb_publishable_example',
      }),
      throwsA(isA<ApiConfigException>()),
    );
    expect(
      () => CorsConfig.fromEnvironment({'APP_ENV': 'production'}),
      throwsA(isA<ApiConfigException>()),
    );
    expect(
      () => CorsConfig.fromEnvironment({
        'APP_ENV': 'production',
        'ALLOWED_ORIGINS': 'http://localhost:3000',
      }),
      throwsA(isA<ApiConfigException>()),
    );
    final cors = CorsConfig.fromEnvironment({
      'APP_ENV': 'production',
      'ALLOWED_ORIGINS': 'https://app.picket.vn',
    });
    expect(cors.allowOrigin('https://app.picket.vn'), isNotNull);
  });

  test('only reflects allow-listed CORS origins', () {
    final cors = CorsConfig.fromEnvironment({
      'ALLOWED_ORIGINS': 'https://picket.vn,http://localhost:3000',
    });
    expect(cors.allowOrigin('https://picket.vn'), 'https://picket.vn');
    expect(cors.allowOrigin('https://attacker.invalid'), isNull);
  });

  test('allows both local web clients by default', () {
    final cors = CorsConfig.fromEnvironment({});
    expect(cors.allowOrigin('http://localhost:3000'), isNotNull);
    expect(cors.allowOrigin('http://localhost:8081'), isNotNull);
  });
}
