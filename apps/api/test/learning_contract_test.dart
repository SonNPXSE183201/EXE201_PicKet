import 'package:picket_api/src/learning_contract.dart';
import 'package:test/test.dart';

void main() {
  test(
    'learning request rejects owner assignment, missing answers and XP claims',
    () {
      final valid = {
        'lessonId': 'picket.vi.financial.v1.01',
        'contentVersion': 1,
        'answers': [1, 1, 2],
      };
      expect(LearningAttemptRequest.fromJson(valid).answers, [1, 1, 2]);
      for (final body in [
        {...valid, 'userId': 'another'},
        {...valid, 'xp': 999},
        {
          ...valid,
          'answers': [1, null, 2],
        },
        {...valid, 'contentVersion': 0},
        {...valid, 'answers': <Object?>[]},
      ]) {
        expect(
          () => LearningAttemptRequest.fromJson(body),
          throwsFormatException,
        );
      }
    },
  );
  test('attempt result validates grade, XP and replay metadata', () {
    expect(
      LearningAttemptResult.fromJson({
        'correct': 2,
        'total': 3,
        'awardedXp': 0,
        'replayed': true,
      }).correct,
      2,
    );
    for (final body in [
      {'correct': 4, 'total': 3, 'awardedXp': 20, 'replayed': false},
      {'correct': 2, 'total': 3, 'awardedXp': 999, 'replayed': false},
    ]) {
      expect(() => LearningAttemptResult.fromJson(body), throwsFormatException);
    }
  });
}
