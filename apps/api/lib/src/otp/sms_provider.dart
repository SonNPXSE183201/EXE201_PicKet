import 'dart:convert';
import 'package:http/http.dart' as http;

/// Sends one SMS. Add a provider by implementing this and registering it in
/// [smsProviderFromEnvironment]; nothing else in the OTP flow changes.
abstract class SmsProvider {
  String get id;
  Future<void> send(String phoneE164, String message);
}

class SmsDeliveryException implements Exception {
  const SmsDeliveryException();
  @override
  String toString() => 'SMS could not be delivered.';
}

/// SpeedSMS (Vietnam) REST adapter. Enabled only when OTP_SMS_PROVIDER is
/// `speedsms` and a token/sender are configured.
class SpeedSmsProvider implements SmsProvider {
  SpeedSmsProvider({
    required this.token,
    required this.sender,
    http.Client? client,
  }) : _client = client ?? http.Client();
  final String token;
  final String sender;
  final http.Client _client;
  @override
  String get id => 'speedsms';

  @override
  Future<void> send(String phoneE164, String message) async {
    final response = await _client
        .post(
          Uri.https('api.speedsms.vn', '/index.php/sms/send'),
          headers: {
            'authorization': 'Basic ${base64Encode(utf8.encode('$token:x'))}',
            'content-type': 'application/json',
          },
          body: jsonEncode({
            'to': [phoneE164.replaceFirst('+', '')],
            'content': message,
            'sms_type': 5,
            'sender': sender,
          }),
        )
        .timeout(const Duration(seconds: 15));
    final body = response.statusCode == 200 ? jsonDecode(response.body) : null;
    if (body is! Map || body['status'] != 'success') {
      throw const SmsDeliveryException();
    }
  }
}

SmsProvider? smsProviderFromEnvironment(
  Map<String, String> env, {
  http.Client? client,
}) {
  switch (env['OTP_SMS_PROVIDER']) {
    case 'speedsms':
      final token = env['SPEEDSMS_TOKEN'] ?? '';
      final sender = env['SPEEDSMS_SENDER'] ?? '';
      if (token.length < 16 || sender.isEmpty) return null;
      return SpeedSmsProvider(token: token, sender: sender, client: client);
    default:
      return null;
  }
}
