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
    if (configured &&
        (Uri.tryParse(supabaseUrl)?.scheme != 'https' ||
            Uri.parse(supabaseUrl).host.isEmpty)) {
      throw StateError('Supabase phải dùng HTTPS.');
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
