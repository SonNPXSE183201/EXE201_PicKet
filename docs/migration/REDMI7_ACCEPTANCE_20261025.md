# Redmi 7 acceptance — 25 October 2026

<!-- canonical-design -->
> Chuẩn thiết kế duy nhất: [PICKET-DESIGN.md](../../PICKET-DESIGN.md). Tài liệu này là checkpoint/nghiên cứu theo ngày; hiện trạng và backlog nằm tại [PROJECT_STATUS](../PROJECT_STATUS.md) và [BACKLOG](../BACKLOG.md).


Device: Redmi 7, Android 10 / SDK 29. Installed Picket: `com.picket.mobile`,
1.0.4 / versionCode 7, installer `com.android.vending`. These results apply to
the installed artifact; later source commits require a new artifact and regression.

## Method

The owner operates the phone. ADB supplies selected UI hierarchy evidence.
scrcpy mirroring starts, but Codex's Windows automation helper is unavailable;
MIUI input injection is also unavailable. Passwords and biometric data are not
recorded. No purchase, financial write, cloud OCR submission or app-data removal
was performed in these checks.

## Observed results

| Case | Result | Evidence and limit |
| --- | --- | --- |
| Profile version footer | PASS | Visible, reachable `1.0.4 (7)` above bottom navigation; `redmi-profile-footer.xml/.png`. |
| Enable application lock | PASS | Owner authenticated with fingerprint; switch checked in `redmi-lock-enabled.xml`. Cancellation while initially enabling remains untested. |
| Return after background | PASS at tested interval | Owner waited at least 40 seconds; hierarchy shows lock heading/Unlock and no finance navigation, `redmi-locked-after-background.xml`. Source grace period is 30 seconds. The earlier five-second instruction was insufficient and is not a failure. |
| Cancel unlock | PASS | Owner cancelled native authentication; lock and zero finance navigation remain, `redmi-lock-cancel.xml`. |
| Retry unlock successfully | PASS | Owner reports fingerprint success and Wallet/Transactions open. Later hierarchy independently confirms unlocked navigation, with Budget then selected; `redmi-unlocked-transactions.xml`. |
| Camera preview | PASS for preview | Owner confirms clear preview and reachable shutter; hierarchy exposes capture/gallery/close, `redmi-camera-preview.xml`. No general OCR-quality claim. |
| Reject non-receipt image | PASS for tested image | Explicit rejection message; merchant/amount, attachment and final handoff disabled in `redmi-invalid-receipt-result.xml`. Supersedes the owner's initial impression that saving was available. No save was attempted. |
| Genuine paper purchase receipt | FAIL for attempted image | Owner reported rejection. Hierarchy confirms invalid-receipt message and disabled fields, `redmi-valid-receipt-failure.xml`. Local inspection with owner consent shows a multi-column purchase document; the original native OCR text was not captured, so the exact cause is unconfirmed. |

Evidence files are local under `.artifacts/` and are not committed.

## Open findings and next checks

- Play-installed code 7 displays the APK self-update section; review release-variant
  provenance before publishing another Play artifact.
- Billing cards inspected on code 7 lacked a visible price while purchase buttons
  were enabled. Source now checks a priced offer; installed-artifact verification
  of that fix is pending. No purchase button was pressed.
- Genuine-receipt OCR accuracy, editing/retry, offline capture, native backup,
  cold-start lock, update continuity and actual sandbox purchase lifecycle remain
  open. Current step: owner captures a clear genuine receipt using local OCR only,
  compares total/date, and stops before saving.

This session does not establish full release acceptance.

## OCR source follow-up

RED `bc0a0a8a` reproduces a synthetic split-column total that the parser cannot
find when ML Kit returns columns in separate blocks. GREEN `cda79803` carries
horizontal frames from ML Kit, matches numeric text to the right with at least
50% vertical overlap, and preserves an unambiguous total row in saved text so
draft re-parsing retains the amount. Tests cover other rows, invalid/left-hand
coordinates, ambiguous amounts and text round trips, using fictional data only.
Full mobile: 779/779 passed; typecheck, lint and Android JS export passed
(`.artifacts/ocr-spatial-export.log`). This is a demonstrated
parser defect and source fix, not proof that this particular real photo now
passes: re-test the photo on an artifact containing the fix.

The owner retried with a clearer photo on code 7 and reports that the amount is
correct, but merchant/date are wrong and long receipts lose product lines. This
is partial recognition, not OCR acceptance. RED `1ed956c4` reproduces written
Vietnamese date parsing, merchant heading selection and split-column item loss
with synthetic fixtures. GREEN `964f43d6` recognizes `Ngày … tháng … năm …`,
excludes purchase-document headings/websites from merchant candidates and joins
table rows only when name/quantity/unit-price/total headers can be identified.
Warranty columns are not treated as prices. Existing arithmetic validation rejects
inconsistent line totals. A 30-product fixture survives saved-text re-parsing.
Full mobile: 785/785 passed; lint/typecheck passed. Wrapped/missing OCR text and
unrecognized table headers are not reconstructed by guessing; the original real
photo and longer receipts still require native regression on the new build.

## Purchase date and calendar rule

The owner explicitly requested automatic matching to the purchase day printed on
the receipt, with manual correction only when that day is unreadable. RED
`6ff540e6`, GREEN `d15daaad` therefore change the earlier calendar-selection-wins
rule: a valid OCR calendar day wins; otherwise the selected day, or today, remains
the fallback. The capture screen identifies a missing OCR date as a fallback
requiring review. Recognized days are stored at local noon to preserve their
calendar date across timezones. Existing receipt/generic transaction handoff uses
that purchasedAt and completion routes to its month. Tests cover differing months,
invalid dates and America/Los_Angeles; full mobile 786/786, hook lint/typecheck
passed. Existing saved receipts are not rewritten. Native re-test on a build with
these commits remains required.

## Code 8 regression, 26 October 2026

ADB confirms the owner updated Redmi to version 1.0.4 / code 8. The owner reports
“Không nhận diện được hóa đơn hợp lệ” for a VAT table invoice. The native Latin
ML Kit 16.0.1 diagnostic on the selected photo produced 109 lines. The unchanged
parser found no payable total or valid date, so the eligibility guard rejected it.
This is a confirmed code 8 failure, not an outdated-installation explanation.

A separate local Android diagnostic was built under the ignored
`.artifacts/ocr-code8-diagnostic/` directory. MIUI rejected installation on Redmi;
it ran instead on a local Android 35 emulator, using the pulled photo and the
same bundled OCR library. No real receipt photo or recognized personal text was
committed or sent to a cloud OCR service. The emulator was stopped afterward.

RED `03793c10`, GREEN `35c6d6a6` reproduce and fix the skewed VAT summary using
fictional test data. The fix requires explicit goods/tax/payable labels and a
single total column with exactly three numeric cells; goods plus tax must match
the payable amount. Inconsistent or ambiguous summaries remain unaccepted.
Canonical payable text survives draft re-parsing. The local photo result now
has a payable total, passes eligibility and retains the same total on reparse.
Validation: 791/791 mobile tests; commit-hook lint and typecheck passed.

The same photo still has no valid OCR date and incomplete product extraction.
Neither has been accepted. Build 9 is a targeted rejection fix; it does not
establish full OCR acceptance. Device regression must check the review flow,
missing-date warning and total before saving anything.
