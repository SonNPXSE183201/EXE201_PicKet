# Public receipt OCR corpus — TDD evidence

<!-- canonical-design -->
> Chuẩn thiết kế duy nhất: [PICKET-DESIGN.md](../../PICKET-DESIGN.md). Tài liệu này là checkpoint/nghiên cứu theo ngày; hiện trạng và backlog nằm tại [PROJECT_STATUS](../PROJECT_STATUS.md) và [BACKLOG](../BACKLOG.md).


Date: 2026-10-14

## Scope and sources

Six public images were downloaded into the ignored local directory
`.artifacts/ocr-corpus/public`; no dataset image is committed to the repository.

| Source | Samples | Use | License / note |
| --- | ---: | --- | --- |
| [Vietnamese Document OCR samples](https://github.com/trungledang/vietnamese-document-ocr/tree/main/data/samples) | 3 | Vietnamese diacritics, narrow/rotated stress image and safe synthetic receipt | Repository declares these as synthetic demo data rather than customer documents. |
| [ICDAR 2019 SROIE](https://huggingface.co/datasets/jsdnrs/ICDAR2019-SROIE) | 1 | English/Malay scanned receipt with entity ground truth | CC BY 4.0; the dataset card states that sensitive receipt fields were blurred. |
| [CORD v2](https://huggingface.co/datasets/naver-clova-ix/cord-v2) | 2 | Real Indonesian restaurant receipts and annotated totals | CC BY 4.0. |

This is a deliberately small diagnostic corpus. It is not large or representative
enough to claim production OCR accuracy.

## Provider benchmark

The six images were copied to a temporary folder on the production VPS and sent
directly to the private `picket-ocr-provider-1` container. The provider remained
private, its bearer token was read only inside the container, and no Supabase or
production user data was created.

| Metric | Result |
| --- | ---: |
| Successful responses | 6/6 |
| Mean line confidence | 93.9%–99.3% |
| Minimum latency | 2,561 ms |
| Median latency | 3,941 ms |
| Mean latency | 4,567 ms |
| Maximum latency | 7,312 ms |

## TDD increments

As a receipt user, I want noisy OCR output to preserve the merchant, payable
total and date, so that a valid receipt is not silently saved with the wrong
transaction metadata.

| Stage | Evidence | Result |
| --- | --- | --- |
| RED totals | `npm run test:ocr` | Three public-output regressions failed: amount before terminal `DUE`, Vietnamese `Tng cng`, and rounded total following an earlier generic total. Commit `5b177f3`. |
| GREEN totals | `npm run test:ocr` | All 14 OCR tests passed; public-corpus payable totals improved from 3/6 to 6/6. Commit `49ef083`. |
| RED merchant | `npm run test:ocr` | Receipt headings/address lines were selected instead of merchants. Commits `ee0515d` and `904db11`. |
| GREEN merchant | `npm run test:ocr` | Parser rejects receipt headings including OCR-damaged `BIN LAI`, rejects clear address patterns and uses uppercase ratio rather than exact uppercase equality. Commit `fa58efb`. |

Final local corpus evaluation:

- Payable total: 6/6 exact.
- Date: 4/4 exact for samples with a date expectation.
- Merchant: 4/4 exact for samples with public/visible merchant ground truth.
- Review state: 6/6 did not require manual review after the fixes.

## Verification and remaining gates

- Expo typecheck and lint passed.
- All 39 Expo tests passed; the final OCR target passed 16/16.
- OCR unit target coverage was 100% lines, 88.68% branches and 95.45%
  functions for `receipt-parser.ts` (99.65% lines across the OCR target).
- Android export passed with 1,462 modules.
- All six images are present on the Pixel 5 emulator under
  `/sdcard/Download/picket-ocr-public`.

ML Kit device verification is still open: the installed production APK is at
the logged-out Auth Gate and predates this parser change. A current signed APK
and a manually authenticated test session are required before running the six
images through the capture screen. A physical low-RAM Android device and a
larger, anonymized Vietnamese real-receipt corpus remain required before either
ML Kit or the end-to-end OCR capability can be marked `verified`.

# Follow-up 2026-10-15: reject invalid provider dates

Journey: when PP-OCR returns a malformed structured date, the user should get
the valid date parsed from receipt text instead of a draft that fails API
validation on save.

| Guarantee | Test | RED | GREEN |
| --- | --- | --- | --- |
| Invalid text, impossible day, and impossible month from the provider fall back to the raw receipt date | `apps/mobile/src/core/ocr/server-result.test.ts` | OCR suite 22/23; new case failed for `not-a-date` | OCR suite 23/23 |
| A provider merchant over 160 characters or amount over the Dart API cap falls back to parsed receipt text | Same test | OCR suite 23/24; oversized merchant assertion failed | OCR suite 24/24 |

`npm run test:ocr --prefix apps/mobile` ran before and after the fix. The parser
now accepts only calendar-valid ISO date/date-time values and otherwise uses
the raw-text parser result. Structured merchant/amount values are also bounded
to the Dart receipt contract before they enter the draft. No production receipt
was written in this test.
No checkpoint commit was made because the user has not authorized committing.
# E2E follow-up 2026-10-16: receipt reference is not a product

The user approved using the currently signed-in test account. Expo x86_64 saved
the public synthetic receipt through capture → transaction → receipt, then read
back the stored image, merchant, total, date, `ml-kit` provider and 100%
confidence. Review removed a false product (`So chung tu: RC`, 99 VND) and
saved successfully. The test record remains in that account; no admin deletion
was attempted.

The parser regression test in `apps/mobile/src/core/ocr/receipt-parser.test.ts`
first failed (24/25) for `So chung tu: RC-0099` and `Số chứng từ: HD-12345`.
Adding `so chung tu` to rejected item labels made the same suite pass (25/25).
The full mobile suite passed 55/55, along with typecheck and lint. The fix has
not yet been installed in a new APK. The `reviewRequired=true` create/read
branch still needs E2E before the roadmap capability can be marked verified.
