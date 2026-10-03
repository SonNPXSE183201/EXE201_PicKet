import 'package:supabase_flutter/supabase_flutter.dart';

import '../../../core/config/app_config.dart';
import '../domain/auth_validators.dart';

class RegistrationResult {
  const RegistrationResult({required this.requiresVerification});
  final bool requiresVerification;
}

abstract interface class AuthGateway {
  Future<RegistrationResult> register({
    required String email,
    required String password,
  });
  Future<void> verifySignup({required String email, required String token});
  Future<void> resendSignup(String email);
  Future<void> signIn({required String email, required String password});
  Future<void> requestPasswordReset(String email);
  Future<void> updatePassword(String password);
  Future<bool> signInWithGoogle();
  Future<void> signOut();
}

class SupabaseAuthGateway implements AuthGateway {
  SupabaseAuthGateway(this.client);
  final SupabaseClient client;

  @override
  Future<RegistrationResult> register({
    required String email,
    required String password,
  }) async {
    final response = await client.auth.signUp(
      email: normalizeEmail(email),
      password: password,
      emailRedirectTo: AppConfig.authRedirect,
    );
    return RegistrationResult(requiresVerification: response.session == null);
  }

  @override
  Future<void> verifySignup({
    required String email,
    required String token,
  }) async {
    await client.auth.verifyOTP(
      email: normalizeEmail(email),
      token: token.trim(),
      type: OtpType.signup,
    );
  }

  @override
  Future<void> resendSignup(String email) async {
    await client.auth.resend(
      type: OtpType.signup,
      email: normalizeEmail(email),
      emailRedirectTo: AppConfig.authRedirect,
    );
  }

  @override
  Future<void> signIn({required String email, required String password}) =>
      client.auth.signInWithPassword(
        email: normalizeEmail(email),
        password: password,
      );

  @override
  Future<void> requestPasswordReset(String email) =>
      client.auth.resetPasswordForEmail(
        normalizeEmail(email),
        redirectTo: AppConfig.authRedirect,
      );

  @override
  Future<void> updatePassword(String password) =>
      client.auth.updateUser(UserAttributes(password: password));

  @override
  Future<bool> signInWithGoogle() => client.auth.signInWithOAuth(
    OAuthProvider.google,
    redirectTo: AppConfig.authRedirect,
    scopes: 'openid email profile',
  );

  @override
  Future<void> signOut() => client.auth.signOut(scope: SignOutScope.local);
}

String authMessage(Object error) {
  if (error is AuthException) {
    if (error.statusCode == '429' || error.code == 'over_request_rate_limit') {
      return 'Bạn thao tác quá nhanh. Vui lòng chờ một phút rồi thử lại.';
    }
    switch (error.code) {
      case 'otp_expired':
        return 'Mã xác nhận đã hết hạn. Hãy yêu cầu mã mới.';
      case 'email_not_confirmed':
        return 'Email chưa được xác nhận. Hãy kiểm tra hộp thư.';
      case 'weak_password':
        return 'Mật khẩu chưa đủ mạnh.';
      case 'validation_failed':
        return 'Thông tin chưa hợp lệ. Hãy kiểm tra lại.';
    }
    return 'Không xác thực được. Kiểm tra thông tin hoặc thử lại sau.';
  }
  return 'Không kết nối được dịch vụ. Hãy kiểm tra mạng.';
}
