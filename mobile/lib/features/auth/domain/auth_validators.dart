final RegExp _emailPattern = RegExp(r'^[^\s@]+@[^\s@]+\.[^\s@]+$');

String normalizeEmail(String value) => value.trim().toLowerCase();

String? validateEmail(String? value) {
  final normalized = normalizeEmail(value ?? '');
  return _emailPattern.hasMatch(normalized) ? null : 'Nhập email hợp lệ';
}

String? validatePassword(String? value, {bool requireStrong = true}) {
  final password = value ?? '';
  if (!requireStrong) return password.isEmpty ? 'Nhập mật khẩu' : null;
  if (password.length < 12) return 'Mật khẩu cần ít nhất 12 ký tự';
  if (!RegExp(r'[A-Za-z]').hasMatch(password) ||
      !RegExp(r'[0-9]').hasMatch(password)) {
    return 'Mật khẩu cần có cả chữ và số';
  }
  return null;
}

String? validateOtp(String? value) =>
    RegExp(r'^\d{6,8}$').hasMatch((value ?? '').trim())
    ? null
    : 'Mã xác nhận gồm 6–8 chữ số';
