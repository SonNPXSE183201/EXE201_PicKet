String money(int amount) {
  final digits = amount.abs().toString().replaceAllMapped(
    RegExp(r'(\d)(?=(\d{3})+(?!\d))'),
    (match) => '${match[1]}.',
  );
  return '${amount < 0 ? '-' : ''}$digits ₫';
}

String shortDate(DateTime date) =>
    '${date.day.toString().padLeft(2, '0')}/${date.month.toString().padLeft(2, '0')}/${date.year}';
String? requiredText(String? value) => value == null || value.trim().isEmpty
    ? 'Vui lòng điền thông tin này'
    : null;
String? validateMoney(String? value, {bool allowZero = false}) {
  final amount = int.tryParse(value ?? '');
  return amount == null ||
          amount < (allowZero ? 0 : 1) ||
          amount > 9000000000000
      ? 'Nhập số tiền nguyên hợp lệ bằng VND'
      : null;
}
