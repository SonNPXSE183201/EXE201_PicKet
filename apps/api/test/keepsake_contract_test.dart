import 'package:picket_api/src/keepsake_contract.dart';
import 'package:test/test.dart';

void main() {
  const owner = '11111111-1111-4111-8111-111111111111';
  const item = '22222222-2222-4222-8222-222222222222';

  test('keepsake create maps validated fields to owned storage', () {
    final row = parseKeepsakeCreate({
      'id': item,
      'title': ' Máy ảnh ',
      'amount': 1200000,
      'purchasedAt': '2026-10-01T10:00:00Z',
      'category': 'Thiết bị',
      'mediaPath': '$owner/keepsakes/$item.jpg',
    }, owner);

    expect(row['user_id'], owner);
    expect(row['title'], 'Máy ảnh');
    expect(row['media_path'], '$owner/keepsakes/$item.jpg');
    expect(row['purchased_at'], '2026-10-01T10:00:00.000Z');
  });

  test('keepsake rejects another user media and unsafe update', () {
    expect(
      () => parseKeepsakeCreate({
        'id': item,
        'title': 'Máy ảnh',
        'amount': 1,
        'purchasedAt': '2026-10-01T10:00:00Z',
        'category': 'Thiết bị',
        'mediaPath': 'another-user/keepsakes/$item.jpg',
      }, owner),
      throwsFormatException,
    );
    expect(
      () => parseKeepsakeUpdate({'expectedVersion': 0, 'title': 'Mới'}, owner),
      throwsFormatException,
    );
    expect(
      () => parseKeepsakeUpdate({
        'expectedVersion': 2,
        'archivedAt': 'now',
      }, owner),
      throwsFormatException,
    );
  });
}
