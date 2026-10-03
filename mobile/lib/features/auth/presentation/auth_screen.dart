import 'dart:async';

import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../data/auth_gateway.dart';
import '../domain/auth_validators.dart';

enum AuthMode { login, register, otp, recovery }

class AuthScreen extends StatefulWidget {
  const AuthScreen({
    super.key,
    this.recovery = false,
    this.onRecovered,
    this.gateway,
  });

  final bool recovery;
  final VoidCallback? onRecovered;
  final AuthGateway? gateway;

  @override
  State<AuthScreen> createState() => _AuthScreenState();
}

class _AuthScreenState extends State<AuthScreen> {
  final _formKey = GlobalKey<FormState>();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  final _confirmPasswordController = TextEditingController();
  final _tokenController = TextEditingController();

  late final AuthGateway _gateway;
  late AuthMode _mode;
  Timer? _resendTimer;
  bool _busy = false;
  bool _termsAccepted = false;
  bool _obscurePassword = true;
  bool _obscureConfirmation = true;
  int _resendSeconds = 0;
  String? _message;

  @override
  void initState() {
    super.initState();
    _mode = widget.recovery ? AuthMode.recovery : AuthMode.login;
    _gateway = widget.gateway ?? SupabaseAuthGateway(Supabase.instance.client);
  }

  @override
  void dispose() {
    _resendTimer?.cancel();
    _emailController.dispose();
    _passwordController.dispose();
    _confirmPasswordController.dispose();
    _tokenController.dispose();
    super.dispose();
  }

  Future<void> _run(Future<void> Function() action) async {
    if (_busy) return;
    setState(() {
      _busy = true;
      _message = null;
    });
    try {
      await action();
    } catch (error) {
      if (mounted) setState(() => _message = authMessage(error));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _submit() async {
    if (!(_formKey.currentState?.validate() ?? false)) return;

    await _run(() async {
      switch (_mode) {
        case AuthMode.login:
          await _gateway.signIn(
            email: normalizeEmail(_emailController.text),
            password: _passwordController.text,
          );
          return;
        case AuthMode.register:
          if (!_termsAccepted) {
            setState(() => _message = 'Bạn cần đồng ý với điều khoản sử dụng.');
            return;
          }
          final result = await _gateway.register(
            email: normalizeEmail(_emailController.text),
            password: _passwordController.text,
          );
          if (!mounted) return;
          if (result.requiresVerification) {
            setState(() {
              _mode = AuthMode.otp;
              _message = 'Mã xác thực đã được gửi tới email của bạn.';
            });
            _startResendCountdown();
          } else {
            setState(() => _message = 'Tài khoản đã được tạo thành công.');
          }
          return;
        case AuthMode.otp:
          await _gateway.verifySignup(
            email: normalizeEmail(_emailController.text),
            token: _tokenController.text.trim(),
          );
          return;
        case AuthMode.recovery:
          await _gateway.updatePassword(_passwordController.text);
          if (!mounted) return;
          setState(() => _message = 'Mật khẩu đã được cập nhật.');
          widget.onRecovered?.call();
          return;
      }
    });
  }

  Future<void> _forgotPassword() async {
    final error = validateEmail(_emailController.text);
    if (error != null) {
      setState(() => _message = error);
      return;
    }
    await _run(() async {
      await _gateway.requestPasswordReset(
        normalizeEmail(_emailController.text),
      );
      if (mounted) {
        setState(() {
          _message =
              'Nếu email tồn tại, liên kết đặt lại mật khẩu đã được gửi.';
        });
      }
    });
  }

  Future<void> _resendOtp() async {
    if (_resendSeconds > 0) return;
    await _run(() async {
      await _gateway.resendSignup(normalizeEmail(_emailController.text));
      if (!mounted) return;
      setState(() => _message = 'Một mã xác thực mới đã được gửi.');
      _startResendCountdown();
    });
  }

  Future<void> _googleSignIn() async {
    await _run(() async {
      final opened = await _gateway.signInWithGoogle();
      if (!opened && mounted) {
        setState(() => _message = 'Không thể mở trang đăng nhập Google.');
      }
    });
  }

  void _startResendCountdown() {
    _resendTimer?.cancel();
    setState(() => _resendSeconds = 60);
    _resendTimer = Timer.periodic(const Duration(seconds: 1), (timer) {
      if (!mounted || _resendSeconds <= 1) {
        timer.cancel();
        if (mounted) setState(() => _resendSeconds = 0);
        return;
      }
      setState(() => _resendSeconds--);
    });
  }

  void _switchMode(AuthMode mode) {
    _formKey.currentState?.reset();
    _passwordController.clear();
    _confirmPasswordController.clear();
    _tokenController.clear();
    _resendTimer?.cancel();
    setState(() {
      _mode = mode;
      _message = null;
      _resendSeconds = 0;
    });
  }

  String get _title => switch (_mode) {
    AuthMode.login => 'Chào mừng trở lại',
    AuthMode.register => 'Tạo tài khoản Picket',
    AuthMode.otp => 'Xác thực email',
    AuthMode.recovery => 'Đặt mật khẩu mới',
  };

  String get _subtitle => switch (_mode) {
    AuthMode.login => 'Đăng nhập để tiếp tục quản lý tài chính.',
    AuthMode.register => 'Bắt đầu hành trình tài chính của riêng bạn.',
    AuthMode.otp => 'Nhập mã đã gửi tới ${_emailController.text.trim()}.',
    AuthMode.recovery => 'Mật khẩu mới cần có ít nhất 12 ký tự.',
  };

  String get _primaryLabel => switch (_mode) {
    AuthMode.login => 'Đăng nhập',
    AuthMode.register => 'Đăng ký',
    AuthMode.otp => 'Xác thực',
    AuthMode.recovery => 'Cập nhật mật khẩu',
  };

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Scaffold(
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(24),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 460),
              child: Form(
                key: _formKey,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Icon(
                      Icons.receipt_long,
                      size: 52,
                      color: theme.colorScheme.primary,
                    ),
                    const SizedBox(height: 12),
                    Text(
                      'Picket',
                      textAlign: TextAlign.center,
                      style: theme.textTheme.headlineMedium?.copyWith(
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                    const SizedBox(height: 28),
                    Text(
                      _title,
                      style: theme.textTheme.headlineSmall?.copyWith(
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Text(_subtitle, style: theme.textTheme.bodyLarge),
                    const SizedBox(height: 24),
                    if (_mode != AuthMode.recovery)
                      TextFormField(
                        key: const Key('auth-email'),
                        controller: _emailController,
                        enabled: !_busy && _mode != AuthMode.otp,
                        keyboardType: TextInputType.emailAddress,
                        autofillHints: const [AutofillHints.email],
                        decoration: const InputDecoration(
                          labelText: 'Email',
                          prefixIcon: Icon(Icons.email_outlined),
                        ),
                        validator: (value) => validateEmail(value ?? ''),
                      ),
                    if (_mode == AuthMode.otp) ...[
                      const SizedBox(height: 16),
                      TextFormField(
                        key: const Key('auth-otp'),
                        controller: _tokenController,
                        enabled: !_busy,
                        keyboardType: TextInputType.number,
                        textAlign: TextAlign.center,
                        maxLength: 8,
                        decoration: const InputDecoration(
                          labelText: 'Mã OTP',
                          prefixIcon: Icon(Icons.pin_outlined),
                        ),
                        validator: (value) => validateOtp(value ?? ''),
                      ),
                    ],
                    if (_mode != AuthMode.otp) ...[
                      if (_mode != AuthMode.recovery)
                        const SizedBox(height: 16),
                      TextFormField(
                        key: const Key('auth-password'),
                        controller: _passwordController,
                        enabled: !_busy,
                        obscureText: _obscurePassword,
                        autofillHints: _mode == AuthMode.login
                            ? const [AutofillHints.password]
                            : const [AutofillHints.newPassword],
                        decoration: InputDecoration(
                          labelText: _mode == AuthMode.recovery
                              ? 'Mật khẩu mới'
                              : 'Mật khẩu',
                          prefixIcon: const Icon(Icons.lock_outline),
                          suffixIcon: IconButton(
                            onPressed: () => setState(
                              () => _obscurePassword = !_obscurePassword,
                            ),
                            icon: Icon(
                              _obscurePassword
                                  ? Icons.visibility_outlined
                                  : Icons.visibility_off_outlined,
                            ),
                          ),
                        ),
                        validator: (value) {
                          if (_mode == AuthMode.login) {
                            return (value ?? '').isEmpty
                                ? 'Vui lòng nhập mật khẩu.'
                                : null;
                          }
                          return validatePassword(value ?? '');
                        },
                      ),
                    ],
                    if (_mode == AuthMode.register ||
                        _mode == AuthMode.recovery) ...[
                      const SizedBox(height: 16),
                      TextFormField(
                        key: const Key('auth-confirm-password'),
                        controller: _confirmPasswordController,
                        enabled: !_busy,
                        obscureText: _obscureConfirmation,
                        decoration: InputDecoration(
                          labelText: 'Nhập lại mật khẩu',
                          prefixIcon: const Icon(Icons.lock_reset_outlined),
                          suffixIcon: IconButton(
                            onPressed: () => setState(
                              () =>
                                  _obscureConfirmation = !_obscureConfirmation,
                            ),
                            icon: Icon(
                              _obscureConfirmation
                                  ? Icons.visibility_outlined
                                  : Icons.visibility_off_outlined,
                            ),
                          ),
                        ),
                        validator: (value) => value != _passwordController.text
                            ? 'Mật khẩu nhập lại không khớp.'
                            : null,
                      ),
                    ],
                    if (_mode == AuthMode.register)
                      CheckboxListTile(
                        contentPadding: EdgeInsets.zero,
                        value: _termsAccepted,
                        onChanged: _busy
                            ? null
                            : (value) => setState(
                                () => _termsAccepted = value ?? false,
                              ),
                        controlAffinity: ListTileControlAffinity.leading,
                        title: const Text(
                          'Tôi đồng ý với Điều khoản sử dụng và Chính sách riêng tư.',
                        ),
                      ),
                    if (_message != null) ...[
                      const SizedBox(height: 12),
                      Container(
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: theme.colorScheme.surfaceContainerHighest,
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: Text(_message!),
                      ),
                    ],
                    const SizedBox(height: 20),
                    FilledButton(
                      key: const Key('auth-submit'),
                      onPressed: _busy ? null : _submit,
                      child: _busy
                          ? const SizedBox.square(
                              dimension: 20,
                              child: CircularProgressIndicator(strokeWidth: 2),
                            )
                          : Text(_primaryLabel),
                    ),
                    if (_mode == AuthMode.login ||
                        _mode == AuthMode.register) ...[
                      const SizedBox(height: 12),
                      OutlinedButton.icon(
                        key: const Key('auth-google'),
                        onPressed: _busy ? null : _googleSignIn,
                        icon: const Icon(Icons.g_mobiledata, size: 28),
                        label: const Text('Tiếp tục với Google'),
                      ),
                    ],
                    if (_mode == AuthMode.login) ...[
                      TextButton(
                        onPressed: _busy ? null : _forgotPassword,
                        child: const Text('Quên mật khẩu?'),
                      ),
                      TextButton(
                        onPressed: _busy
                            ? null
                            : () => _switchMode(AuthMode.register),
                        child: const Text('Chưa có tài khoản? Đăng ký'),
                      ),
                    ],
                    if (_mode == AuthMode.register)
                      TextButton(
                        onPressed: _busy
                            ? null
                            : () => _switchMode(AuthMode.login),
                        child: const Text('Đã có tài khoản? Đăng nhập'),
                      ),
                    if (_mode == AuthMode.otp) ...[
                      TextButton(
                        key: const Key('auth-resend'),
                        onPressed: _busy || _resendSeconds > 0
                            ? null
                            : _resendOtp,
                        child: Text(
                          _resendSeconds > 0
                              ? 'Gửi lại mã sau ${_resendSeconds}s'
                              : 'Gửi lại mã',
                        ),
                      ),
                      TextButton(
                        onPressed: _busy
                            ? null
                            : () => _switchMode(AuthMode.register),
                        child: const Text('Đổi địa chỉ email'),
                      ),
                    ],
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
