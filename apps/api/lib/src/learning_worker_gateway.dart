import 'dart:convert';
import 'dart:io';

import 'package:http/http.dart' as http;
import 'package:picket_api/src/api_config.dart';
import 'package:picket_api/src/learning_worker.dart';

class LearningWorkerConfig {
  const LearningWorkerConfig({
    required this.supabaseUrl,
    required this.secretKey,
    required this.geminiKey,
    required this.model,
    required this.pollInterval,
  });

  factory LearningWorkerConfig.fromEnvironment([Map<String, String>? values]) {
    final env = values ?? Platform.environment;
    if (env['LEARNING_AI_ENABLED'] != 'true') {
      throw const ApiConfigException('Learning AI worker is disabled.');
    }
    final url = Uri.tryParse(env['SUPABASE_URL']?.trim() ?? '');
    final local = url?.host == 'localhost' || url?.host == '127.0.0.1';
    if (url == null ||
        url.host.isEmpty ||
        url.userInfo.isNotEmpty ||
        url.hasQuery ||
        url.hasFragment ||
        !{'', '/'}.contains(url.path) ||
        (url.scheme != 'https' &&
            !(local &&
                url.scheme == 'http' &&
                env['APP_ENV'] != 'production'))) {
      throw const ApiConfigException('Invalid learning worker Supabase URL.');
    }
    final secret = env['SUPABASE_SECRET_KEY']?.trim() ?? '';
    var serviceRole = secret.startsWith('sb_secret_') && secret.length > 20;
    if (!serviceRole) {
      try {
        final parts = secret.split('.');
        final payload = parts.length == 3
            ? jsonDecode(
                utf8.decode(base64Url.decode(base64Url.normalize(parts[1]))),
              )
            : null;
        serviceRole = payload is Map && payload['role'] == 'service_role';
      } on Object {
        serviceRole = false;
      }
    }
    if (!serviceRole) {
      throw const ApiConfigException(
        'Learning worker requires server credentials.',
      );
    }
    final key = env['GEMINI_API_KEY']?.trim() ?? '';
    final model = env['GEMINI_MODEL']?.trim() ?? '';
    final poll = int.tryParse(env['LEARNING_AI_POLL_INTERVAL_MS'] ?? '2000');
    if (key.isEmpty ||
        !RegExp(r'^gemini-[a-z0-9.-]+$').hasMatch(model) ||
        poll == null ||
        poll < 250 ||
        poll > 60000) {
      throw const ApiConfigException(
        'Invalid learning worker provider settings.',
      );
    }
    return LearningWorkerConfig(
      supabaseUrl: url,
      secretKey: secret,
      geminiKey: key,
      model: model,
      pollInterval: Duration(milliseconds: poll),
    );
  }

  final Uri supabaseUrl;
  final String secretKey;
  final String geminiKey;
  final String model;
  final Duration pollInterval;
}

class LearningWorkerGatewayException implements Exception {
  const LearningWorkerGatewayException();
  @override
  String toString() => 'Learning queue unavailable.';
}

class SupabaseLearningJobGateway implements LearningJobGateway {
  const SupabaseLearningJobGateway(this.config, this.client);
  final LearningWorkerConfig config;
  final http.Client client;

  Future<Object?> _rpc(String name, Map<String, Object?> body) async {
    try {
      final response = await client
          .post(
            config.supabaseUrl.resolve('/rest/v1/rpc/$name'),
            headers: {
              'apikey': config.secretKey,
              if (!config.secretKey.startsWith('sb_secret_'))
                'authorization': 'Bearer ${config.secretKey}',
              'content-type': 'application/json',
            },
            body: jsonEncode(body),
          )
          .timeout(const Duration(seconds: 10));
      if (!{200, 204}.contains(response.statusCode) ||
          response.bodyBytes.length > 8192) {
        throw const LearningWorkerGatewayException();
      }
      return response.body.isEmpty ? null : jsonDecode(response.body);
    } on Object {
      throw const LearningWorkerGatewayException();
    }
  }

  @override
  Future<LearningJob?> claim() async {
    final value = await _rpc('claim_learning_ai_job', {});
    if (value == null) return null;
    if (value is! Map ||
        value['id'] is! String ||
        value['leaseToken'] is! String ||
        !_uuid.hasMatch(value['id'] as String) ||
        !_uuid.hasMatch(value['leaseToken'] as String) ||
        value['scenarioId'] != 'cash-gap-v1' ||
        !{'vi', 'en'}.contains(value['locale'])) {
      throw const LearningWorkerGatewayException();
    }
    return LearningJob(
      value['id'] as String,
      value['leaseToken'] as String,
      value['scenarioId'] as String,
      value['locale'] as String,
    );
  }

  Future<void> prune() async {
    await _rpc('prune_learning_ai_jobs', {});
  }

  static final _uuid = RegExp(
    '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-'
    r'[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$',
  );
  Map<String, Object?> _lease(LearningJob job) => {
    'p_id': job.id,
    'p_lease_token': job.leaseToken,
  };

  @override
  Future<bool> markDispatched(LearningJob job) async {
    final result = await _rpc('dispatch_learning_ai_job', _lease(job));
    if (result is! bool) throw const LearningWorkerGatewayException();
    return result;
  }

  Future<void> _finish(LearningJob job, List<String>? ids) async {
    final result = await _rpc('finish_learning_ai_job', {
      ..._lease(job),
      'p_statement_ids': ids,
    });
    if (result is! bool) throw const LearningWorkerGatewayException();
    // False is an expected cancellation/expiry, not a reason to retry.
  }

  @override
  Future<void> complete(LearningJob job, List<String> statementIds) =>
      _finish(job, statementIds);
  @override
  Future<void> fail(LearningJob job) => _finish(job, null);
}
