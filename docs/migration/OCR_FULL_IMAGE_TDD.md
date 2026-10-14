# OCR full-image picker TDD evidence

## Source and user journey

This fix was derived from the Android emulator receipt test on 2026-10-14.

As a user scanning a long receipt, I want the complete image passed to OCR so
that the merchant header and payable total are not removed by a fixed crop.

## RED / GREEN report

| Stage | Command | Result | Evidence |
| --- | --- | --- | --- |
| RED | `npm exec -- tsx --test src/core/ocr/image-picker-policy.test.ts` | Expected failure | `Cannot find module './image-picker-policy'` before the policy existed. |
| GREEN | `npm exec -- tsx --test src/core/ocr/image-picker-policy.test.ts` | 2/2 pass | Picker disables editing and has no fixed `aspect`. |
| Regression | `npm run test:ocr` | 18/18 pass | Picker policy and receipt parser tests pass together. |
| Static checks | `npm run typecheck` and `npm run lint` | Pass | Expo mobile source type-checks and lints cleanly. |
| Android release | `gradlew.bat assembleRelease -PreactNativeArchitectures=x86_64` | Pass | Release APK rebuilt and installed on `emulator-5554`. |

## Emulator evidence

Before the fix, Expo Image Picker opened a `3:4` crop screen and a tall CORD
receipt lost its bottom payable-total section. After the fix, selecting an image
returns directly to Picket and preserves the full frame.

Observed local ML Kit results:

| Corpus sample | Merchant | Amount | OCR duration | Outcome |
| --- | --- | ---: | ---: | --- |
| Vietnamese synthetic, clear | `CUA HANG ANH DAO` | `250000` | 1423 ms | Local OCR passed. |
| CORD train 000, faded | `Nasi Campur Bali` | Not detected | 3046 ms | Requires review/server fallback. |
| SROIE example | `BOOK TA K (TAMAN DAYA) SDN BHD` | Not detected | 2562 ms | Requires review/server fallback. |

No fatal Android or React Native error was observed during the release smoke
test. The production API was unreachable from the emulator during this run, so
the server fallback UI/job path was not exercised.

## Guarantees and known gaps

- The picker no longer forces a destructive crop for camera or library input.
- The full selected receipt is passed to the local OCR adapter.
- Clear Vietnamese totals continue to parse locally without an upload.
- Low-contrast receipts may still require PP-OCR fallback.
- A follow-up production test must start the Picket API and OCR worker, enable
  the fallback build flag, and verify consent, private upload, polling, and
  result replacement end to end.
