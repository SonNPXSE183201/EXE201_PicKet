import 'package:picket_api/src/resource_validation.dart';

List<String> parseTransactionSplitIds(String? value) {
  if (value == null || value.isEmpty) {
    throw const FormatException('Transaction IDs are required.');
  }
  final ids = value.split(',');
  if (ids.length > 25 || ids.toSet().length != ids.length) {
    throw const FormatException('Provide 1 to 25 unique transaction IDs.');
  }
  for (final id in ids) {
    validateUuid(id);
  }
  return ids;
}
