import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/features/auth/data/auth_gateway.dart';
import 'package:mobile/features/auth/presentation/auth_screen.dart';

class FakeAuthGateway implements AuthGateway {
  String? registeredEmail;
  String? registeredPassword;
  String? verifiedToken;
  String? resetEmail;
  String? updatedPassword;
  int resendCount = 0;

  @override
  Future<RegistrationResult> register({
    required String email,
    required String password,
  }) async {
    registeredEmail = email;
    registeredPassword = password;
    return const RegistrationResult(requiresVerification: true);
  }

  @override
  Future<void> verifySignup({
    required String email,
    required String token,
  }) async {
    verifiedToken = token;
  }

  @override
  Future<void> resendSignup(String email) async => resendCount++;

  @override
  Future<void> signIn({
    required String email,
    required String password,
  }) async {}

  @override
  Future<void> requestPasswordReset(String email) async => resetEmail = email;

  @override
  Future<void> updatePassword(String password) async =>
      updatedPassword = password;

  @override
  Future<bool> signInWithGoogle() async => true;

  @override
  Future<void> signOut() async {}
}

void main() {
  Widget subject(FakeAuthGateway gateway) =>
      MaterialApp(home: AuthScreen(gateway: gateway));

  testWidgets('registration validates matching passwords then opens OTP step', (
    tester,
  ) async {
    final gateway = FakeAuthGateway();
    await tester.pumpWidget(subject(gateway));
    await tester.tap(find.text('Chưa có tài khoản? Đăng ký'));
    await tester.pump();

    await tester.enterText(
      find.byKey(const Key('auth-email')),
      ' USER@Example.com ',
    );
    await tester.enterText(
      find.byKey(const Key('auth-password')),
      'StrongPassword1',
    );
    await tester.enterText(
      find.byKey(const Key('auth-confirm-password')),
      'StrongPassword1',
    );
    await tester.tap(find.byType(Checkbox));
    await tester.ensureVisible(find.byKey(const Key('auth-submit')));
    await tester.tap(find.byKey(const Key('auth-submit')));
    await tester.pump();

    expect(gateway.registeredEmail, 'user@example.com');
    expect(find.text('Xác thực email'), findsOneWidget);
    expect(find.textContaining('Gửi lại mã sau'), findsOneWidget);
    await tester.pumpWidget(const SizedBox());
  });

  testWidgets('registration rejects mismatched confirmation', (tester) async {
    final gateway = FakeAuthGateway();
    await tester.pumpWidget(subject(gateway));
    await tester.tap(find.text('Chưa có tài khoản? Đăng ký'));
    await tester.pump();

    await tester.enterText(
      find.byKey(const Key('auth-email')),
      'user@example.com',
    );
    await tester.enterText(
      find.byKey(const Key('auth-password')),
      'StrongPassword1',
    );
    await tester.enterText(
      find.byKey(const Key('auth-confirm-password')),
      'DifferentPassword2',
    );
    await tester.tap(find.byType(Checkbox));
    await tester.ensureVisible(find.byKey(const Key('auth-submit')));
    await tester.tap(find.byKey(const Key('auth-submit')));
    await tester.pump();

    expect(find.text('Mật khẩu nhập lại không khớp.'), findsOneWidget);
    expect(gateway.registeredEmail, isNull);
  });

  testWidgets('OTP step verifies a valid token', (tester) async {
    final gateway = FakeAuthGateway();
    await tester.pumpWidget(subject(gateway));
    await tester.tap(find.text('Chưa có tài khoản? Đăng ký'));
    await tester.pump();
    await tester.enterText(
      find.byKey(const Key('auth-email')),
      'user@example.com',
    );
    await tester.enterText(
      find.byKey(const Key('auth-password')),
      'StrongPassword1',
    );
    await tester.enterText(
      find.byKey(const Key('auth-confirm-password')),
      'StrongPassword1',
    );
    await tester.tap(find.byType(Checkbox));
    await tester.ensureVisible(find.byKey(const Key('auth-submit')));
    await tester.tap(find.byKey(const Key('auth-submit')));
    await tester.pump();

    await tester.enterText(find.byKey(const Key('auth-otp')), '123456');
    await tester.ensureVisible(find.byKey(const Key('auth-submit')));
    await tester.tap(find.byKey(const Key('auth-submit')));
    await tester.pump();
    expect(gateway.verifiedToken, '123456');
    await tester.pumpWidget(const SizedBox());
  });

  testWidgets('forgot password normalizes email and shows generic result', (
    tester,
  ) async {
    final gateway = FakeAuthGateway();
    await tester.pumpWidget(subject(gateway));
    await tester.enterText(
      find.byKey(const Key('auth-email')),
      ' USER@Example.com ',
    );
    await tester.tap(find.text('Quên mật khẩu?'));
    await tester.pump();

    expect(gateway.resetEmail, 'user@example.com');
    expect(find.textContaining('Nếu email tồn tại'), findsOneWidget);
  });

  testWidgets('recovery requires confirmation and updates password', (
    tester,
  ) async {
    final gateway = FakeAuthGateway();
    var recovered = false;
    await tester.pumpWidget(
      MaterialApp(
        home: AuthScreen(
          recovery: true,
          gateway: gateway,
          onRecovered: () => recovered = true,
        ),
      ),
    );
    await tester.enterText(
      find.byKey(const Key('auth-password')),
      'StrongPassword1',
    );
    await tester.enterText(
      find.byKey(const Key('auth-confirm-password')),
      'StrongPassword1',
    );
    await tester.ensureVisible(find.byKey(const Key('auth-submit')));
    await tester.tap(find.byKey(const Key('auth-submit')));
    await tester.pump();

    expect(gateway.updatedPassword, 'StrongPassword1');
    expect(recovered, isTrue);
  });
}
