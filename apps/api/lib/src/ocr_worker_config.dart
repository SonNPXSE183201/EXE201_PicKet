import 'dart:convert';
import 'dart:io';

import 'package:picket_api/src/api_config.dart';

class OcrWorkerConfig {
  const OcrWorkerConfig({
    required this.supabaseUrl,
    required this.supabaseSecretKey,
    required this.providerUrl,
    required this.workerId,
    required this.pollInterval,
    this.providerToken,
  });

  factory OcrWorkerConfig.fromEnvironment([Map<String, String>? values]) {
    final environment = values ?? Platform.environment;
    final supabaseUrl = _secureUrl(
      environment['SUPABASE_URL'],
      'SUPABASE_URL',
    );
    final providerToken = environment['OCR_PROVIDER_TOKEN']?.trim();
    final allowPrivateHttp =
        environment['OCR_ALLOW_INSECURE_PRIVATE_URL'] == 'true';
    final providerUrl = _providerUrl(
      environment['OCR_PROVIDER_URL'],
      allowPrivateHttp: allowPrivateHttp,
      hasToken: providerToken != null && providerToken.isNotEmpty,
    );
    final secret = environment['SUPABASE_SECRET_KEY']?.trim() ?? '';
    if (!_isServiceRoleKey(secret)) {
      throw const ApiConfigException(
        'SUPABASE_SECRET_KEY must be a service-role secret and must never be '
        'used by the public API or app.',
      );
    }
    final workerId =
        environment['OCR_WORKER_ID']?.trim() ?? Platform.localHostname;
    if (workerId.isEmpty || workerId.length > 80) {
      throw const ApiConfigException('OCR_WORKER_ID must contain 1-80 chars.');
    }
    final pollMs = int.tryParse(environment['OCR_POLL_INTERVAL_MS'] ?? '2000');
    if (pollMs == null || pollMs < 250 || pollMs > 60000) {
      throw const ApiConfigException(
        'OCR_POLL_INTERVAL_MS must be between 250 and 60000.',
      );
    }
    return OcrWorkerConfig(
      supabaseUrl: supabaseUrl,
      supabaseSecretKey: secret,
      providerUrl: providerUrl,
      workerId: workerId,
      pollInterval: Duration(milliseconds: pollMs),
      providerToken: providerToken == null || providerToken.isEmpty
          ? null
          : providerToken,
    );
  }

  final Uri supabaseUrl;
  final String supabaseSecretKey;
  final Uri providerUrl;
  final String workerId;
  final Duration pollInterval;
  final String? providerToken;

  bool get usesLegacyServiceRoleJwt =>
      !supabaseSecretKey.startsWith('sb_secret_');

  static Uri _secureUrl(String? raw, String name) {
    final uri = Uri.tryParse(raw?.trim() ?? '');
    final local = uri?.host == 'localhost' || uri?.host == '127.0.0.1';
    if (uri == null ||
        !uri.hasScheme ||
        uri.host.isEmpty ||
        (uri.scheme != 'https' && !(local && uri.scheme == 'http'))) {
      throw ApiConfigException(
        '$name must be HTTPS, except for local development.',
      );
    }
    return uri;
  }

  static Uri _providerUrl(
    String? raw, {
    required bool allowPrivateHttp,
    required bool hasToken,
  }) {
    final uri = Uri.tryParse(raw?.trim() ?? '');
    if (uri == null || !uri.hasScheme || uri.host.isEmpty) {
      throw const ApiConfigException('OCR_PROVIDER_URL must be a valid URL.');
    }
    if (uri.scheme == 'https') return uri;
    final local = uri.host == 'localhost' || uri.host == '127.0.0.1';
    if (uri.scheme == 'http' && local) return uri;
    if (uri.scheme == 'http' &&
        allowPrivateHttp &&
        hasToken &&
        _isPrivateHost(uri.host)) {
      return uri;
    }
    throw const ApiConfigException(
      'OCR_PROVIDER_URL must use HTTPS. Private HTTP requires '
      'OCR_ALLOW_INSECURE_PRIVATE_URL=true, a private hostname, and a token.',
    );
  }

  static bool _isPrivateHost(String host) {
    final normalized = host.toLowerCase();
    if (!normalized.contains('.') &&
        RegExp(r'^[a-z0-9][a-z0-9-]{0,62}$').hasMatch(normalized)) {
      return true;
    }
    final octets = normalized.split('.').map(int.tryParse).toList();
    if (octets.length == 4 && octets.every((part) => part != null)) {
      final a = octets[0]!;
      final b = octets[1]!;
      return a == 10 ||
          (a == 172 && b >= 16 && b <= 31) ||
          (a == 192 && b == 168);
    }
    return normalized == '::1' ||
        normalized.startsWith('fc') ||
        normalized.startsWith('fd');
  }

  static bool _isServiceRoleKey(String key) {
    if (key.startsWith('sb_secret_') && key.length > 20) return true;
    final parts = key.split('.');
    if (parts.length != 3) return false;
    try {
      final payload = utf8.decode(
        base64Url.decode(base64Url.normalize(parts[1])),
      );
      final json = jsonDecode(payload);
      return json is Map && json['role'] == 'service_role';
    } on FormatException {
      return false;
    }
  }
}
