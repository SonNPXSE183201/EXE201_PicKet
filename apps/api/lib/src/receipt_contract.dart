import 'package:picket_api/src/resource_validation.dart';

const receiptProviders = {'ml-kit', 'pp-ocr', 'manual'};

class ReceiptLineItemResource {
  const ReceiptLineItemResource({
    required this.id,
    required this.receiptId,
    required this.name,
    required this.quantity,
    required this.total,
    required this.version,
    required this.createdAt,
    required this.updatedAt,
    this.unitPrice,
    this.confidence,
  });

  factory ReceiptLineItemResource.fromDatabase(Map<String, dynamic> row) =>
      ReceiptLineItemResource(
        id: row['id'] as String,
        receiptId: row['receipt_id'] as String,
        name: row['name'] as String,
        quantity: (row['quantity'] as num).toDouble(),
        unitPrice: row['unit_price'] as int?,
        total: row['total'] as int,
        confidence: (row['confidence'] as num?)?.toDouble(),
        version: row['row_version'] as int,
        createdAt: DateTime.parse(row['created_at'] as String),
        updatedAt: DateTime.parse(row['updated_at'] as String),
      );

  final String id;
  final String receiptId;
  final String name;
  final double quantity;
  final int? unitPrice;
  final int total;
  final double? confidence;
  final int version;
  final DateTime createdAt;
  final DateTime updatedAt;

  Map<String, dynamic> toJson() => {
    'id': id,
    'receiptId': receiptId,
    'name': name,
    'quantity': quantity,
    'unitPrice': unitPrice,
    'total': total,
    'confidence': confidence,
    'version': version,
    'createdAt': createdAt.toUtc().toIso8601String(),
    'updatedAt': updatedAt.toUtc().toIso8601String(),
    'deletedAt': null,
  };
}

class ReceiptResource {
  const ReceiptResource({
    required this.id,
    required this.storagePath,
    required this.currencyCode,
    required this.ocrProvider,
    required this.reviewRequired,
    required this.status,
    required this.version,
    required this.createdAt,
    required this.updatedAt,
    this.transactionId,
    this.merchant,
    this.detectedTotal,
    this.purchasedAt,
    this.confidence,
    this.rawText,
    this.imageSha256,
    this.archivedAt,
    this.lineItems = const [],
  });

  factory ReceiptResource.fromDatabase(Map<String, dynamic> row) =>
      ReceiptResource(
        id: row['id'] as String,
        transactionId: row['transaction_id'] as String?,
        storagePath: row['storage_path'] as String,
        merchant: row['merchant'] as String?,
        detectedTotal: row['detected_total'] as int?,
        purchasedAt: row['purchased_at'] == null
            ? null
            : DateTime.parse(row['purchased_at'] as String),
        currencyCode: row['currency_code'] as String,
        confidence: (row['confidence'] as num?)?.toDouble(),
        ocrProvider: row['ocr_provider'] as String,
        reviewRequired: row['review_required'] as bool,
        rawText: row['raw_text'] as String?,
        imageSha256: row['image_sha256'] as String?,
        status: row['status'] as String,
        version: row['row_version'] as int,
        createdAt: DateTime.parse(row['created_at'] as String),
        updatedAt: DateTime.parse(row['updated_at'] as String),
        archivedAt: row['archived_at'] == null
            ? null
            : DateTime.parse(row['archived_at'] as String),
      );

  final String id;
  final String? transactionId;
  final String storagePath;
  final String? merchant;
  final int? detectedTotal;
  final DateTime? purchasedAt;
  final String currencyCode;
  final double? confidence;
  final String ocrProvider;
  final bool reviewRequired;
  final String? rawText;
  final String? imageSha256;
  final String status;
  final int version;
  final DateTime createdAt;
  final DateTime updatedAt;
  final DateTime? archivedAt;
  final List<ReceiptLineItemResource> lineItems;

  ReceiptResource withLineItems(List<ReceiptLineItemResource> items) =>
      ReceiptResource(
        id: id,
        transactionId: transactionId,
        storagePath: storagePath,
        merchant: merchant,
        detectedTotal: detectedTotal,
        purchasedAt: purchasedAt,
        currencyCode: currencyCode,
        confidence: confidence,
        ocrProvider: ocrProvider,
        reviewRequired: reviewRequired,
        rawText: rawText,
        imageSha256: imageSha256,
        status: status,
        version: version,
        createdAt: createdAt,
        updatedAt: updatedAt,
        archivedAt: archivedAt,
        lineItems: items,
      );

  Map<String, dynamic> toJson() => {
    'id': id,
    'transactionId': transactionId,
    'storagePath': storagePath,
    'merchant': merchant,
    'detectedTotal': detectedTotal,
    'purchasedAt': purchasedAt?.toUtc().toIso8601String(),
    'currencyCode': currencyCode,
    'confidence': confidence,
    'ocrProvider': ocrProvider,
    'reviewRequired': reviewRequired,
    'rawText': rawText,
    'imageSha256': imageSha256,
    'status': status,
    'version': version,
    'createdAt': createdAt.toUtc().toIso8601String(),
    'updatedAt': updatedAt.toUtc().toIso8601String(),
    'deletedAt': archivedAt?.toUtc().toIso8601String(),
    'lineItems': lineItems.map((item) => item.toJson()).toList(),
  };
}

class ReceiptLineItemInput {
  const ReceiptLineItemInput({
    required this.name,
    required this.quantity,
    required this.total,
    this.unitPrice,
    this.confidence,
  });

  factory ReceiptLineItemInput.fromJson(Object? value) {
    if (value is! Map) throw const FormatException('Invalid receipt line.');
    final json = Map<String, dynamic>.from(value);
    if (json.keys.any(
      (key) => !{
        'name',
        'quantity',
        'unitPrice',
        'total',
        'confidence',
      }.contains(key),
    )) {
      throw const FormatException('Invalid receipt line fields.');
    }
    final quantity = json['quantity'] ?? 1;
    final unitPrice = json['unitPrice'];
    final total = json['total'];
    final confidence = json['confidence'];
    if (quantity is! num ||
        !quantity.isFinite ||
        quantity <= 0 ||
        quantity > 1000000 ||
        (unitPrice != null &&
            (unitPrice is! int || unitPrice < 0 || unitPrice > maxMoney)) ||
        total is! int ||
        total <= 0 ||
        total > maxMoney ||
        (confidence != null &&
            (confidence is! num ||
                !confidence.isFinite ||
                confidence < 0 ||
                confidence > 1))) {
      throw const FormatException('Invalid receipt line values.');
    }
    if (unitPrice is int && (quantity * unitPrice - total).abs() > 1) {
      throw const FormatException('Receipt line total does not match.');
    }
    return ReceiptLineItemInput(
      name: requiredText(json['name'], 200, 'Invalid receipt line name.'),
      quantity: quantity.toDouble(),
      unitPrice: unitPrice as int?,
      total: total,
      confidence: confidence == null ? null : (confidence as num).toDouble(),
    );
  }

  final String name;
  final double quantity;
  final int? unitPrice;
  final int total;
  final double? confidence;

  Map<String, dynamic> toJson() => {
    'name': name,
    'quantity': quantity,
    'unitPrice': unitPrice,
    'total': total,
    'confidence': confidence,
  };
}

class CreateReceiptRequest {
  const CreateReceiptRequest(this.rpcJson);

  factory CreateReceiptRequest.fromJson(Object? value) {
    if (value is! Map) throw const FormatException('Invalid JSON body.');
    final json = Map<String, dynamic>.from(value);
    const allowed = {
      'transactionId',
      'storagePath',
      'merchant',
      'detectedTotal',
      'purchasedAt',
      'currencyCode',
      'confidence',
      'ocrProvider',
      'reviewRequired',
      'rawText',
      'imageSha256',
      'lineItems',
    };
    if (json.keys.any((key) => !allowed.contains(key))) {
      throw const FormatException('Invalid receipt fields.');
    }
    final path = json['storagePath'];
    final total = json['detectedTotal'];
    final confidence = json['confidence'];
    final provider = json['ocrProvider'];
    final review = json['reviewRequired'];
    final lines = json['lineItems'] ?? const <Object>[];
    if (path is! String ||
        path.length > 1024 ||
        path.contains('..') ||
        !RegExp(
          r'^[^/]+/(ocr|receipts)/.+\.(jpe?g|png|webp)$',
          caseSensitive: false,
        ).hasMatch(path) ||
        (total != null && (total is! int || total <= 0 || total > maxMoney)) ||
        (confidence != null &&
            (confidence is! num ||
                !confidence.isFinite ||
                confidence < 0 ||
                confidence > 1)) ||
        provider is! String ||
        !receiptProviders.contains(provider) ||
        review is! bool ||
        lines is! List ||
        lines.length > 100) {
      throw const FormatException('Invalid receipt data.');
    }
    final transaction = json['transactionId'];
    final purchasedAt = json['purchasedAt'];
    final currency = json['currencyCode'];
    final rawText = json['rawText'];
    final hash = json['imageSha256'];
    if ((transaction != null && transaction is! String) ||
        (purchasedAt != null &&
            (purchasedAt is! String ||
                DateTime.tryParse(purchasedAt) == null)) ||
        currency is! String ||
        !RegExp(r'^[A-Z]{3}$').hasMatch(currency) ||
        (rawText != null && (rawText is! String || rawText.length > 32000)) ||
        (hash != null &&
            (hash is! String || !RegExp(r'^[0-9a-f]{64}$').hasMatch(hash)))) {
      throw const FormatException('Invalid receipt metadata.');
    }
    return CreateReceiptRequest({
      'p_transaction_id': transaction == null
          ? null
          : validateUuid(transaction as String),
      'p_storage_path': path,
      'p_merchant': _optionalText(json['merchant'], 160),
      'p_detected_total': total,
      'p_purchased_at': purchasedAt,
      'p_currency_code': currency,
      'p_confidence': confidence,
      'p_ocr_provider': provider,
      'p_review_required': review,
      'p_raw_text': rawText,
      'p_image_sha256': hash,
      'p_line_items': lines
          .map(ReceiptLineItemInput.fromJson)
          .map((item) => item.toJson())
          .toList(),
    });
  }

  final Map<String, dynamic> rpcJson;
}

class UpdateReceiptRequest {
  const UpdateReceiptRequest(this._json);

  factory UpdateReceiptRequest.fromJson(Object? value) {
    if (value is! Map) throw const FormatException('Invalid JSON body.');
    final json = Map<String, dynamic>.from(value);
    const allowed = {
      'expectedVersion',
      'merchant',
      'detectedTotal',
      'purchasedAt',
      'reviewRequired',
      'lineItems',
    };
    if (json.keys.any((key) => !allowed.contains(key)) ||
        !json.keys.toSet().containsAll(allowed)) {
      throw const FormatException('Invalid receipt review fields.');
    }
    final expectedVersion = json['expectedVersion'];
    final total = json['detectedTotal'];
    final purchasedAt = json['purchasedAt'];
    final reviewRequired = json['reviewRequired'];
    final lines = json['lineItems'];
    if (expectedVersion is! int ||
        expectedVersion < 1 ||
        (total != null && (total is! int || total <= 0 || total > maxMoney)) ||
        (purchasedAt != null &&
            (purchasedAt is! String ||
                DateTime.tryParse(purchasedAt) == null)) ||
        reviewRequired is! bool ||
        lines is! List ||
        lines.length > 100) {
      throw const FormatException('Invalid receipt review data.');
    }
    return UpdateReceiptRequest({
      'p_expected_version': expectedVersion,
      'p_merchant': _optionalText(json['merchant'], 160),
      'p_detected_total': total,
      'p_purchased_at': purchasedAt,
      'p_review_required': reviewRequired,
      'p_line_items': lines
          .map(ReceiptLineItemInput.fromJson)
          .map((item) => item.toJson())
          .toList(),
    });
  }

  final Map<String, dynamic> _json;

  Map<String, dynamic> toRpcJson(String receiptId) => {
    'p_id': validateUuid(receiptId),
    ..._json,
  };
}

class FindDuplicateReceiptRequest {
  const FindDuplicateReceiptRequest(this.rpcJson);

  factory FindDuplicateReceiptRequest.fromJson(Object? value) {
    if (value is! Map) throw const FormatException('Invalid JSON body.');
    final json = Map<String, dynamic>.from(value);
    if (json.keys.any(
      (key) =>
          !{'imageSha256', 'merchant', 'purchasedAt', 'total'}.contains(key),
    )) {
      throw const FormatException('Invalid duplicate fields.');
    }
    final hash = json['imageSha256'];
    final merchant = _optionalText(json['merchant'], 160);
    final purchased = json['purchasedAt'];
    final total = json['total'];
    final validHash =
        hash is String && RegExp(r'^[0-9a-f]{64}$').hasMatch(hash);
    final validFuzzy =
        merchant != null &&
        purchased is String &&
        DateTime.tryParse(purchased) != null &&
        total is int &&
        total > 0 &&
        total <= maxMoney;
    if (!validHash && !validFuzzy) {
      throw const FormatException('Insufficient duplicate receipt data.');
    }
    return FindDuplicateReceiptRequest({
      'p_image_sha256': validHash ? hash : null,
      'p_merchant': merchant,
      'p_purchased_at': validFuzzy ? purchased : null,
      'p_total': validFuzzy ? total : null,
    });
  }

  final Map<String, dynamic> rpcJson;
}

String? _optionalText(Object? value, int maxLength) {
  if (value == null) return null;
  if (value is! String || value.trim().length > maxLength) {
    throw const FormatException('Invalid optional text.');
  }
  final text = value.trim();
  return text.isEmpty ? null : text;
}
