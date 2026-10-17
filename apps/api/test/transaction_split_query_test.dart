import 'package:picket_api/src/transaction_split_query.dart';
import 'package:test/test.dart';

void main() {
  const id = '11111111-1111-4111-8111-111111111111';
  const second = '22222222-2222-4222-8222-222222222222';
  test('accepts distinct transaction IDs', () {
    expect(parseTransactionSplitIds('$id,$second'), [id, second]);
  });
  test('rejects malformed, duplicate and oversized requests', () {
    expect(() => parseTransactionSplitIds(null), throwsFormatException);
    expect(() => parseTransactionSplitIds('$id,$id'), throwsFormatException);
    expect(() => parseTransactionSplitIds('not-a-uuid'), throwsFormatException);
    expect(
      () => parseTransactionSplitIds(List.filled(26, id).join(',')),
      throwsFormatException,
    );
  });
}
