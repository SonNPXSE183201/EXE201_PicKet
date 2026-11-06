import 'package:picket_api/src/resource_validation.dart';

Map<String, dynamic> telemetryEvent(Object? value, {required bool anonymous}) {
  if (value is! Map<String, dynamic> ||
      value.keys.any(
        (k) => !{
          'id',
          'sessionId',
          'event',
          'environment',
          'version',
          'channel',
          'campaign',
        }.contains(k),
      )) {
    throw const FormatException('Invalid telemetry event.');
  }
  if (value['id'] is! String || value['sessionId'] is! String) {
    throw const FormatException('Invalid telemetry identifier.');
  }
  validateUuid(value['id'] as String);
  validateUuid(value['sessionId'] as String);
  final event = value['event'];
  if (!(anonymous
          ? {'landing_view', 'apk_click'}
          : {'app_open', 'first_open', 'meaningful_action'})
      .contains(event)) {
    throw const FormatException('Invalid telemetry event.');
  }
  final channel = anonymous ? 'landing' : value['channel'] ?? 'unknown';
  final environment = value['environment'] ?? 'production';
  if (!{'landing', 'direct', 'google_play', 'unknown'}.contains(channel) ||
      !{'production', 'test'}.contains(environment)) {
    throw const FormatException('Invalid telemetry dimensions.');
  }
  for (final key in ['version', 'campaign']) {
    if (value[key] != null &&
        (value[key] is! String ||
            (value[key] as String).length > (key == 'version' ? 40 : 120))) {
      throw const FormatException('Invalid telemetry dimensions.');
    }
  }
  if (!RegExp(
        r'^[a-zA-Z0-9_-]{0,120}$',
      ).hasMatch(value['campaign'] as String? ?? '') ||
      !RegExp(
        r'^[a-zA-Z0-9._+-]{0,40}$',
      ).hasMatch(value['version'] as String? ?? '')) {
    throw const FormatException('Invalid telemetry dimensions.');
  }
  return {...value, 'channel': channel, 'environment': environment};
}
