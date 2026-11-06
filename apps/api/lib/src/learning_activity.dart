Map<String, dynamic> _review(Object? value) {
  if (value is! Map<String, dynamic> ||
      value.length != 3 ||
      value['lessonId'] is! String ||
      !RegExp(
        r'^picket\.vi\.financial\.v1\.(0[1-9]|1[0-2])$',
      ).hasMatch(value['lessonId'] as String) ||
      value['contentVersion'] != 1 ||
      !{7, 30}.contains(value['offset'])) {
    throw const FormatException('Invalid learning review.');
  }
  return value;
}

Map<String, dynamic> _practice(Object? value) {
  if (value is! Map<String, dynamic> ||
      value.length != 2 ||
      value['weekStart'] is! String ||
      value['skipped'] is! bool) {
    throw const FormatException('Invalid weekly practice.');
  }
  final raw = value['weekStart'] as String;
  final day = DateTime.tryParse('${raw}T00:00:00Z');
  if (!RegExp(r'^\d{4}-\d{2}-\d{2}$').hasMatch(raw) ||
      day == null ||
      day.weekday != DateTime.monday ||
      day.toIso8601String().substring(0, 10) != raw) {
    throw const FormatException('Invalid weekly practice day.');
  }
  return value;
}

List<Map<String, dynamic>> validateLearningActivityRequest(Object? value) {
  if (value is! Map ||
      value.length != 1 ||
      value['events'] is! List ||
      (value['events'] as List).length > 100) {
    throw const FormatException('Invalid learning activity request.');
  }
  return (value['events'] as List).map((Object? event) {
    if (event is! Map<String, dynamic>) {
      throw const FormatException('Invalid activity.');
    }
    final payload = {...event}..remove('kind');
    if (event['kind'] == 'review') {
      return {'kind': 'review', ..._review(payload)};
    }
    if (event['kind'] == 'practice') {
      return {'kind': 'practice', ..._practice(payload)};
    }
    throw const FormatException('Unknown learning activity.');
  }).toList();
}

Map<String, dynamic> validateLearningActivityDocument(Object? value) {
  if (value is! Map ||
      value['reviews'] is! List ||
      value['practice'] is! List ||
      (value['reviews'] as List).length > 1000 ||
      (value['practice'] as List).length > 1000) {
    throw const FormatException('Invalid cloud learning activity.');
  }
  final seen = <String>{};
  final reviews = (value['reviews'] as List).map((Object? row) {
    final result = _review(row);
    if (!seen.add(
      '${result['lessonId']}:${result['contentVersion']}:${result['offset']}',
    )) {
      throw const FormatException('Duplicate review.');
    }
    return result;
  }).toList();
  final practice = (value['practice'] as List).map((Object? row) {
    final result = _practice(row);
    if (!seen.add('week:${result['weekStart']}')) {
      throw const FormatException('Duplicate practice.');
    }
    return result;
  }).toList();
  return {'reviews': reviews, 'practice': practice};
}
