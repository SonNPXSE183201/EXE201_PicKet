class ReceiptDraft {
  const ReceiptDraft({
    required this.rawText,
    this.merchant,
    this.amount,
    this.date,
  });
  final String rawText;
  final String? merchant;
  final int? amount;
  final DateTime? date;
}

int? parseReceiptMoney(String input) {
  var value = input.replaceAll(RegExp(r'[^0-9,.]'), '');
  if (RegExp(r'[,.]\d{2}$').hasMatch(value)) {
    value = value.substring(0, value.length - 3);
  }
  value = value.replaceAll(RegExp(r'[^0-9]'), '');
  final amount = int.tryParse(value);
  return amount != null && amount > 0 && amount <= 9000000000000
      ? amount
      : null;
}

ReceiptDraft parseReceipt(String raw) {
  final lines = raw
      .split('\n')
      .map((l) => l.trim())
      .where((l) => l.isNotEmpty)
      .toList();
  String normalized(String value) => value
      .toLowerCase()
      .replaceAll('tổng', 'tong')
      .replaceAll('cộng', 'cong')
      .replaceAll('thành', 'thanh')
      .replaceAll('toán', 'toan')
      .replaceAll('tiền', 'tien')
      .replaceAll('tạm', 'tam')
      .replaceAll('thừa', 'thua');
  int? total;
  for (var index = 0; index < lines.length; index++) {
    final line = normalized(lines[index]);
    if (!RegExp(
          r'tong cong|tong tien|thanh toan|grand total|total due|^total\b',
        ).hasMatch(line) ||
        RegExp(
          r'subtotal|tam tinh|tien khach|tien thua|change',
        ).hasMatch(line)) {
      continue;
    }
    final candidates = RegExp(r'\d[\d.,]*').allMatches(lines[index]).toList();
    if (candidates.isNotEmpty) {
      total = parseReceiptMoney(candidates.last.group(0)!);
    }
    if (total == null &&
        index + 1 < lines.length &&
        RegExp(
          r'^\s*[\d.,]+\s*(đ|₫|vnd)?\s*$',
          caseSensitive: false,
        ).hasMatch(lines[index + 1])) {
      total = parseReceiptMoney(lines[index + 1]);
    }
  }
  DateTime? date;
  final match = RegExp(
    r'\b(\d{1,2})[/-](\d{1,2})[/-](\d{4})\b',
  ).firstMatch(raw);
  if (match != null) {
    final day = int.parse(match[1]!),
        month = int.parse(match[2]!),
        year = int.parse(match[3]!);
    final candidate = DateTime(year, month, day);
    if (candidate.day == day &&
        candidate.month == month &&
        year >= 2000 &&
        year <= DateTime.now().year + 1) {
      date = candidate;
    }
  }
  final merchant = lines
      .where(
        (l) =>
            l.length >= 3 &&
            RegExp(r'[A-Za-zÀ-ỹ]').hasMatch(l) &&
            !RegExp(
              r'ho[aá] đơn|receipt|invoice|mst|tax',
              caseSensitive: false,
            ).hasMatch(l),
      )
      .firstOrNull;
  return ReceiptDraft(
    rawText: raw,
    merchant: merchant,
    amount: total,
    date: date,
  );
}
