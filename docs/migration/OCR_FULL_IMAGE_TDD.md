# OCR full-image picker TDD evidence

<!-- canonical-design -->
> Chuẩn thiết kế duy nhất: [PICKET-DESIGN.md](../../PICKET-DESIGN.md). Tài liệu này là checkpoint/nghiên cứu theo ngày; hiện trạng và backlog nằm tại [PROJECT_STATUS](../PROJECT_STATUS.md) và [BACKLOG](../BACKLOG.md).


## Source and user journey

This fix was derived from the Android emulator receipt test on 2026-10-14.

As a user scanning a long receipt, I want the complete image passed to OCR so
that the merchant header and payable total are not removed by a fixed crop.

## RED / GREEN report

| Stage | Command | Result | Evidence |
| --- | --- | --- | --- |
| RED | `npm exec -- tsx --test src/core/ocr/image-picker-policy.test.ts` | Expected failure | `Cannot find module './image-picker-policy'` before the policy existed. |
| GREEN | `npm exec -- tsx --test src/core/ocr/image-picker-policy.test.ts` | 2/2 pass | Picker disables editing and has no fixed `aspect`. |
| Regression | `npm run test:ocr` | 20/20 pass | Picker policy, receipt parser, and server-result mapping tests pass together. |
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
test.

## Production server-fallback evidence

The first production fallback run completed in the worker but left amount
blank because the PP-OCR provider intentionally returns receipt fields as null
and exposes the recognized content through `rawText`. A RED test reproduced
the missing mapping before `parseServerOcrResult` was added.

| Stage | Command or journey | Result | Evidence |
| --- | --- | --- | --- |
| RED | `npm exec -- tsx --test src/core/ocr/server-result.test.ts` | Expected failure | `Cannot find module './server-result'` before the mapper existed. |
| GREEN | `npm exec -- tsx --test src/core/ocr/server-result.test.ts` | 2/2 pass | Null structured fields fall back to parsed `rawText`; valid structured fields still take precedence. |
| Production build | Forced release bundle with `EXPO_PUBLIC_API_URL=https://api.51-79-207-154.sslip.io` | Pass | APK SHA-256 `AF7608E40CF1DD63619AEC03E69544ACF45BFEDD4616131CB05898518AB05022`; bundle contains the production API URL. |
| Android E2E | Pixel 5 emulator → public CORD receipt → consent → private upload → server OCR | Pass | Merchant `Nasi Campur Bali`, amount `1591600`, and `OCR máy chủ: completed` appeared in the review form. |
| Worker | Production `ocr-worker` logs | Pass | Worker reported exactly one processed job during the test window. |

The review screen was not submitted, so the test did not create a production
transaction or receipt.

## Guarantees and known gaps

- The picker no longer forces a destructive crop for camera or library input.
- The full selected receipt is passed to the local OCR adapter.
- Clear Vietnamese totals continue to parse locally without an upload.
- Low-contrast receipts may still require PP-OCR fallback.
- Consent, private upload, polling, worker processing, and result replacement
  are verified end to end against production from the release APK.
- ML Kit still needs a physical low-RAM Android benchmark and a larger
  anonymized Vietnamese receipt corpus before the local-model row is verified.
