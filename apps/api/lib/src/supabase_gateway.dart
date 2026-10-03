import 'dart:convert';
import 'dart:io';

import 'package:http/http.dart' as http;
import 'package:picket_api/src/api_config.dart';
import 'package:picket_api/src/finance_contract.dart';
import 'package:picket_api/src/profile_contract.dart';

class GatewayException implements Exception {
  const GatewayException(this.statusCode, this.message);
  final int statusCode;
  final String message;
}

class SupabaseGateway {
  SupabaseGateway(this.config, {http.Client? client})
    : _client = client ?? http.Client();

  final ApiConfig config;
  final http.Client _client;

  Map<String, String> _headers(String accessToken) => {
    HttpHeaders.authorizationHeader: 'Bearer $accessToken',
    'apikey': config.supabasePublishableKey,
    HttpHeaders.acceptHeader: ContentType.json.mimeType,
    HttpHeaders.contentTypeHeader: ContentType.json.mimeType,
  };

  Uri _uri(String path, [Map<String, String>? query]) =>
      config.supabaseUrl.resolve(path).replace(queryParameters: query);

  Future<String> authenticate(String accessToken) async {
    final response = await _client
        .get(_uri('/auth/v1/user'), headers: _headers(accessToken))
        .timeout(const Duration(seconds: 10));
    if (response.statusCode != HttpStatus.ok) {
      throw const GatewayException(HttpStatus.unauthorized, 'Unauthorized');
    }
    final body = jsonDecode(response.body);
    if (body is! Map || body['id'] is! String) {
      throw const GatewayException(HttpStatus.unauthorized, 'Unauthorized');
    }
    return body['id'] as String;
  }

  Future<FinanceSnapshotEnvelope> loadSnapshot(String accessToken) async {
    await authenticate(accessToken);
    final response = await _client
        .post(
          _uri('/rest/v1/rpc/load_normalized_finance'),
          headers: _headers(accessToken),
          body: '{}',
        )
        .timeout(const Duration(seconds: 20));
    _ensureSuccess(response);
    final body = jsonDecode(response.body);
    if (body == null) {
      return const FinanceSnapshotEnvelope(revision: 0, payload: null);
    }
    if (body is! Map) {
      throw const GatewayException(
        HttpStatus.badGateway,
        'Supabase returned invalid finance data.',
      );
    }
    final row = Map<String, dynamic>.from(body);
    return FinanceSnapshotEnvelope(
      revision: row['revision'] as int,
      payload: Map<String, dynamic>.from(row['payload'] as Map),
    );
  }

  Future<int> saveSnapshot(
    String accessToken,
    SaveSnapshotRequest request,
  ) async {
    await authenticate(accessToken);
    final response = await _client
        .post(
          _uri('/rest/v1/rpc/save_normalized_finance'),
          headers: _headers(accessToken),
          body: jsonEncode({
            'expected_revision': request.expectedRevision,
            'new_payload': request.payload,
          }),
        )
        .timeout(const Duration(seconds: 20));
    _ensureSuccess(response);
    final revision = jsonDecode(response.body);
    if (revision is! int) {
      throw const GatewayException(
        HttpStatus.badGateway,
        'Supabase returned an invalid revision.',
      );
    }
    return revision;
  }

  Future<Map<String, dynamic>?> currentProfile(String accessToken) async {
    await authenticate(accessToken);
    final response = await _client
        .post(
          _uri('/rest/v1/rpc/current_profile'),
          headers: _headers(accessToken),
          body: '{}',
        )
        .timeout(const Duration(seconds: 20));
    _ensureSuccess(response);
    final body = jsonDecode(response.body);
    if (body == null) return null;
    if (body is! Map) {
      throw const GatewayException(
        HttpStatus.badGateway,
        'Supabase returned an invalid profile.',
      );
    }
    return Map<String, dynamic>.from(body);
  }

  Future<String> completeOnboarding(
    String accessToken,
    CompleteOnboardingRequest request,
  ) async {
    await authenticate(accessToken);
    final response = await _client
        .post(
          _uri('/rest/v1/rpc/complete_onboarding'),
          headers: _headers(accessToken),
          body: jsonEncode(request.toRpcJson()),
        )
        .timeout(const Duration(seconds: 20));
    _ensureSuccess(response);
    final walletId = jsonDecode(response.body);
    if (walletId is! String) {
      throw const GatewayException(
        HttpStatus.badGateway,
        'Supabase returned an invalid wallet.',
      );
    }
    return walletId;
  }

  Future<void> updateProfile(
    String accessToken,
    Map<String, dynamic> patch,
  ) async {
    final userId = await authenticate(accessToken);
    final response = await _client
        .patch(
          _uri('/rest/v1/profiles', {'id': 'eq.$userId'}),
          headers: _headers(accessToken),
          body: jsonEncode(patch),
        )
        .timeout(const Duration(seconds: 20));
    _ensureSuccess(response);
  }

  Future<void> updatePreferences(
    String accessToken,
    Map<String, dynamic> patch,
  ) async {
    final userId = await authenticate(accessToken);
    final response = await _client
        .patch(
          _uri('/rest/v1/user_preferences', {'user_id': 'eq.$userId'}),
          headers: _headers(accessToken),
          body: jsonEncode(patch),
        )
        .timeout(const Duration(seconds: 20));
    _ensureSuccess(response);
  }

  void _ensureSuccess(http.Response response) {
    if (response.statusCode >= 200 && response.statusCode < 300) return;
    try {
      final body = jsonDecode(response.body);
      if (body is Map && body['code'] == '40001') {
        throw const GatewayException(HttpStatus.conflict, 'Snapshot conflict');
      }
    } on GatewayException {
      rethrow;
    } on FormatException {
      // Keep the sanitized default message.
    }
    throw GatewayException(
      response.statusCode >= 500 ? HttpStatus.badGateway : response.statusCode,
      'Supabase request failed.',
    );
  }

  void close() => _client.close();
}
