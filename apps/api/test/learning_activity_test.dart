import 'package:picket_api/src/learning_activity.dart';
import 'package:test/test.dart';

void main() {
  test(
    'activity accepts explicit review/practice fields without owner or XP',
    () {
      expect(
        validateLearningActivityRequest({
          'events': [
            {
              'kind': 'review',
              'lessonId': 'picket.vi.financial.v1.01',
              'contentVersion': 1,
              'offset': 7,
            },
          ],
        }),
        hasLength(1),
      );
      for (final event in [
        {
          'kind': 'review',
          'lessonId': 'picket.vi.financial.v1.01',
          'contentVersion': 1,
          'offset': 8,
        },
        {'kind': 'practice', 'weekStart': '2026-10-20', 'skipped': true},
        {
          'kind': 'practice',
          'weekStart': '2026-10-19',
          'skipped': false,
          'xp': 999,
        },
      ]) {
        expect(
          () => validateLearningActivityRequest({
            'events': [event],
          }),
          throwsFormatException,
        );
      }
    },
  );
  test('activity response rejects malformed or duplicate identities', () {
    expect(
      validateLearningActivityDocument({
        'reviews': <Object>[],
        'practice': [
          {'weekStart': '2026-10-19', 'skipped': false},
        ],
      })['practice'],
      hasLength(1),
    );
    expect(
      () => validateLearningActivityDocument({
        'reviews': <Object>[],
        'practice': [
          {'weekStart': '2026-10-19', 'skipped': 'false'},
        ],
      }),
      throwsFormatException,
    );
    expect(
      () => validateLearningActivityDocument({
        'reviews': <Object>[],
        'practice': [
          {'weekStart': '2026-10-19', 'skipped': false},
          {'weekStart': '2026-10-19', 'skipped': true},
        ],
      }),
      throwsFormatException,
    );
  });
}
