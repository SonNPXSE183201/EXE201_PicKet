import 'dart:convert';
import 'dart:io';

import 'package:http/http.dart' as http;
import 'package:picket_api/src/api_config.dart';
import 'package:picket_api/src/finance_contract.dart';

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
    final userId = await authenticate(accessToken);
    final response = await _client
        .get(
          _uri('/rest/v1/finance_snapshots', {
            'select': 'payload,revision,updated_at',
            'user_id': 'eq.$userId',
            'limit': '1',
          }),
          headers: _headers(accessToken),
        )
        .timeout(const Duration(seconds: 20));
    _ensureSuccess(response);
    final body = jsonDecode(response.body);
    if (body is! List || body.isEmpty) {
      return const FinanceSnapshotEnvelope(revision: 0, payload: null);
    }
    final row = Map<String, dynamic>.from(body.first as Map);
    return FinanceSnapshotEnvelope(
      revision: row['revision'] as int,
      payload: Map<String, dynamic>.from(row['payload'] as Map),
      updatedAt: DateTime.tryParse(row['updated_at'] as String? ?? ''),
    );
  }

  Future<int> saveSnapshot(
    String accessToken,
    SaveSnapshotRequest request,
  ) async {
    await authenticate(accessToken);
    final response = await _client
        .post(
          _uri('/rest/v1/rpc/save_finance_snapshot'),
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
