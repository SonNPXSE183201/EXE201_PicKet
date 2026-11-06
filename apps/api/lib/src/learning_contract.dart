class LearningAttemptRequest {
  LearningAttemptRequest._(this.lessonId, this.contentVersion, this.answers);
  factory LearningAttemptRequest.fromJson(Object? value) {
    if (value is! Map ||
        value.length != 3 ||
        value.keys.any(
          (key) => !{'lessonId', 'contentVersion', 'answers'}.contains(key),
        )) {
      throw const FormatException('Invalid learning attempt fields.');
    }
    final id = value['lessonId'];
    final version = value['contentVersion'];
    final answers = value['answers'];
    if (id is! String ||
        !RegExp(r'^[a-z0-9.]{1,120}$').hasMatch(id) ||
        version is! int ||
        version < 1 ||
        version > 1000000 ||
        answers is! List ||
        answers.length < 2 ||
        answers.length > 10 ||
        answers.any((answer) => answer is! int || answer < 0 || answer > 9)) {
      throw const FormatException('Invalid learning attempt.');
    }
    return LearningAttemptRequest._(id, version, List<int>.from(answers));
  }
  final String lessonId;
  final int contentVersion;
  final List<int> answers;
  Map<String, dynamic> toRpcJson(String key) => {
    'p_request_key': key,
    'p_lesson_id': lessonId,
    'p_content_version': contentVersion,
    'p_answers': answers,
  };
}

class LearningAttemptResult {
  LearningAttemptResult._(
    this.correct,
    this.total,
    this.awardedXp,
    this.replayed,
  );
  factory LearningAttemptResult.fromJson(Object? value) {
    if (value is! Map) throw const FormatException('Invalid learning result.');
    final correct = value['correct'];
    final total = value['total'];
    final xp = value['awardedXp'];
    final replayed = value['replayed'];
    if (correct is! int ||
        total is! int ||
        total < 2 ||
        total > 10 ||
        correct < 0 ||
        correct > total ||
        xp is! int ||
        !{0, 20}.contains(xp) ||
        replayed is! bool) {
      throw const FormatException('Invalid learning result.');
    }
    return LearningAttemptResult._(correct, total, xp, replayed);
  }
  final int correct;
  final int total;
  final int awardedXp;
  final bool replayed;
  Map<String, dynamic> toJson() => {
    'correct': correct,
    'total': total,
    'awardedXp': awardedXp,
    'replayed': replayed,
  };
}
