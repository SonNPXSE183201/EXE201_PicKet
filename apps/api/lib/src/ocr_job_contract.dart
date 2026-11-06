import 'package:picket_api/src/resource_validation.dart';

const ocrFallbackBucket = 'picket-media';

class OcrFallbackJobResource {
  const OcrFallbackJobResource({
    required this.id,
    required this.storagePath,
    required this.localConfidence,
    required this.status,
    required this.createdAt,
    required this.updatedAt,
    required this.expiresAt,
    this.result,
    this.errorCode,
    this.startedAt,
    this.completedAt,
  });

  factory OcrFallbackJobResource.fromDatabase(Map<String, dynamic> row) {
    final rawResult = row['result'];
    return OcrFallbackJobResource(
      id: row['id'] as String,
      storagePath: row['storage_path'] as String,
      localConfidence: (row['local_confidence'] as num).toDouble(),
      status: row['status'] as String,
      result: rawResult == null
          ? null
          : Map<String, dynamic>.from(rawResult as Map),
      errorCode: row['error_code'] as String?,
      createdAt: DateTime.parse(row['created_at'] as String),
      updatedAt: DateTime.parse(row['updated_at'] as String),
      expiresAt: DateTime.parse(row['expires_at'] as String),
      startedAt: row['started_at'] == null
          ? null
          : DateTime.parse(row['started_at'] as String),
      completedAt: row['completed_at'] == null
          ? null
          : DateTime.parse(row['completed_at'] as String),
    );
  }

  final String id;
  final String storagePath;
  final double localConfidence;
  final String status;
  final Map<String, dynamic>? result;
  final String? errorCode;
  final DateTime createdAt;
  final DateTime updatedAt;
  final DateTime expiresAt;
  final DateTime? startedAt;
  final DateTime? completedAt;

  Map<String, dynamic> toJson() => {
    'id': id,
    'storagePath': storagePath,
    'localConfidence': localConfidence,
    'status': status,
    'result': result,
    'errorCode': errorCode,
    'createdAt': createdAt.toUtc().toIso8601String(),
    'updatedAt': updatedAt.toUtc().toIso8601String(),
    'expiresAt': expiresAt.toUtc().toIso8601String(),
    'startedAt': startedAt?.toUtc().toIso8601String(),
    'completedAt': completedAt?.toUtc().toIso8601String(),
  };
}

class CreateOcrFallbackJobRequest {
  const CreateOcrFallbackJobRequest({
    required this.storagePath,
    required this.localConfidence,
    required this.idempotencyKey,
  });

  factory CreateOcrFallbackJobRequest.fromJson(Object? value) {
    if (value is! Map) throw const FormatException('Invalid JSON body.');
    final json = Map<String, dynamic>.from(value);
    if (json.keys.any(
      (key) =>
          !{'storagePath', 'localConfidence', 'idempotencyKey'}.contains(key),
    )) {
      throw const FormatException('Invalid OCR job fields.');
    }
    final path = json['storagePath'];
    final confidence = json['localConfidence'];
    final idempotencyKey = json['idempotencyKey'];
    if (path is! String ||
        path.isEmpty ||
        path.length > 1024 ||
        path.contains('..') ||
        !RegExp(
          r'^[^/]+/ocr/.+\.(jpe?g|png|webp)$',
          caseSensitive: false,
        ).hasMatch(path)) {
      throw const FormatException('Invalid OCR storage path.');
    }
    if (confidence is! num ||
        !confidence.isFinite ||
        confidence < 0 ||
        confidence > 1) {
      throw const FormatException('Invalid OCR confidence.');
    }
    if (idempotencyKey is! String) {
      throw const FormatException('Invalid idempotency key.');
    }
    return CreateOcrFallbackJobRequest(
      storagePath: path,
      localConfidence: confidence.toDouble(),
      idempotencyKey: validateUuid(idempotencyKey),
    );
  }

  final String storagePath;
  final double localConfidence;
  final String idempotencyKey;

  Map<String, dynamic> toRpcJson() => {
    'p_storage_path': storagePath,
    'p_local_confidence': localConfidence,
    'p_idempotency_key': idempotencyKey,
  };
}
