class CompleteOnboardingRequest {
  const CompleteOnboardingRequest({
    required this.displayName,
    required this.persona,
    required this.goal,
    required this.currencyCode,
    required this.walletName,
    required this.openingBalance,
  });

  factory CompleteOnboardingRequest.fromJson(Object? value) {
    if (value is! Map) throw const FormatException('Invalid JSON body.');
    final json = Map<String, dynamic>.from(value);
    final displayName = _text(json, 'displayName', max: 120);
    final persona = _text(json, 'persona', max: 80);
    final goal = _text(json, 'goal', max: 120);
    final currencyCode = _text(json, 'currencyCode', max: 3).toUpperCase();
    final walletName = _text(json, 'walletName', max: 80);
    final openingBalance = json['openingBalance'];
    if (!RegExp(r'^[A-Z]{3}$').hasMatch(currencyCode) ||
        openingBalance is! int ||
        openingBalance.abs() > 9000000000000) {
      throw const FormatException('Invalid onboarding data.');
    }
    return CompleteOnboardingRequest(
      displayName: displayName,
      persona: persona,
      goal: goal,
      currencyCode: currencyCode,
      walletName: walletName,
      openingBalance: openingBalance,
    );
  }

  final String displayName;
  final String persona;
  final String goal;
  final String currencyCode;
  final String walletName;
  final int openingBalance;

  Map<String, dynamic> toRpcJson() => {
    'display_name': displayName,
    'persona': persona,
    'goal': goal,
    'currency_code': currencyCode,
    'wallet_name': walletName,
    'opening_balance': openingBalance,
  };
}

Map<String, dynamic> profilePatch(Object? value) => _patch(value, {
  'display_name': 120,
  'avatar_url': 2048,
  'locale': 16,
  'timezone': 80,
});

Map<String, dynamic> preferencesPatch(Object? value) {
  final patch = _patch(
    value,
    {
      'persona': 80,
      'goal': 120,
      'currency_code': 3,
    },
    booleans: {'hide_balance'},
  );
  final currency = patch['currency_code'];
  if (currency is String) {
    final normalized = currency.toUpperCase();
    if (!RegExp(r'^[A-Z]{3}$').hasMatch(normalized)) {
      throw const FormatException('Invalid currency code.');
    }
    patch['currency_code'] = normalized;
  }
  return patch;
}

Map<String, dynamic> _patch(
  Object? value,
  Map<String, int> strings, {
  Set<String> booleans = const {},
}) {
  if (value is! Map) throw const FormatException('Invalid JSON body.');
  final source = Map<String, dynamic>.from(value);
  if (source.isEmpty ||
      source.keys.any(
        (key) => !strings.containsKey(key) && !booleans.contains(key),
      )) {
    throw const FormatException('Invalid update fields.');
  }
  final result = <String, dynamic>{};
  for (final entry in source.entries) {
    if (booleans.contains(entry.key)) {
      if (entry.value is! bool) {
        throw const FormatException('Invalid update value.');
      }
      result[entry.key] = entry.value;
      continue;
    }
    if (entry.value is! String) {
      throw const FormatException('Invalid update value.');
    }
    final text = (entry.value as String).trim();
    if (text.isEmpty || text.length > strings[entry.key]!) {
      throw const FormatException('Invalid update value.');
    }
    result[entry.key] = text;
  }
  return result;
}

String _text(Map<String, dynamic> json, String key, {required int max}) {
  final value = json[key];
  if (value is! String || value.trim().isEmpty || value.trim().length > max) {
    throw const FormatException('Invalid onboarding data.');
  }
  return value.trim();
}
