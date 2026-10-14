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
