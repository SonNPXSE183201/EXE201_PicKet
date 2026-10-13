import 'dart:convert';
import 'dart:typed_data';

import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:picket_api/src/api_config.dart';
import 'package:picket_api/src/ocr_worker.dart';
import 'package:picket_api/src/ocr_worker_config.dart';
import 'package:test/test.dart';

void main() {
  test('worker config rejects publishable keys', () {
    expect(
      () => OcrWorkerConfig.fromEnvironment({
        'SUPABASE_URL': 'https://project.supabase.co',
        'SUPABASE_SECRET_KEY': 'sb_publishable_not_secret',
        'OCR_PROVIDER_URL': 'https://ocr.example.test/predict',
        'OCR_WORKER_ID': 'worker-1',
      }),
      throwsA(isA<ApiConfigException>()),
    );
  });

  test('worker config accepts scoped server-only settings', () {
    final config = OcrWorkerConfig.fromEnvironment({
      'SUPABASE_URL': 'https://project.supabase.co',
      'SUPABASE_SECRET_KEY': 'sb_secret_abcdefghijklmnopqrstuvwxyz',
      'OCR_PROVIDER_URL': 'https://ocr.example.test/predict',
      'OCR_WORKER_ID': 'worker-1',
      'OCR_POLL_INTERVAL_MS': '750',
    });
    expect(config.workerId, 'worker-1');
    expect(config.pollInterval, const Duration(milliseconds: 750));
    expect(config.usesLegacyServiceRoleJwt, false);
  });

  test(
    'worker config permits authenticated private Docker HTTP explicitly',
    () {
      final config = OcrWorkerConfig.fromEnvironment({
        'SUPABASE_URL': 'https://project.supabase.co',
        'SUPABASE_SECRET_KEY': 'sb_secret_abcdefghijklmnopqrstuvwxyz',
        'OCR_PROVIDER_URL': 'http://ocr-provider:8000/predict',
        'OCR_PROVIDER_TOKEN': 'a-long-private-provider-token',
        'OCR_ALLOW_INSECURE_PRIVATE_URL': 'true',
        'OCR_WORKER_ID': 'worker-1',
      });
      expect(config.providerUrl.host, 'ocr-provider');
      expect(config.providerToken, 'a-long-private-provider-token');
    },
  );

  test('worker config rejects unauthenticated private Docker HTTP', () {
    expect(
      () => OcrWorkerConfig.fromEnvironment({
        'SUPABASE_URL': 'https://project.supabase.co',
        'SUPABASE_SECRET_KEY': 'sb_secret_abcdefghijklmnopqrstuvwxyz',
        'OCR_PROVIDER_URL': 'http://ocr-provider:8000/predict',
        'OCR_ALLOW_INSECURE_PRIVATE_URL': 'true',
        'OCR_WORKER_ID': 'worker-1',
      }),
      throwsA(isA<ApiConfigException>()),
    );
  });

  test('new Supabase secret key is not sent as a bearer JWT', () async {
    final config = OcrWorkerConfig.fromEnvironment({
      'SUPABASE_URL': 'https://project.supabase.co',
      'SUPABASE_SECRET_KEY': 'sb_secret_abcdefghijklmnopqrstuvwxyz',
      'OCR_PROVIDER_URL': 'https://ocr.example.test/predict',
      'OCR_WORKER_ID': 'worker-1',
    });
    final client = MockClient((request) async {
      expect(request.headers['apikey'], config.supabaseSecretKey);
      expect(request.headers.containsKey('authorization'), false);
      return http.Response(
        '[]',
        200,
        headers: {'content-type': 'application/json'},
      );
    });
    expect(await OcrWorkerGateway(config, client).claim(), isEmpty);
  });

  test('PP-OCR result validates and normalizes provider payload', () {
    final result = PpOcrResult.fromJson({
      'rawText': 'PICKET STORE\nTOTAL 45000',
      'merchant': 'PICKET STORE',
      'amount': 45000,
      'date': '2026-10-09T00:00:00.000Z',
      'confidence': 0.91,
      'lines': <Object>[],
    });
    expect(result.value['provider'], 'pp-ocr');
    expect(result.value['amount'], 45000);
    expect(jsonEncode(result.value), contains('PICKET STORE'));
  });

  test('PP-OCR result rejects unsafe output', () {
    expect(
      () => PpOcrResult.fromJson({
        'rawText': 'x',
        'merchant': 'x',
        'amount': -1,
        'confidence': 2,
      }),
      throwsA(isA<OcrWorkerException>()),
    );
  });

  test('PP-OCR provider sends the image MIME type in multipart', () async {
    final config = OcrWorkerConfig.fromEnvironment({
      'SUPABASE_URL': 'https://project.supabase.co',
      'SUPABASE_SECRET_KEY': 'sb_secret_abcdefghijklmnopqrstuvwxyz',
      'OCR_PROVIDER_URL': 'https://ocr.example.test/predict',
      'OCR_WORKER_ID': 'worker-1',
    });
    final client = _InspectMultipartClient();

    final result = await PpOcrProvider(config, client).recognize(
      Uint8List.fromList([137, 80, 78, 71]),
      'receipt.PNG',
    );

    expect(client.contentType, 'image/png');
    expect(client.language, 'vi,en');
    expect(result.value['provider'], 'pp-ocr');
  });
}

class _InspectMultipartClient extends http.BaseClient {
  String? contentType;
  String? language;

  @override
  Future<http.StreamedResponse> send(http.BaseRequest request) async {
    expect(request, isA<http.MultipartRequest>());
    final multipart = request as http.MultipartRequest;
    contentType = multipart.files.single.contentType.mimeType;
    language = multipart.fields['language'];
    return http.StreamedResponse(
      Stream.value(
        utf8.encode(
          jsonEncode({
            'rawText': 'PICKET STORE',
            'merchant': 'PICKET STORE',
            'amount': 80000,
            'date': null,
            'confidence': 0.9,
            'lines': <Object>[],
          }),
        ),
      ),
      200,
      headers: {'content-type': 'application/json'},
    );
  }
}
