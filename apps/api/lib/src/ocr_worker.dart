import 'dart:convert';
import 'dart:io';
import 'dart:typed_data';

import 'package:http/http.dart' as http;
import 'package:http_parser/http_parser.dart';
import 'package:picket_api/src/ocr_worker_config.dart';

class OcrWorkerException implements Exception {
  const OcrWorkerException(this.code, {required this.retryable});
  final String code;
  final bool retryable;
}

class OcrWorkerJob {
  const OcrWorkerJob({
    required this.id,
    required this.storagePath,
    required this.attempts,
  });

  factory OcrWorkerJob.fromJson(Map<String, dynamic> json) => OcrWorkerJob(
    id: json['id'] as String,
    storagePath: json['storage_path'] as String,
    attempts: json['attempts'] as int,
  );

  final String id;
  final String storagePath;
  final int attempts;
}

class PpOcrResult {
  const PpOcrResult(this.value);

  factory PpOcrResult.fromJson(Object? value) {
    if (value is! Map) {
      throw const OcrWorkerException(
        'PROVIDER_INVALID_RESULT',
        retryable: false,
      );
    }
    final json = Map<String, dynamic>.from(value);
    final rawText = json['rawText'];
    final merchant = json['merchant'];
    final amount = json['amount'];
    final confidence = json['confidence'];
    if (rawText is! String ||
        rawText.length > 32000 ||
        (merchant != null && (merchant is! String || merchant.length > 160)) ||
        (amount != null &&
            (amount is! int || amount <= 0 || amount > 9000000000000)) ||
        confidence is! num ||
        !confidence.isFinite ||
        confidence < 0 ||
        confidence > 1) {
      throw const OcrWorkerException(
        'PROVIDER_INVALID_RESULT',
        retryable: false,
      );
    }
    final normalized = <String, dynamic>{
      'rawText': rawText,
      'merchant': merchant,
      'amount': amount,
      'date': json['date'],
      'confidence': confidence.toDouble(),
      'lines': json['lines'] is List ? json['lines'] : const <Object>[],
      'provider': 'pp-ocr',
    };
    if (utf8.encode(jsonEncode(normalized)).length > 65536) {
      throw const OcrWorkerException(
        'PROVIDER_RESULT_TOO_LARGE',
        retryable: false,
      );
    }
    return PpOcrResult(normalized);
  }

  final Map<String, dynamic> value;
}

class PpOcrProvider {
  PpOcrProvider(this.config, this._client);

  final OcrWorkerConfig config;
  final http.Client _client;

  Future<PpOcrResult> recognize(Uint8List image, String filename) async {
    final request = http.MultipartRequest('POST', config.providerUrl)
      ..fields['language'] = 'vi,en'
      ..files.add(
        http.MultipartFile.fromBytes(
          'file',
          image,
          filename: filename,
          contentType: _imageMediaType(filename),
        ),
      );
    if (config.providerToken != null) {
      request.headers[HttpHeaders.authorizationHeader] =
          'Bearer ${config.providerToken}';
    }
    final streamed = await _client
        .send(request)
        .timeout(const Duration(seconds: 45));
    final response = await http.Response.fromStream(streamed);
    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw OcrWorkerException(
        'PROVIDER_HTTP_${response.statusCode}',
        retryable: response.statusCode == 429 || response.statusCode >= 500,
      );
    }
    try {
      return PpOcrResult.fromJson(jsonDecode(response.body));
    } on FormatException {
      throw const OcrWorkerException(
        'PROVIDER_INVALID_JSON',
        retryable: false,
      );
    }
  }
}

MediaType _imageMediaType(String filename) {
  final extension = filename.toLowerCase().split('.').last;
  return switch (extension) {
    'jpg' || 'jpeg' => MediaType('image', 'jpeg'),
    'png' => MediaType('image', 'png'),
    'webp' => MediaType('image', 'webp'),
    _ => MediaType('application', 'octet-stream'),
  };
}

class OcrWorkerGateway {
  OcrWorkerGateway(this.config, this._client);

  final OcrWorkerConfig config;
  final http.Client _client;

  Map<String, String> get _headers => {
    'apikey': config.supabaseSecretKey,
    if (config.usesLegacyServiceRoleJwt)
      HttpHeaders.authorizationHeader: 'Bearer ${config.supabaseSecretKey}',
    HttpHeaders.contentTypeHeader: ContentType.json.mimeType,
  };

  Uri _uri(String path) => config.supabaseUrl.resolve(path);

  Future<List<OcrWorkerJob>> claim({int limit = 1}) async {
    final response = await _client
        .post(
          _uri('/rest/v1/rpc/claim_ocr_fallback_jobs'),
          headers: _headers,
          body: jsonEncode({'p_worker_id': config.workerId, 'p_limit': limit}),
        )
        .timeout(const Duration(seconds: 20));
    _ensureSuccess(response, 'CLAIM_FAILED');
    final body = jsonDecode(response.body);
    if (body is! List) {
      throw const OcrWorkerException('CLAIM_INVALID_RESULT', retryable: true);
    }
    return body
        .map(
          (item) => OcrWorkerJob.fromJson(
            Map<String, dynamic>.from(item as Map),
          ),
        )
        .toList();
  }

  Future<Uint8List> download(OcrWorkerJob job) async {
    final path = job.storagePath.split('/').map(Uri.encodeComponent).join('/');
    final response = await _client
        .get(
          _uri('/storage/v1/object/authenticated/picket-media/$path'),
          headers: _headers,
        )
        .timeout(const Duration(seconds: 30));
    if (response.statusCode == HttpStatus.notFound) {
      throw const OcrWorkerException('IMAGE_NOT_FOUND', retryable: false);
    }
    _ensureSuccess(response, 'IMAGE_DOWNLOAD_FAILED');
    return response.bodyBytes;
  }

  Future<void> complete(OcrWorkerJob job, PpOcrResult result) async {
    final response = await _client
        .post(
          _uri('/rest/v1/rpc/complete_ocr_fallback_job'),
          headers: _headers,
          body: jsonEncode({
            'p_job_id': job.id,
            'p_worker_id': config.workerId,
            'p_result': result.value,
          }),
        )
        .timeout(const Duration(seconds: 20));
    _ensureSuccess(response, 'COMPLETE_FAILED');
    if (jsonDecode(response.body) != true) {
      throw const OcrWorkerException('JOB_LEASE_LOST', retryable: false);
    }
  }

  Future<void> fail(
    OcrWorkerJob job,
    String code, {
    required bool retryable,
  }) async {
    final response = await _client
        .post(
          _uri('/rest/v1/rpc/fail_ocr_fallback_job'),
          headers: _headers,
          body: jsonEncode({
            'p_job_id': job.id,
            'p_worker_id': config.workerId,
            'p_error_code': code,
            'p_retryable': retryable,
          }),
        )
        .timeout(const Duration(seconds: 20));
    _ensureSuccess(response, 'FAIL_UPDATE_FAILED');
  }

  Future<int> expireAndDeleteImages() async {
    final response = await _client
        .post(
          _uri('/rest/v1/rpc/expire_ocr_fallback_jobs'),
          headers: _headers,
          body: '{}',
        )
        .timeout(const Duration(seconds: 20));
    _ensureSuccess(response, 'EXPIRY_FAILED');
    final body = jsonDecode(response.body);
    if (body is! List || body.isEmpty) return 0;
    final paths = body
        .map((item) => (item as Map)['storage_path'] as String)
        .toList();
    final deletion = await _client
        .delete(
          _uri('/storage/v1/object/picket-media'),
          headers: _headers,
          body: jsonEncode({'prefixes': paths}),
        )
        .timeout(const Duration(seconds: 30));
    _ensureSuccess(deletion, 'IMAGE_DELETE_FAILED');
    final acknowledgement = await _client
        .post(
          _uri('/rest/v1/rpc/acknowledge_ocr_storage_deletion'),
          headers: _headers,
          body: jsonEncode({'p_storage_paths': paths}),
        )
        .timeout(const Duration(seconds: 20));
    _ensureSuccess(acknowledgement, 'IMAGE_DELETE_ACK_FAILED');
    return paths.length;
  }

  void _ensureSuccess(http.Response response, String code) {
    if (response.statusCode >= 200 && response.statusCode < 300) return;
    throw OcrWorkerException(
      code,
      retryable: response.statusCode == 429 || response.statusCode >= 500,
    );
  }
}

class OcrWorker {
  OcrWorker(this.gateway, this.provider);

  final OcrWorkerGateway gateway;
  final PpOcrProvider provider;

  Future<int> runOnce() async {
    await gateway.expireAndDeleteImages();
    final jobs = await gateway.claim();
    for (final job in jobs) {
      try {
        final image = await gateway.download(job);
        final filename = job.storagePath.split('/').last;
        final result = await provider.recognize(image, filename);
        await gateway.complete(job, result);
      } on OcrWorkerException catch (error) {
        await gateway.fail(job, error.code, retryable: error.retryable);
      } on Object {
        await gateway.fail(job, 'UNEXPECTED_ERROR', retryable: true);
      }
    }
    return jobs.length;
  }
}
