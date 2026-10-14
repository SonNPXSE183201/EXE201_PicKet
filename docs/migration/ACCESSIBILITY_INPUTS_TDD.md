# Expo accessible input names — TDD evidence

Date: 2026-10-14

## Source and user journey

Source roadmap: [`FEATURE_PARITY.md`](./FEATURE_PARITY.md), capability
`Accessibility` (P0).

As a TalkBack user, I want every editable field to keep a stable, descriptive
name before and after I enter a value, so that I can complete finance and
receipt forms without depending on placeholder text.

## RED / GREEN report

| Stage | Command | Result | Evidence |
| --- | --- | --- | --- |
| RED | `npm run test:ui --prefix apps/mobile` | Expected failure | New policy listed 27 unnamed `TextInput` instances across account, budget, category, receipt and transaction screens. Commit `fe821de`. |
| GREEN | `npm run test:ui --prefix apps/mobile` | 4/4 pass | Every Expo screen `TextInput` now has an explicit `accessibilityLabel`. Commit `dcff87d`. |
| Coverage | `npx tsx --test --experimental-test-coverage src/core/ui/*.test.ts` | 100% line/branch/function for the policy target | Four accessibility policy tests pass. |

## Test specification

| # | What is guaranteed | Test target | Type | Result |
| --- | --- | --- | --- | --- |
| 1 | Every interactive surface keeps a minimum 48 × 48 dp target | `accessibility-policy.test.ts` | Static policy | PASS |
| 2 | Screens cannot bypass the shared accessible Pressable | `accessibility-policy.test.ts` | Static policy | PASS |
| 3 | Every Expo `TextInput` has an explicit accessible name | `accessibility-policy.test.ts` | Static policy | PASS |
| 4 | Receipt line-item and split inputs include their item/category context | TypeScript + policy test | Static integration | PASS |

## Regression evidence

- Expo TypeScript: PASS.
- Expo ESLint: PASS.
- Expo tests: 32/32 PASS (`api`, `auth`, `billing`, `ocr`, `sync`, `ui`).
- Android Expo export: PASS, 1,462 modules bundled.
- Secret-pattern and `console.log` scans: no findings in the changed mobile scope.
- `git diff --check`: PASS.

## Known gaps

Static policy proves that controls expose names in code; it does not prove the
spoken order, pronunciation, keyboard behavior or focus transitions on a real
device. Accessibility therefore remains `in-progress` until the full screen
matrix passes TalkBack, large-font and physical-device testing.

## Loading and image semantics follow-up

As a TalkBack user, I want loading states and receipt images to explain their
purpose, so that a screen never appears silent while work is in progress and an
important receipt image is not announced as an unnamed graphic.

| Stage | Command | Result | Evidence |
| --- | --- | --- | --- |
| RED | `npm run test:ui --prefix apps/mobile` | Expected failure | Policy found 30 unnamed `ActivityIndicator` instances and two unnamed receipt images. Commit `66d1cd6`. |
| GREEN | `npm run test:ui --prefix apps/mobile` | 6/6 pass | Loading states now announce their concrete operation; receipt preview/detail images have stable names. Commit `6abfe97`. |
| Coverage | `npx tsx --test --experimental-test-coverage src/core/ui/*.test.ts` | 100% line/branch/function for the policy target | Six accessibility policy tests pass. |

Regression after the follow-up: Expo typecheck/lint, 34/34 tests and Android
export of 1,462 modules all passed. Secret-pattern, `console.log` and diff checks
had no findings.

## Pixel 5 TalkBack smoke

TalkBack was enabled on the Pixel 5 x86_64 AVD running Android 17 at font scale
100%. The installed production APK exposed the unauthenticated screen in this
logical order: heading and description, Email, Password, Sign in, Continue with
Google, Forgot password, Register. Both text fields and every action had a
stable accessible name, and the screen rendered without clipping.

This is partial device evidence only. The AVD had no authenticated session, and
the installed signed APK predates the two TDD increments above. Android refused
to replace it with the debug APK because the signatures differ; rebuilding the
current x86_64 production APK also requires restoring the ignored local
`apps/mobile/key.properties`. Full authenticated TalkBack traversal and a real
device therefore remain open gates.
