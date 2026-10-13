import 'dart:convert';
import 'dart:io';

class ApiConfigException implements Exception {
  const ApiConfigException(this.message);
  final String message;

  @override
  String toString() => message;
}

class ApiConfig {
  ApiConfig({
    required this.supabaseUrl,
    required this.supabasePublishableKey,
  });

  factory ApiConfig.fromEnvironment([Map<String, String>? values]) {
    final environment = values ?? Platform.environment;
    final appEnvironment = _appEnvironment(environment);
    final rawUrl = environment['SUPABASE_URL']?.trim() ?? '';
    final key = environment['SUPABASE_PUBLISHABLE_KEY']?.trim() ?? '';
    final url = Uri.tryParse(rawUrl);
    final local = url?.host == 'localhost' || url?.host == '127.0.0.1';
    if (url == null ||
        !url.hasScheme ||
        url.host.isEmpty ||
        (url.scheme != 'https' &&
            !(appEnvironment != 'production' &&
                local &&
                url.scheme == 'http'))) {
      throw const ApiConfigException(
        'SUPABASE_URL must be HTTPS, except for local development.',
      );
    }
    final jwtPayload = _decodeJwtPayload(key);
    if (key.isEmpty ||
        key.contains('REPLACE_ME') ||
        key.startsWith('sb_secret_') ||
        jwtPayload?['role'] == 'service_role') {
      throw const ApiConfigException(
        'SUPABASE_PUBLISHABLE_KEY must be a client-safe publishable key.',
      );
    }
    return ApiConfig(supabaseUrl: url, supabasePublishableKey: key);
  }

  final Uri supabaseUrl;
  final String supabasePublishableKey;
}

class CorsConfig {
  CorsConfig(this.allowedOrigins);

  factory CorsConfig.fromEnvironment([Map<String, String>? values]) {
    final environment = values ?? Platform.environment;
    final appEnvironment = _appEnvironment(environment);
    final configuredOrigins = environment['ALLOWED_ORIGINS']?.trim();
    if (appEnvironment == 'production' &&
        (configuredOrigins == null || configuredOrigins.isEmpty)) {
      throw const ApiConfigException(
        'ALLOWED_ORIGINS is required in production.',
      );
    }
    final origins =
        (configuredOrigins ?? 'http://localhost:3000,http://localhost:8081')
            .split(',')
            .map((value) => value.trim())
            .where((value) => value.isNotEmpty)
            .toSet();
    for (final origin in origins) {
      final uri = Uri.tryParse(origin);
      final isOriginOnly =
          uri != null &&
          uri.hasScheme &&
          uri.host.isNotEmpty &&
          uri.path.isEmpty &&
          !uri.hasQuery &&
          !uri.hasFragment;
      if (!isOriginOnly || origin == '*') {
        throw ApiConfigException('Invalid CORS origin: $origin');
      }
      if (appEnvironment == 'production' && uri.scheme != 'https') {
        throw ApiConfigException(
          'Production CORS origins must use HTTPS: $origin',
        );
      }
    }
    return CorsConfig(origins);
  }

  final Set<String> allowedOrigins;

  String? allowOrigin(String? origin) =>
      origin != null && allowedOrigins.contains(origin) ? origin : null;
}

String _appEnvironment(Map<String, String> environment) {
  final value = environment['APP_ENV']?.trim().toLowerCase() ?? 'development';
  if (!{'development', 'test', 'production'}.contains(value)) {
    throw ApiConfigException('Unsupported APP_ENV: $value');
  }
  return value;
}

Map<String, dynamic>? _decodeJwtPayload(String value) {
  final parts = value.split('.');
  if (parts.length != 3) return null;
  try {
    final normalized = base64Url.normalize(parts[1]);
    final decoded = jsonDecode(utf8.decode(base64Url.decode(normalized)));
    return decoded is Map<String, dynamic> ? decoded : null;
  } on FormatException {
    return null;
  }
}
