import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:picket_api/src/gemini_learning.dart';
import 'package:test/test.dart';

void main() {
  test(
    'free provider receives fixed synthetic case only',
    () async {
      final provider = GeminiLearningAdapter(
        apiKey: 'test-key',
        model: 'gemini-test',
        client: MockClient((request) async {
          expect(request.url.host, 'generativelanguage.googleapis.com');
          expect(request.url.queryParameters.containsKey('key'), false);
          expect(request.headers['x-goog-api-key'], 'test-key');
          expect(request.body.contains('user@example.test'), false);
          return http.Response(
            jsonEncode({
              'candidates': [
                {
                  'finishReason': 'STOP',
                  'content': {
                    'parts': [
                      {
                        'text': jsonEncode({
                          'statementIds': ['timing', 'buffer'],
                        }),
                      },
                    ],
                  },
                },
              ],
            }),
            200,
          );
        }),
      );
      expect(await provider.explain('cash-gap-v1', 'vi'), ['timing', 'buffer']);
    },
  );
  test('unknown scenarios and locales never reach network', () async {
    var calls = 0;
    final provider = GeminiLearningAdapter(
      apiKey: 'test-key',
      model: 'gemini-test',
      client: MockClient((request) async {
        calls++;
        return http.Response('{}', 200);
      }),
    );
    await expectLater(
      provider.explain('my personal money', 'vi'),
      throwsFormatException,
    );
    await expectLater(
      provider.explain('cash-gap-v1', 'xx'),
      throwsFormatException,
    );
    expect(calls, 0);
  });
  test(
    'invalid provider claims and quota errors return typed fallback failure',
    () async {
      for (final response in [
        http.Response('{}', 429),
        http.Response(
          jsonEncode({
            'candidates': [
              {
                'content': {
                  'parts': [
                    {'text': '{"statementIds":["buy-now"]}'},
                  ],
                },
              },
            ],
          }),
          200,
        ),
      ]) {
        final provider = GeminiLearningAdapter(
          apiKey: 'test-key',
          model: 'gemini-test',
          client: MockClient((_) async => response),
        );
        await expectLater(
          provider.explain('cash-gap-v1', 'en'),
          throwsA(isA<LearningProviderUnavailable>()),
        );
      }
    },
  );
}
