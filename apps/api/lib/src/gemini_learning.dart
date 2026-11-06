import 'dart:async';
import 'dart:convert';

import 'package:http/http.dart' as http;

enum LearningFailureKind { http, timeout, transport, invalidOutput }

class LearningProviderUnavailable implements Exception {
  const LearningProviderUnavailable({
    this.statusCode,
    this.kind = LearningFailureKind.invalidOutput,
  });
  final int? statusCode;
  final LearningFailureKind kind;
  @override
  String toString() => 'Educational provider unavailable; use local content.';
}

/// Initial free-tier boundary: no owner IDs, financial history or user text.
/// Selects approved explanation IDs; never publishes model prose.
class GeminiLearningAdapter {
  GeminiLearningAdapter({
    required String apiKey,
    required this.model,
    required this.client,
    this.timeout = const Duration(seconds: 15),
  }) : _apiKey = apiKey {
    if (apiKey.isEmpty || !RegExp(r'^gemini-[a-z0-9.-]+$').hasMatch(model)) {
      throw const FormatException('Provider requires backend configuration.');
    }
  }
  final String _apiKey;
  final String model;
  final http.Client client;
  final Duration timeout;
  static const _scenarios = {
    'cash-gap-v1':
        'Synthetic example only. Opening balance 100000 VND. '
        'Rent 300000 VND is due before income of 1000000 VND. '
        'The balance reaches -200000 VND before income and ends at 800000 VND.',
  };
  static const _statementIds = ['timing', 'buffer', 'incomplete-records'];

  Future<List<String>> explain(String scenarioId, String locale) async {
    final scenario = _scenarios[scenarioId];
    if (scenario == null || !{'vi', 'en'}.contains(locale)) {
      throw const FormatException(
        'Only predefined educational cases supported.',
      );
    }
    int? receivedStatus;
    try {
      final response = await client
          .post(
            Uri.https(
              'generativelanguage.googleapis.com',
              '/v1beta/models/$model:generateContent',
            ),
            headers: {
              'Content-Type': 'application/json',
              'x-goog-api-key': _apiKey,
            },
            body: jsonEncode({
              'contents': [
                {
                  'parts': [
                    {
                      'text':
                          'Select explanation IDs for this synthetic case. '
                          'timing: payments before income; '
                          'buffer: contingency; '
                          'incomplete-records: illustration omits some costs. '
                          'Do not offer permission to spend. Locale: $locale. '
                          'Case: $scenario',
                    },
                  ],
                },
              ],
              'generationConfig': {
                'temperature': 0,
                'maxOutputTokens': 256,
                'responseMimeType': 'application/json',
                'responseJsonSchema': {
                  'type': 'object',
                  'properties': {
                    'statementIds': {
                      'type': 'array',
                      'items': {'type': 'string', 'enum': _statementIds},
                      'minItems': 1,
                      'maxItems': 3,
                    },
                  },
                  'required': ['statementIds'],
                  'additionalProperties': false,
                },
              },
            }),
          )
          .timeout(timeout);
      receivedStatus = response.statusCode;
      if (response.statusCode != 200 || response.bodyBytes.length > 32768) {
        throw LearningProviderUnavailable(
          statusCode: response.statusCode,
          kind: LearningFailureKind.http,
        );
      }
      final decoded = jsonDecode(response.body) as Map<String, dynamic>;
      final candidates = decoded['candidates'] as List<dynamic>;
      final candidate = candidates.single as Map<String, dynamic>;
      // https://ai.google.dev/api/generate-content#FinishReason
      // A valid JSON fragment is not proof that generation completed.
      if (candidate['finishReason'] != 'STOP') {
        throw const LearningProviderUnavailable(statusCode: 200);
      }
      final content = candidate['content'] as Map<String, dynamic>;
      final parts = content['parts'] as List<dynamic>;
      final part = parts.single as Map<String, dynamic>;
      final output = jsonDecode(part['text'] as String) as Map<String, dynamic>;
      final ids = output['statementIds'] as List<dynamic>;
      if (output.length != 1 ||
          ids.isEmpty ||
          ids.length > 3 ||
          ids.any((id) => id is! String || !_statementIds.contains(id)) ||
          ids.toSet().length != ids.length) {
        throw const LearningProviderUnavailable(statusCode: 200);
      }
      return ids.cast<String>();
    } on LearningProviderUnavailable {
      rethrow;
    } on TimeoutException {
      throw const LearningProviderUnavailable(
        kind: LearningFailureKind.timeout,
      );
    } on http.ClientException {
      throw const LearningProviderUnavailable(
        kind: LearningFailureKind.transport,
      );
    } on Object {
      // Keep bodies, prompts, keys and transport errors out of logs.
      throw LearningProviderUnavailable(statusCode: receivedStatus);
    }
  }
}
