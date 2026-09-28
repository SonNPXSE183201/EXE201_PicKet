class ReceiptTextLine {
  const ReceiptTextLine({
    required this.text,
    this.confidence,
    this.left,
    this.top,
    this.right,
    this.bottom,
  });

  final String text;
  final double? confidence;
  final double? left, top, right, bottom;
}

class ReceiptDraft {
  const ReceiptDraft({
    required this.rawText,
    this.merchant,
    this.amount,
    this.date,
    this.merchantConfidence,
    this.amountConfidence,
    this.dateConfidence,
    this.recognizedLineCount = 0,
    this.needsFallback = false,
    this.reviewReason,
  });

  final String rawText;
  final String? merchant;
  final int? amount;
  final DateTime? date;
  final double? merchantConfidence, amountConfidence, dateConfidence;
  final int recognizedLineCount;

  /// True when the local result is too weak to prefill a critical field.
  /// Callers can offer server OCR, recapture, or manual entry.
  final bool needsFallback;
  final String? reviewReason;
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

String _normalized(String value) => value
    .toLowerCase()
    .replaceAll('tổng', 'tong')
    .replaceAll('cộng', 'cong')
    .replaceAll('thành', 'thanh')
    .replaceAll('toán', 'toan')
    .replaceAll('tiền', 'tien')
    .replaceAll('tạm', 'tam')
    .replaceAll('thừa', 'thua')
    .replaceAll('đơn', 'don')
    .replaceAll('địa', 'dia')
    .replaceAll('chỉ', 'chi')
    .replaceAll(RegExp(r'\s+'), ' ')
    .trim();

double _confidence(ReceiptTextLine line, [double fallback = 0.75]) =>
    (line.confidence ?? fallback).clamp(0.0, 1.0);

class _AmountCandidate {
  const _AmountCandidate(this.amount, this.confidence);
  final int amount;
  final double confidence;
}

class _MerchantCandidate {
  const _MerchantCandidate(this.value, this.confidence);
  final String value;
  final double confidence;
}

ReceiptDraft parseReceipt(String raw) => parseReceiptLines(
  raw
      .split('\n')
      .map((line) => line.trim())
      .where((line) => line.isNotEmpty)
      .map((line) => ReceiptTextLine(text: line)),
  rawText: raw,
);

ReceiptDraft parseReceiptLines(
  Iterable<ReceiptTextLine> recognizedLines, {
  String? rawText,
}) {
  final lines = recognizedLines
      .where((line) => line.text.trim().isNotEmpty)
      .map(
        (line) => ReceiptTextLine(
          text: line.text.trim(),
          confidence: line.confidence,
          left: line.left,
          top: line.top,
          right: line.right,
          bottom: line.bottom,
        ),
      )
      .toList(growable: false);
  final raw = rawText ?? lines.map((line) => line.text).join('\n');
  final maxBottom = lines
      .where((line) => line.bottom != null)
      .map((line) => line.bottom!)
      .fold<double>(0, (largest, value) => value > largest ? value : largest);

  final amountCandidates = <_AmountCandidate>[];
  final totalPattern = RegExp(
    r'tong\s*(cong|tien)?|thanh\s*toan|phai\s*tra|grand\s*total|total\s*due|amount\s*due|^total\b',
  );
  final rejectedTotalPattern = RegExp(
    r'subtotal|tam\s*tinh|tien\s*khach|tien\s*thua|change|tendered|cash\s*received',
  );

  for (var index = 0; index < lines.length; index++) {
    final line = lines[index];
    final normalized = _normalized(line.text);
    if (!totalPattern.hasMatch(normalized) ||
        rejectedTotalPattern.hasMatch(normalized)) {
      continue;
    }

    var source = line;
    var onKeywordLine = true;
    var matches = RegExp(r'\d[\d.,\s]*').allMatches(line.text).toList();
    if (matches.isEmpty && index + 1 < lines.length) {
      final next = lines[index + 1];
      if (RegExp(
        r'^\s*[\d.,\s]+\s*(đ|₫|vnd)?\s*$',
        caseSensitive: false,
      ).hasMatch(next.text)) {
        source = next;
        onKeywordLine = false;
        matches = RegExp(r'\d[\d.,\s]*').allMatches(next.text).toList();
      }
    }
    if (matches.isEmpty) continue;
    final amount = parseReceiptMoney(matches.last.group(0)!);
    if (amount == null) continue;

    var score = 0.52 + _confidence(source) * 0.22;
    score += onKeywordLine ? 0.14 : 0.08;
    if (maxBottom > 0 && (source.bottom ?? 0) / maxBottom >= 0.55) {
      score += 0.08;
    }
    if (RegExp(r'tong\s*cong|thanh\s*toan|phai\s*tra').hasMatch(normalized)) {
      score += 0.04;
    }
    amountCandidates.add(_AmountCandidate(amount, score.clamp(0.0, 1.0)));
  }
  amountCandidates.sort((a, b) => b.confidence.compareTo(a.confidence));
  final selectedAmount = amountCandidates.firstOrNull;

  DateTime? date;
  double? dateConfidence;
  final datePattern = RegExp(r'\b(\d{1,2})[/-](\d{1,2})[/-](\d{4})\b');
  for (final line in lines) {
    final match = datePattern.firstMatch(line.text);
    if (match == null) continue;
    final day = int.parse(match[1]!);
    final month = int.parse(match[2]!);
    final year = int.parse(match[3]!);
    final candidate = DateTime(year, month, day);
    if (candidate.day == day &&
        candidate.month == month &&
        year >= 2000 &&
        year <= DateTime.now().year + 1) {
      date = candidate;
      dateConfidence = _confidence(line, 0.8);
      break;
    }
  }

  final merchantCandidates = <_MerchantCandidate>[];
  for (var index = 0; index < lines.length; index++) {
    final line = lines[index];
    final text = line.text;
    final normalized = _normalized(text);
    if (text.length < 3 ||
        !RegExp(r'[A-Za-zÀ-ỹ]').hasMatch(text) ||
        RegExp(
          r'hoa\s*don|receipt|invoice|mst|tax|dia\s*chi|address|hotline|tel\b|ngay\b|date\b|tong|subtotal|thanh\s*toan',
        ).hasMatch(normalized)) {
      continue;
    }
    final digits = RegExp(r'\d').allMatches(text).length;
    if (digits > text.length / 3) continue;

    final relativeTop = maxBottom > 0 && line.top != null
        ? (line.top! / maxBottom).clamp(0.0, 1.0)
        : (index / (lines.isEmpty ? 1 : lines.length)).clamp(0.0, 1.0);
    var score = _confidence(line) * 0.45 + (1 - relativeTop) * 0.35 + 0.1;
    final letters = text.replaceAll(RegExp(r'[^A-Za-zÀ-ỹ]'), '');
    if (letters.length >= 4 && letters == letters.toUpperCase()) score += 0.1;
    merchantCandidates.add(_MerchantCandidate(text, score.clamp(0.0, 1.0)));
  }
  merchantCandidates.sort((a, b) => b.confidence.compareTo(a.confidence));
  final selectedMerchant = merchantCandidates.firstOrNull;

  String? reviewReason;
  if (raw.trim().isEmpty || lines.isEmpty) {
    reviewReason = 'Không nhận diện được chữ trong ảnh.';
  } else if (selectedAmount == null) {
    reviewReason = 'Không tìm thấy tổng tiền cần thanh toán.';
  } else if (selectedAmount.confidence < 0.7) {
    reviewReason = 'Tổng tiền có độ tin cậy thấp.';
  } else if (lines.length < 3) {
    reviewReason = 'Ảnh có quá ít dòng chữ để kiểm tra kết quả.';
  }

  return ReceiptDraft(
    rawText: raw,
    merchant: selectedMerchant?.value,
    amount: selectedAmount?.amount,
    date: date,
    merchantConfidence: selectedMerchant?.confidence,
    amountConfidence: selectedAmount?.confidence,
    dateConfidence: dateConfidence,
    recognizedLineCount: lines.length,
    needsFallback: reviewReason != null,
    reviewReason: reviewReason,
  );
}
