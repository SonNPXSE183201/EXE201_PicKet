import 'package:picket_api/src/receipt_contract.dart';
import 'package:test/test.dart';

void main() {
  const userId = '11111111-1111-4111-8111-111111111111';
  const transactionId = '22222222-2222-4222-8222-222222222222';
  const hash =
      'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';

  test('receipt create validates metadata and line totals', () {
    final request = CreateReceiptRequest.fromJson({
      'transactionId': transactionId,
      'storagePath': '$userId/receipts/receipt.jpg',
      'merchant': ' Picket Store ',
      'detectedTotal': 45000,
      'purchasedAt': '2026-10-09T08:00:00.000Z',
      'currencyCode': 'VND',
      'confidence': 0.91,
      'ocrProvider': 'pp-ocr',
      'reviewRequired': false,
      'rawText': 'TOTAL 45000',
      'imageSha256': hash,
      'lineItems': [
        {
          'name': 'Coffee',
          'quantity': 1,
          'unitPrice': 45000,
          'total': 45000,
          'confidence': 0.9,
        },
      ],
    });
    expect(request.rpcJson['p_merchant'], 'Picket Store');
    expect(request.rpcJson['p_line_items'], hasLength(1));
  });

  test('receipt create preserves the OCR review flag for the database', () {
    final request = CreateReceiptRequest.fromJson({
      'transactionId': transactionId,
      'storagePath': '$userId/receipts/needs-review.jpg',
      'merchant': 'Picket Test',
      'detectedTotal': 25000,
      'currencyCode': 'VND',
      'confidence': 0.4,
      'ocrProvider': 'ml-kit',
      'reviewRequired': true,
      'lineItems': const <Object>[],
    });
    expect(request.rpcJson['p_review_required'], isTrue);
    expect(request.rpcJson['p_confidence'], 0.4);
  });

  test('receipt create rejects inconsistent line totals', () {
    expect(
      () => CreateReceiptRequest.fromJson({
        'storagePath': '$userId/receipts/receipt.jpg',
        'currencyCode': 'VND',
        'ocrProvider': 'ml-kit',
        'reviewRequired': true,
        'lineItems': [
          {'name': 'Coffee', 'quantity': 2, 'unitPrice': 10000, 'total': 15000},
        ],
      }),
      throwsFormatException,
    );
  });

  test('duplicate lookup accepts exact hash or complete fuzzy key', () {
    expect(
      FindDuplicateReceiptRequest.fromJson({
        'imageSha256': hash,
      }).rpcJson['p_image_sha256'],
      hash,
    );
    expect(
      FindDuplicateReceiptRequest.fromJson({
        'merchant': 'Picket',
        'purchasedAt': '2026-10-09T08:00:00Z',
        'total': 45000,
      }).rpcJson['p_total'],
      45000,
    );
    expect(
      () => FindDuplicateReceiptRequest.fromJson({'merchant': 'Picket'}),
      throwsFormatException,
    );
  });

  test('receipt review maps versioned replacement lines', () {
    final request = UpdateReceiptRequest.fromJson({
      'expectedVersion': 3,
      'merchant': ' Picket reviewed ',
      'detectedTotal': 50000,
      'purchasedAt': null,
      'reviewRequired': false,
      'lineItems': [
        {'name': 'Coffee', 'quantity': 2, 'unitPrice': 25000, 'total': 50000},
      ],
    });
    final rpc = request.toRpcJson(transactionId);
    expect(rpc['p_id'], transactionId);
    expect(rpc['p_expected_version'], 3);
    expect(rpc['p_merchant'], 'Picket reviewed');
    expect(rpc['p_line_items'], hasLength(1));
  });

  test('receipt review rejects missing version and inconsistent lines', () {
    expect(
      () => UpdateReceiptRequest.fromJson({
        'merchant': 'Picket',
        'detectedTotal': 50000,
        'purchasedAt': null,
        'reviewRequired': false,
        'lineItems': const <Object>[],
      }),
      throwsFormatException,
    );
  });
}
