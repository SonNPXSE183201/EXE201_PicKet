# Settings foundation implementation — 23 October 2026

<!-- canonical-design -->
> Chuẩn thiết kế duy nhất: [PICKET-DESIGN.md](../../PICKET-DESIGN.md). Tài liệu này là checkpoint/nghiên cứu theo ngày; hiện trạng và backlog nằm tại [PROJECT_STATUS](../PROJECT_STATUS.md) và [BACKLOG](../BACKLOG.md).


Source: [approved implementation plan](MOBILE_SETTINGS_LEARNING_AI_PLAN_20261022.md).
This is the first SET-01..03 increment specified at the end of the plan, not a
completion claim for P1–P5. Existing Android bug fixes remain separate work.

## Implemented

- SET-01: [screen inventory](MOBILE_SETTINGS_INVENTORY_20261023.md) and
  [667 candidate strings](MOBILE_SETTINGS_STRING_CANDIDATES_20261023.json),
  scanning 74 TSX source files. This is a candidate list; dynamic validation,
  notifications and native prompts still require manual coverage in SET-04.
- SET-02 foundation: semantic light/dark roles, `AppAppearanceProvider`,
  `useAppTheme`, style-factory hook, `useColorScheme`, native root background,
  versioned device storage, foreground locale refresh and startup hydration.
- SET-03 foundation: stable, isolated i18next instance, bundled vi/en preview
  dictionaries, placeholder/key parity, plural forms, locale normalization,
  currency formatting without conversion, date-only and explicit-zone instant
  formatting. Language/theme updates do not key/remount the auth/finance tree.
- Development-only `/settings-preview`: semantic surfaces, disabled/error/success
  states, example balances and dates, and a text draft retained in component state
  while selecting appearance/language. Production access redirects to Home.
- CI/mobile scripts now include `test:settings`.

Device overrides take precedence over account defaults, then system values in
the pure resolution policy. Runtime currently passes no account defaults; wiring
profile defaults and optional API settings belongs to SET-04/05. A stored `system`
mode deliberately follows the device instead of the account default. No settings
are sent to the existing preferences API. No AI consent is created or restored.

Storage errors retain existing records, report an unavailable-settings state and
disable edits until read retry succeeds. Writes serialize and publish only after
SecureStore succeeds. This device-level record contains only appearance/language
preferences, not financial data or account identities.

## Verification evidence

| Check | Actual result |
| --- | --- |
| Initial settings/formatter run | RED: both modules missing before implementation |
| Settings + i18n + semantic palette tests | 8/8 passed |
| Full `tsx --test 'src/**/*.test.ts'` | 430/430 passed |
| TypeScript | Passed |
| ESLint | Passed with 25 existing warnings; zero errors |
| Android production Metro/Hermes export | Passed |
| Expo Android prebuild | Passed; native `automatic` theme support configured |
| Gradle Kotlin + merged manifest check | Passed, 1m36s; SDK57 prebuilt Localization/SystemUI linked |

Native verification uses `:app:compileReleaseKotlin :app:processReleaseMainManifest`.
An earlier attempt to target module-specific Kotlin tasks failed because Expo SDK57
uses prebuilt modules with no corresponding source Gradle projects; it was replaced
with the application integration check. This is not a full APK/AAB/device acceptance.

RED checkpoint: `4080c01`. GREEN implementation checkpoint is recorded in git
history as `feat(mobile): add settings theme and localization foundations`.
Checkpoints intentionally exclude the pre-existing Android fixes and user files.

Registry audit reports 10 advisories in the Expo tooling/router dependency tree
(6 moderate, 4 high); none name the four newly added packages. No broad dependency
upgrade or `audit fix --force` was performed during this scoped change.

## Next gates

- SET-04: migrate shared UI, auth/lock, all user screens and notification/error
  copy. Existing static palette imports and Vietnamese strings have not yet been
  migrated. Do not claim the entire app supports dark mode or English.
- SET-05: profile defaults/API/storage/backup compatibility in staging.
- Real Android acceptance: cold start, system changes on resume, large fonts,
  TalkBack, contrast in actual rendering, native bars/keyboard, draft retention,
  owner switches and `Intl.PluralRules` support in Hermes. Node tests do not prove
  device engine support. Use a maintained polyfill if target-engine checks fail.
- P2–P5: lesson review, deterministic finance fixtures, staging, AI consent,
  provider evaluation/budget and a real pilot remain separate gated milestones.

No production deployment, Play publication, paid AI requests or financial writes
were performed. Previously delivered code 7 AAB predates this settings increment.

Rollback: remove the new provider wrapper and preview route, restore native
`userInterfaceStyle: light`, and rebuild native after dependency changes. The
versioned settings record can remain ignored on device; no financial schema or
ledger data needs rollback.
