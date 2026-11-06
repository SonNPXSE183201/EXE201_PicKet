import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:picket_api/src/gemini_learning.dart';
import 'package:test/test.dart';

void main() {
  for (final reason in ['MAX_TOKENS', 'SAFETY', 'RECITATION', null]) {
    test(
      'provider does not publish a non-complete candidate: $reason',
      () async {
        final adapter = GeminiLearningAdapter(
          apiKey: 'test-only',
          model: 'gemini-test',
          client: MockClient(
            (_) async => http.Response(
              jsonEncode({
                'candidates': [
                  {
                    if (reason != null) 'finishReason': reason,
                    'content': {
                      'parts': [
                        {'text': '{"statementIds":["timing"]}'},
                      ],
                    },
                  },
                ],
              }),
              200,
            ),
          ),
        );
        await expectLater(
          adapter.explain('cash-gap-v1', 'vi'),
          throwsA(isA<LearningProviderUnavailable>()),
        );
      },
    );
  }
}
