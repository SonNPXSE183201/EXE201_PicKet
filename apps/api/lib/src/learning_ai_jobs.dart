import 'dart:io';

bool learningAiEnabled([Map<String, String>? values]) =>
    (values ?? Platform.environment)['LEARNING_AI_ENABLED'] == 'true';

bool validLearningAiId(String value) => RegExp(
  '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-'
  r'[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$',
).hasMatch(value);

class LearningAiRequest {
  const LearningAiRequest(this.scenarioId, this.locale);
  factory LearningAiRequest.fromJson(Object? value) {
    if (value is! Map ||
        value.length != 2 ||
        value['scenarioId'] != 'cash-gap-v1' ||
        !{'vi', 'en'}.contains(value['locale'])) {
      throw const FormatException(
        'Only fixed educational cases are supported.',
      );
    }
    return LearningAiRequest('cash-gap-v1', value['locale'] as String);
  }
  final String scenarioId;
  final String locale;
}

Map<String, dynamic> validateLearningAiJob(
  Object? value, {
  bool queued = false,
}) {
  if (value is! Map<String, dynamic> ||
      value['id'] is! String ||
      !validLearningAiId(value['id'] as String) ||
      !{
        'queued',
        'claimed',
        'dispatched',
        'completed',
        'failed',
        'cancelled',
        'expired',
      }.contains(value['status'])) {
    throw const FormatException('Invalid educational job.');
  }
  if (queued) return {'id': value['id'], 'status': value['status']};
  final ids = value['statementIds'];
  if (ids is! List ||
      ids.length > 3 ||
      ids.toSet().length != ids.length ||
      ids.any(
        (id) => !{'timing', 'buffer', 'incomplete-records'}.contains(id),
      ) ||
      (value['status'] != 'completed' && ids.isNotEmpty) ||
      (value['status'] == 'completed' && ids.isEmpty)) {
    throw const FormatException('Invalid approved educational result.');
  }
  return {
    'id': value['id'],
    'status': value['status'],
    'statementIds': ids.cast<String>(),
  };
}
