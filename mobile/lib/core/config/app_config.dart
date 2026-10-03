import 'dart:convert';
import 'package:flutter/foundation.dart';

abstract final class AppConfig {
  static const environment = String.fromEnvironment(
    'APP_ENV',
    defaultValue: 'development',
  );
  static const supabaseUrl = String.fromEnvironment('SUPABASE_URL');
  static const supabaseKey = String.fromEnvironment('SUPABASE_PUBLISHABLE_KEY');
  static const authRedirect = 'com.picket.mobile://auth/callback';
  static bool get configured =>
      supabaseUrl.isNotEmpty && supabaseKey.isNotEmpty;
  static void validate() {
    if (kReleaseMode && environment != 'production') {
      throw StateError('Release yêu cầu APP_ENV=production.');
    }
    if (environment == 'production' && !configured) {
      throw StateError('Thiếu cấu hình Supabase production.');
    }
    if (configured) {
      final uri = Uri.tryParse(supabaseUrl);
      final localDevelopment =
          environment != 'production' &&
          uri?.scheme == 'http' &&
          const {'localhost', '127.0.0.1', '10.0.2.2'}.contains(uri?.host);
      if (uri == null ||
          uri.host.isEmpty ||
          (uri.scheme != 'https' && !localDevelopment)) {
        throw StateError(
          'Supabase phải dùng HTTPS; development chỉ cho phép localhost, 127.0.0.1 hoặc 10.0.2.2.',
        );
      }
    }
    if (supabaseKey.split('.').length == 3) {
      try {
        final claims =
            jsonDecode(
                  utf8.decode(
                    base64Url.decode(
                      base64Url.normalize(supabaseKey.split('.')[1]),
                    ),
                  ),
                )
                as Map;
        if (claims['role'] != 'anon') {
          throw const FormatException('Invalid client role');
        }
      } catch (_) {
        throw StateError(
          'Chỉ dùng publishable key hoặc anon key cho ứng dụng.',
        );
      }
    }
    if (supabaseKey.startsWith('sb_secret_')) {
      throw StateError('Không được dùng secret key trong ứng dụng.');
    }
  }
}
