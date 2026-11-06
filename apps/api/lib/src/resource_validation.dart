const maxMoney = 9000000000000;

String requiredText(Object? value, int maxLength, String message) {
  if (value is! String ||
      value.trim().isEmpty ||
      value.trim().length > maxLength) {
    throw FormatException(message);
  }
  return value.trim();
}

String validateUuid(String value) {
  const pattern =
      '[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-'
      '[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-'
      '[0-9a-fA-F]{12}';
  if (RegExp(pattern).firstMatch(value)?.group(0) != value) {
    throw const FormatException('Invalid resource identifier.');
  }
  return value;
}

String validateCurrencyCode(Object? value) {
  if (value is! String || !RegExp(r'^[A-Z]{3}$').hasMatch(value)) {
    throw const FormatException('Invalid currency code.');
  }
  return value;
}

String validateIdempotencyKey(String? value) {
  if (value == null ||
      value.length < 8 ||
      value.length > 128 ||
      !RegExp(r'^[A-Za-z0-9._:-]+$').hasMatch(value)) {
    throw const FormatException('Invalid Idempotency-Key header.');
  }
  return value;
}
