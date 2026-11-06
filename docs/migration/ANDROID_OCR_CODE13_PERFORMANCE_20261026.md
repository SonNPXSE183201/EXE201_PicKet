# Receipt OCR performance — Android code 13

<!-- canonical-design -->
> Chuẩn thiết kế duy nhất: [PICKET-DESIGN.md](../../PICKET-DESIGN.md). Tài liệu này là checkpoint/nghiên cứu theo ngày; hiện trạng và backlog nằm tại [PROJECT_STATUS](../PROJECT_STATUS.md) và [BACKLOG](../BACKLOG.md).


26 October 2026. Code 12 is not accepted: the owner reports 60–120+ second
scans and upright/inverted failures. This update replaces its repeated full-image
rotation/OCR pipeline. Redmi acceptance remains pending until code 13 is tested.

## Implementation

- Local Expo Android module decodes a bounded source once (maximum 16M decoded
  pixels), normalizes EXIF, and owns one ML Kit recognizer per scan. Work runs off
  the UI thread. No intermediate PNG files or cloud upload.
- A thumbnail bounded to 960px finds text direction. Weighted agreement between
  text-line angles selects one cardinal correction. Thumbnail text never supplies
  financial fields. Read the selected full-resolution image once; refine at most
  one identified table band. Preserve the full-image total when merging details.
- A 20-second processing budget stops further stages. Individual SDK awaits are
  bounded to 15 seconds or remaining budget. SDK tasks cannot safely be forcibly
  cancelled: timed-out work retains its pixels until completion, rejects overlap,
  and releases the recognizer/bitmaps afterward. This is not a hard wall-clock
  cancellation guarantee for decode, SDK cleanup, or bridge scheduling.
- Owner changes and leaving capture abort subsequent work. Memoize receipt
  eligibility rather than reparsing on every form edit. Cache table column/nearest
  row matching outside nested product loops.
- Logs contain aggregate stage duration/pixel counts only, never receipt text,
  account IDs, local image paths or keys. Generated module output is ignored.

## Evidence and limits

- Synthetic parser fixture: 606 OCR lines, 150 table rows, existing 100-item cap.
  Five-run host median improved from 142.67ms to 6.04ms. This is parser time,
  not device OCR latency.
- Android 35 emulator, 2 cores/2GB: exact production Java image session, bundled
  ML Kit 16.0.1, same locally authorized 3000x4000 invoice and an actual 180-degree
  rotated fixture. A combined diagnostic avoids ADB round trips between stages;
  its table band matches the production TypeScript crop for this fixture.
  Upright: 15,506ms (direction 1,718 / full 8,859 / crop 4,662).
  Inverted: 15,083ms (direction 1,637 / full 8,384 / crop 4,787).
  Both select the correct correction, preserve the printed total, recover six
  paid product rows and close native resources. Private inputs/text stay ignored.
- Separate production TypeScript-to-Java RPC checks verify orchestration/merge,
  but ADB transport overhead can exhaust the 20-second budget and omit detail.
  Those are not phone/Expo latency measurements. Do not claim every run <20s.
- Earlier full-image direction experiment timed out on inverted inputs and is
  superseded by the thumbnail-only direction pass.
- Two zero-price/unreadable rows and the purchase date are still not reliably
  read from this sample. Do not fabricate them or mark full OCR acceptance done.

## Validation and release

RED checkpoints: c298c68e, f74c4709, e121780c, 21377d60. Focused tests cover
cardinal direction, one full read/one optional crop, abort, budget exhaustion and
cleanup. Final suite/build/release evidence is appended after verification.

Before acceptance, update Redmi through Internal testing, confirm code 13 opens,
then scan the same upright and 180-degree invoice. Check timing, responsiveness,
product rows, totals, date warning, retake handling, and repeated-scan memory.
Do not uninstall or clear app data. No production rollout is implied.

Verified before upload: 830/830 mobile tests; mobile lint exits successfully
(0 errors, 27 existing warnings); TypeScript check PASS; 3/3 native JVM tests;
signed ARM64 release AAB build PASS (2m28s). Generated Expo module registration
and final DEX include PicketReceiptOcr. Play-forbidden install/overlay permissions
are absent; manifest is 1.0.4 (13). AAB: 48,153,207 bytes, SHA-256
`a8d45a4fbc0bbb5120b16d5af98183d18c10adc7a2dde6362f9ba439ea257d91`.
Local ignored backup and manifest updated. Build uses the existing shared
workspace; unrelated owner edits remain uncommitted and preserved.

Repeat combined native runs: upright 14,776ms; inverted 15,445ms; both retain the
printed total and six paid rows, with resources closed. This repeats the native
fixture diagnostic, not Redmi/Expo acceptance. The diagnostic emulator was closed
and the temporary P: build mapping removed after checks.

Upload attempt 1 returned an expired Edit after a concurrent release-status
read. Serialize Play Edit operations; retry uses a fresh process/edit with no
parallel Play status calls. Verify the live track only after upload completes.

Retry deployment succeeded. A fresh live get_releases after upload confirms
Internal `completed`, versionCode 13, 100% on 26 October 2026 at 12:52 ICT.
Production remains empty; alpha remains draft code 6. Redmi was still code 12
before owner update. An assisted code-13 upright scan is requested; no physical
code-13 latency/accuracy or whole-product acceptance is claimed yet.

## Physical Redmi follow-up

The owner updated and completed an assisted upright scan. ADB confirms code 13.
At 13:17:47–13:17:50 ICT on 26 October 2026, the release Expo/native bridge logged
2,647ms total, budgetExceeded=false, one full read and one crop. Decode: 442ms;
full-resolution recognition: 1,184ms; crop recognition: 493ms; aggregate native
recognition: 1,843ms. This is an actual phone measurement, superseding the pending
latency status above for this one upright scan. It is not a latency percentile
or a directly measured comparison against code 12.

Post-scan total PSS: 398,635KiB, swap PSS: 140KiB. One memory sample cannot prove
leak-free repeated use. Accuracy confirmation and an assisted 180-degree scan
have been requested; neither is assumed from a successful timing log. No receipt
transaction was saved by this diagnostic.

The owner confirms the upright scan total is correct and product details are
present. The initial report that an inverted scan was complete had no matching
new native log; local screen inspection still showed an upright source image.
A new assisted test explicitly using an upside-down source preview was requested.
Do not count the initial report as verified inverted-device acceptance.
