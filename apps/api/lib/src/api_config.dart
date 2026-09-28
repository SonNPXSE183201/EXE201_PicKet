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
    final rawUrl = environment['SUPABASE_URL']?.trim() ?? '';
    final key = environment['SUPABASE_PUBLISHABLE_KEY']?.trim() ?? '';
    final url = Uri.tryParse(rawUrl);
    final local = url?.host == 'localhost' || url?.host == '127.0.0.1';
    if (url == null ||
        !url.hasScheme ||
        url.host.isEmpty ||
        (url.scheme != 'https' && !(local && url.scheme == 'http'))) {
      throw const ApiConfigException(
        'SUPABASE_URL must be HTTPS, except for local development.',
      );
    }
    if (key.isEmpty || key.startsWith('sb_secret_')) {
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
    final origins =
        (environment['ALLOWED_ORIGINS'] ??
                'http://localhost:3000,http://localhost:8081')
            .split(',')
            .map((value) => value.trim())
            .where((value) => value.isNotEmpty)
            .toSet();
    return CorsConfig(origins);
  }

  final Set<String> allowedOrigins;

  String? allowOrigin(String? origin) =>
      origin != null && allowedOrigins.contains(origin) ? origin : null;
}
