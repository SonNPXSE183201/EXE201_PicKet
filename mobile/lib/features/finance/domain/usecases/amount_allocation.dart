/// Largest-remainder allocation using BigInt to avoid 64-bit multiplication overflow.
List<int> allocateAmount(int amount, List<int> available) {
  final total = available.fold(0, (sum, value) => sum + value);
  if (amount <= 0 || available.any((value) => value < 0) || amount > total) {
    throw ArgumentError('Số tiền phân bổ vượt phần còn lại.');
  }
  final denominator = BigInt.from(total);
  final quotients = <int>[], remainders = <BigInt>[];
  for (final value in available) {
    final product = BigInt.from(amount) * BigInt.from(value);
    quotients.add((product ~/ denominator).toInt());
    remainders.add(product % denominator);
  }
  final order = List.generate(available.length, (i) => i)
    ..sort((a, b) {
      final compare = remainders[b].compareTo(remainders[a]);
      return compare == 0 ? a.compareTo(b) : compare;
    });
  final remaining = amount - quotients.fold(0, (sum, value) => sum + value);
  for (var i = 0; i < remaining; i++) {
    quotients[order[i]]++;
  }
  return quotients;
}
