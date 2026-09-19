import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../../core/config/app_config.dart';
import '../../../core/utils/formatters.dart';

class AuthScreen extends StatefulWidget {
  const AuthScreen({super.key, this.recovery = false, this.onRecovered});
  final bool recovery;
  final VoidCallback? onRecovered;
  @override
  State<AuthScreen> createState() => _AuthScreenState();
}

class _AuthScreenState extends State<AuthScreen> {
  final form = GlobalKey<FormState>();
  final email = TextEditingController(),
      password = TextEditingController(),
      token = TextEditingController();
  bool registering = false, busy = false, awaitingOtp = false;
  String? message;
  SupabaseClient get client => Supabase.instance.client;
  @override
  void dispose() {
    email.dispose();
    password.dispose();
    token.dispose();
    super.dispose();
  }

  Future<void> execute(Future<void> Function() action) async {
    setState(() {
      busy = true;
      message = null;
    });
    try {
      await action();
    } on AuthException catch (_) {
      if (mounted) {
        setState(
          () => message =
              'Không xác thực được. Kiểm tra thông tin hoặc thử lại sau.',
        );
      }
    } catch (_) {
      if (mounted) {
        setState(
          () => message = 'Không kết nối được dịch vụ. Hãy kiểm tra mạng.',
        );
      }
    } finally {
      if (mounted) setState(() => busy = false);
    }
  }

  Future<void> submit() async {
    if (!form.currentState!.validate()) return;
    await execute(() async {
      if (widget.recovery) {
        await client.auth.updateUser(UserAttributes(password: password.text));
        widget.onRecovered?.call();
      } else if (awaitingOtp) {
        await client.auth.verifyOTP(
          email: email.text.trim(),
          token: token.text.trim(),
          type: OtpType.signup,
        );
      } else if (registering) {
        final response = await client.auth.signUp(
          email: email.text.trim(),
          password: password.text,
          emailRedirectTo: AppConfig.authRedirect,
        );
        if (response.session == null && mounted) {
          setState(() {
            awaitingOtp = true;
            message =
                'Kiểm tra email để xác nhận tài khoản. Bạn cũng có thể nhập mã OTP nếu email cung cấp mã.';
          });
        }
      } else {
        await client.auth.signInWithPassword(
          email: email.text.trim(),
          password: password.text,
        );
      }
    });
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(title: const Text('picket.')),
    body: SafeArea(
      child: Form(
        key: form,
        child: ListView(
          padding: const EdgeInsets.all(28),
          children: [
            const SizedBox(height: 32),
            Text(
              widget.recovery
                  ? 'Đặt mật khẩu mới'
                  : awaitingOtp
                  ? 'Xác nhận email'
                  : registering
                  ? 'Bắt đầu cùng Picket'
                  : 'Mừng bạn trở lại',
              style: const TextStyle(fontSize: 30, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 12),
            const Text('Tài khoản của bạn, dữ liệu của bạn.'),
            const SizedBox(height: 28),
            if (!widget.recovery)
              TextFormField(
                controller: email,
                readOnly: awaitingOtp,
                autofillHints: const [AutofillHints.email],
                keyboardType: TextInputType.emailAddress,
                decoration: const InputDecoration(labelText: 'Email'),
                validator: (v) =>
                    v != null &&
                        RegExp(r'^[^\s@]+@[^\s@]+\.[^\s@]+$').hasMatch(v.trim())
                    ? null
                    : 'Nhập email hợp lệ',
              ),
            const SizedBox(height: 16),
            if (awaitingOtp)
              TextFormField(
                controller: token,
                decoration: const InputDecoration(labelText: 'Mã xác nhận'),
                keyboardType: TextInputType.number,
                validator: requiredText,
              )
            else
              TextFormField(
                controller: password,
                obscureText: true,
                autofillHints: [
                  registering || widget.recovery
                      ? AutofillHints.newPassword
                      : AutofillHints.password,
                ],
                decoration: const InputDecoration(labelText: 'Mật khẩu'),
                validator: (v) =>
                    v == null ||
                        v.length < (registering || widget.recovery ? 12 : 1)
                    ? 'Mật khẩu mới cần ít nhất 12 ký tự'
                    : null,
              ),
            if (message != null)
              Padding(
                padding: const EdgeInsets.symmetric(vertical: 16),
                child: Text(message!),
              ),
            const SizedBox(height: 24),
            FilledButton(
              onPressed: busy ? null : submit,
              child: Text(
                busy
                    ? 'Đang xử lý...'
                    : widget.recovery
                    ? 'Lưu mật khẩu'
                    : awaitingOtp
                    ? 'Xác nhận'
                    : registering
                    ? 'Đăng ký'
                    : 'Đăng nhập',
              ),
            ),
            if (!widget.recovery && !awaitingOtp) ...[
              TextButton(
                onPressed: busy
                    ? null
                    : () => setState(() {
                        registering = !registering;
                        message = null;
                      }),
                child: Text(
                  registering
                      ? 'Đã có tài khoản? Đăng nhập'
                      : 'Chưa có tài khoản? Đăng ký',
                ),
              ),
              TextButton(
                onPressed: busy
                    ? null
                    : () {
                        if (!RegExp(
                          r'^[^\s@]+@[^\s@]+\.[^\s@]+$',
                        ).hasMatch(email.text.trim())) {
                          setState(() => message = 'Nhập email ở trên trước.');
                          return;
                        }
                        execute(() async {
                          await client.auth.resetPasswordForEmail(
                            email.text.trim(),
                            redirectTo: AppConfig.authRedirect,
                          );
                          if (mounted) {
                            setState(
                              () => message =
                                  'Nếu email hợp lệ, hướng dẫn đặt lại mật khẩu sẽ được gửi đến bạn.',
                            );
                          }
                        });
                      },
                child: const Text('Quên mật khẩu?'),
              ),
            ],
            if (awaitingOtp)
              TextButton(
                onPressed: busy
                    ? null
                    : () => execute(() async {
                        await client.auth.resend(
                          type: OtpType.signup,
                          email: email.text.trim(),
                          emailRedirectTo: AppConfig.authRedirect,
                        );
                        if (mounted) {
                          setState(() => message = 'Đã yêu cầu gửi lại email.');
                        }
                      }),
                child: const Text('Gửi lại email xác nhận'),
              ),
          ],
        ),
      ),
    ),
  );
}
