import 'package:picket_api/src/ocr_job_contract.dart';
import 'package:test/test.dart';

void main() {
  const key = '11111111-1111-4111-8111-111111111111';

  test('OCR fallback request accepts a private receipt image path', () {
    final request = CreateOcrFallbackJobRequest.fromJson({
      'storagePath': '22222222-2222-4222-8222-222222222222/ocr/receipt.jpg',
      'localConfidence': 0.42,
      'idempotencyKey': key,
    });
    expect(request.toRpcJson(), {
      'p_storage_path': '22222222-2222-4222-8222-222222222222/ocr/receipt.jpg',
      'p_local_confidence': 0.42,
      'p_idempotency_key': key,
    });
  });

  test('OCR fallback request rejects traversal and unsupported files', () {
    for (final path in [
      'user/ocr/../secret.jpg',
      'user/receipt.jpg',
      'user/ocr/receipt.pdf',
    ]) {
      expect(
        () => CreateOcrFallbackJobRequest.fromJson({
          'storagePath': path,
          'localConfidence': 0.5,
          'idempotencyKey': key,
        }),
        throwsFormatException,
      );
    }
  });

  test('OCR fallback request rejects confidence outside zero to one', () {
    for (final confidence in [-0.1, 1.1, double.nan]) {
      expect(
        () => CreateOcrFallbackJobRequest.fromJson({
          'storagePath': 'user/ocr/receipt.png',
          'localConfidence': confidence,
          'idempotencyKey': key,
        }),
        throwsFormatException,
      );
    }
  });
}
