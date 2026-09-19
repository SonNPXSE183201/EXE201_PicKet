import '../entities/finance_data.dart';
import 'finance_actions.dart';

FinanceData renameCategory(FinanceData data, String previous, String next) {
  next = next.trim();
  if (!data.customCategories.contains(previous) ||
      next.isEmpty ||
      next.length > 80) {
    throw ArgumentError('Danh mục không hợp lệ.');
  }
  if (allCategories(
    data,
  ).any((c) => c != previous && c.toLowerCase() == next.toLowerCase())) {
    throw ArgumentError('Danh mục đã tồn tại.');
  }
  final json = data.toJson();
  for (final collection in ['entries', 'budgets', 'keepsakes']) {
    for (final item in json[collection] as List) {
      if (item['category'] == previous) item['category'] = next;
      for (final part in item['parts'] as List? ?? []) {
        if (part['category'] == previous) part['category'] = next;
      }
    }
  }
  json['customCategories'] = data.customCategories
      .map((c) => c == previous ? next : c)
      .toList();
  return FinanceData.fromJson(json);
}

FinanceData deleteCategory(FinanceData data, String category) {
  if (!data.customCategories.contains(category)) {
    throw ArgumentError('Không thể xóa danh mục mặc định.');
  }
  if (data.entries.any(
        (e) =>
            e.category == category ||
            e.parts.any((p) => p.category == category),
      ) ||
      data.budgets.any((b) => b.category == category) ||
      data.keepsakes.any((i) => i.category == category)) {
    throw ArgumentError(
      'Danh mục đang được sử dụng. Chuyển các giao dịch, ngân sách và món đồ sang danh mục khác trước.',
    );
  }
  return data.copyWith(
    customCategories: data.customCategories
        .where((c) => c != category)
        .toList(),
  );
}
