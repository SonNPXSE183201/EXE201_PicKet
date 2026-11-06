bool parseLearningAiConsent(Object? value) {
  if (value is! Map || value.length != 1 || value['accepted'] is! bool) {
    throw const FormatException('One explicit accepted boolean is required.');
  }
  return value['accepted'] as bool;
}

Map<String, dynamic> validateLearningAiConsent(Object? value) {
  if (value is! Map<String, dynamic> ||
      value['accepted'] is! bool ||
      value['generation'] is! int ||
      (value['generation'] as int) < 0 ||
      value['policyVersion'] != 1) {
    throw const FormatException('Invalid consent response.');
  }
  return {
    'accepted': value['accepted'],
    'generation': value['generation'],
    'policyVersion': 1,
  };
}
