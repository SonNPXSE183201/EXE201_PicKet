import 'package:picket_api/src/profile_contract.dart';
import 'package:test/test.dart';

void main() {
  test('appearance preferences are optional, extensible and validated', () {
    expect(
      preferencesPatch({
        'theme_mode': 'dark',
        'language_mode': 'en',
        'color_scheme_id': 'ocean',
      }),
      {'theme_mode': 'dark', 'language_mode': 'en', 'color_scheme_id': 'ocean'},
    );
    expect(preferencesPatch({'language_mode': 'fr'}), {'language_mode': 'fr'});
    for (final patch in [
      {'theme_mode': 'sepia'},
      {'language_mode': 'EN invalid'},
      {'color_scheme_id': '../x'},
      {'theme_mode': true},
    ]) {
      expect(() => preferencesPatch(patch), throwsFormatException);
    }
  });
}
