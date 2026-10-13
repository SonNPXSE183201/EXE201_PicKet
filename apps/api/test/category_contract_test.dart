import 'package:picket_api/src/category_contract.dart';
import 'package:test/test.dart';

void main() {
  test('create category normalizes safe values', () {
    final request = CreateCategoryRequest.fromJson({
      'name': '  Giáo dục ',
      'kind': 'expense',
      'color': '#aabbcc',
      'icon': 'school',
    });
    expect(request.toDatabaseJson(), {
      'name': 'Giáo dục',
      'kind': 'expense',
      'color': '#AABBCC',
      'icon': 'school',
      'is_custom': true,
    });
    expect(request.toRpcJson('category-key-0001'), {
      'p_idempotency_key': 'category-key-0001',
      'p_name': 'Giáo dục',
      'p_kind': 'expense',
      'p_color': '#AABBCC',
      'p_icon': 'school',
    });
  });

  test('category rejects unknown fields and invalid kinds', () {
    expect(
      () => CreateCategoryRequest.fromJson({
        'name': 'Test',
        'kind': 'transfer',
      }),
      throwsFormatException,
    );
    expect(
      () => CreateCategoryRequest.fromJson({
        'name': 'Test',
        'kind': 'expense',
        'userId': 'forbidden',
      }),
      throwsFormatException,
    );
  });

  test('category update requires optimistic version', () {
    final request = UpdateCategoryRequest.fromJson({
      'expectedVersion': 2,
      'name': 'Học tập',
    });
    expect(request.expectedVersion, 2);
    expect(request.patch, {'name': 'Học tập'});
    expect(
      () => UpdateCategoryRequest.fromJson({'name': 'Missing version'}),
      throwsFormatException,
    );
  });
}
